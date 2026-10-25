/**
 * BreakExecutor.ts — 分 tick 队列破坏执行
 *
 * 设计要点：
 *   - 每个玩家独立队列（Map<playerId, state>），多人互不影响
 *   - 同一玩家挖新矿时直接替换队列，旧任务立即作废
 *   - 每 tick 执行 BATCH_SIZE 个方块，不卡服
 *   - 全部走 Script API（block.setType + spawnItem），不依赖 runCommand
 *     → 普通玩家（非 OP）也能正常连锁，这是旧版最大的问题
 *   - 掉落物集中：直接持有 Entity 引用，结束时遍历传送，零搜索开销
 */

import { world, system, Player, Dimension, Vector3, Entity } from '@minecraft/server';
import { Pos, sortByDistance } from './Scanner';
import { getDrops, getExperience, spawnDrops } from '../utils/EnchantmentHelper';
import { tf1, rawtext, TAG } from '../utils/LangHelper';

const BATCH_SIZE = 20;

// ═══════════════════════════════════════
//  类型
// ═══════════════════════════════════════

interface QueueState {
    blocks: Pos[];
    running: boolean;
    broken: number;
    origin: Vector3;
    collectDrops: boolean;
    dimension: Dimension;
    /** 本次连锁产生的掉落物实体引用 */
    droppedItems: Entity[];
}

/** playerId → 该玩家的破坏队列 */
const playerQueues = new Map<string, QueueState>();

// ═══════════════════════════════════════
//  对外接口
// ═══════════════════════════════════════

/**
 * 提交破坏任务
 * 如果该玩家已有未完成的任务，直接替换（旧任务作废）
 */
export function executeBreak(
    player: Player,
    dimension: Dimension,
    blocks: Pos[],
    leafBlocks: Pos[],
    origin: Vector3,
    collectDrops: boolean,
): void {
    const pid = player.id;
    const sorted = sortByDistance(blocks, origin);
    const sortedLeaves = sortByDistance(leafBlocks, origin);
    const allPos = [...sorted, ...sortedLeaves];

    const existing = playerQueues.get(pid);
    if (existing && existing.running) {
        // 复用正在跑的循环：换掉待处理列表即可
        existing.blocks = allPos;
        existing.origin = origin;
        existing.collectDrops = collectDrops;
        existing.dimension = dimension;
        return;
    }

    playerQueues.set(pid, {
        blocks: allPos,
        running: true,
        broken: 0,
        origin,
        collectDrops,
        dimension,
        droppedItems: [],
    });

    processTick(pid);
}

// ═══════════════════════════════════════
//  内部：每 tick 处理一批
// ═══════════════════════════════════════

function processTick(pid: string): void {
    const state = playerQueues.get(pid);

    if (!state) return;
    if (state.blocks.length === 0) {
        finishPlayer(pid, state);
        return;
    }

    // 重新查找玩家（防止引用失效）
    const player = world.getPlayers().find(p => p.id === pid);
    if (!player) {
        playerQueues.delete(pid);
        return;
    }

    const batch = state.blocks.splice(0, BATCH_SIZE);

    for (const pos of batch) {
        try {
            const block = state.dimension.getBlock(pos);
            // 方块已被其他方式移除（水冲、爆炸、别人挖掉）
            if (!block) continue;

            const blockId = block.typeId;
            if (blockId === 'minecraft:air') continue;

            const drops = getDrops(blockId, player);
            const exp = getExperience(blockId);

            // 先清空方块，再生成掉落物，避免掉落物被方块顶出
            block.setType('minecraft:air');

            const entities = spawnDrops(state.dimension, pos, drops, exp);
            if (state.collectDrops && entities.length > 0) {
                state.droppedItems.push(...entities);
            }

            state.broken++;
        } catch (error) {
            // 区块卸载 / 维度边界 / 工具问题：跳过该方块，不中断整个任务
            console.warn(`[VMT] block op error (${pos.x},${pos.y},${pos.z}): ${error}`);
        }
    }

    if (state.blocks.length > 0) {
        system.runTimeout(() => processTick(pid), 1);
    } else {
        finishPlayer(pid, state);
    }
}

// ═══════════════════════════════════════
//  内部：玩家任务完成/中断
// ═══════════════════════════════════════

function finishPlayer(pid: string, state: QueueState | undefined): void {
    playerQueues.delete(pid);

    if (!state || state.broken <= 0) return;

    try {
        const player = world.getPlayers().find(p => p.id === pid);
        if (!player) return;

        player.onScreenDisplay.setActionBar([
            rawtext(TAG + ' §a'),
            tf1('veinminer.tip.broken', String(state.broken), player),
        ]);

        if (state.collectDrops && state.droppedItems.length > 0) {
            collectDropsToOrigin(state.origin, state.droppedItems);
        }
    } catch (error) {
        console.warn(`[VMT] finish callback error: ${error}`);
    }
}

// ═══════════════════════════════════════
//  掉落物集中 — 直接用实体引用，零搜索
// ═══════════════════════════════════════

function collectDropsToOrigin(target: Vector3, items: Entity[]): void {
    system.run(() => {
        for (const item of items) {
            try {
                if (item.isValid) {
                    item.teleport({ x: target.x + 0.5, y: target.y + 0.5, z: target.z + 0.5 }, {
                        keepVelocity: false,
                    });
                }
            } catch (error) {
                console.warn(`[VMT] drop teleport error: ${error}`);
            }
        }
    });
}
