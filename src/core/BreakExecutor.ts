/**
 * BreakExecutor.ts — 分 tick 队列破坏执行
 *
 * 设计要点：
 *   - 每个玩家独立队列（Map<playerId, state>），多人互不影响
 *   - 同一玩家挖新矿时直接替换队列，旧任务立即作废
 *   - 每 tick 执行 BATCH_SIZE 个方块，不卡服
 *   - 矿石：手动计算附魔掉落（时运/精准采集），setblock air 清空方块
 *   - 非矿石（原木/树叶等）：setblock air destroy 走原版掉落
 *   - 掉落物集中：直接持有 Entity 引用，结束时遍历传送，零搜索开销
 *   - 耐久由游戏引擎自动处理
 *   - 每 tick 重新查找玩家，防止引用失效
 */

import { world, system, Player, Dimension, Vector3, Entity } from '@minecraft/server';
import { Pos, sortByDistance } from './Scanner';
import { getDrops, getExperience, spawnDrops } from '../utils/EnchantmentHelper';

const TAG = '§8[VM]§r';
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
    _dimension: Dimension,
    blocks: Pos[],
    leafBlocks: Pos[],
    origin: Vector3,
    collectDrops: boolean,
): void {
    const pid = player.id;
    const sorted = sortByDistance(blocks, origin);
    const sortedLeaves = sortByDistance(leafBlocks, origin);
    const allPos = [...sorted, ...sortedLeaves];

    // 新建或替换该玩家的队列
    playerQueues.set(pid, {
        blocks: allPos,
        running: false,
        broken: 0,
        origin,
        collectDrops,
        droppedItems: [],
    });

    // 如果该玩家没有在跑的循环，启动一个
    const state = playerQueues.get(pid)!;
    if (!state.running) {
        state.running = true;
        processTick(pid);
    }
}

// ═══════════════════════════════════════
//  内部：每 tick 处理一批
// ═══════════════════════════════════════

function processTick(pid: string): void {
    const state = playerQueues.get(pid);

    // 队列被清空（玩家下线或被替换后清理）
    if (!state || state.blocks.length === 0) {
        finishPlayer(pid, state);
        return;
    }

    // 重新查找玩家（防止引用失效）
    const player = world.getPlayers().find(p => p.id === pid);
    if (!player) {
        playerQueues.delete(pid);
        return;
    }

    const dimension = player.dimension;

    // 取出一批
    const batch = state.blocks.splice(0, BATCH_SIZE);

    for (const pos of batch) {
        try {
            // 尝试获取方块类型
            const block = dimension.getBlock(pos);
            if (!block) continue;

            const blockId = block.typeId;

            // 尝试精确掉落（矿石受时运/精准采集影响）
            const drops = getDrops(blockId, player);

            if (drops) {
                // 手动生成掉落物，收集实体引用
                const exp = getExperience(blockId);
                const entities = spawnDrops(dimension, block.location, drops, exp);
                if (state.collectDrops && entities.length > 0) {
                    state.droppedItems.push(...entities);
                }
                // 清空方块（不带 destroy，不掉原版掉落）
                player.runCommand(`setblock ${pos.x} ${pos.y} ${pos.z} air`);
            } else {
                // 非矿石（原木/树叶等）：走原版掉落
                player.runCommand(`setblock ${pos.x} ${pos.y} ${pos.z} air destroy`);
            }

            state.broken++;
        } catch (error) {
            console.warn(`[VM] 方块操作失败 (${pos.x},${pos.y},${pos.z}): ${error}`);
            // 工具损坏 / 方块已消失 / 玩家下线 → 停止
            state.blocks = [];
            break;
        }
    }

    // 还有剩余 → 下一 tick 继续
    if (state.blocks.length > 0) {
        system.run(() => processTick(pid));
    } else {
        finishPlayer(pid, state);
    }
}

// ═══════════════════════════════════════
//  内部：玩家任务完成/中断
// ═══════════════════════════════════════

function finishPlayer(pid: string, state: QueueState | undefined): void {
    playerQueues.delete(pid);

    if (state && state.broken > 0) {
        try {
            const player = world.getPlayers().find(p => p.id === pid);
            if (player) {
                player.onScreenDisplay.setActionBar(`${TAG} §a+${state.broken} 方块`);

                if (state.collectDrops && state.droppedItems.length > 0) {
                    collectDropsToOrigin(state.origin, state.droppedItems);
                }
            }
        } catch (error) {
            console.warn(`[VM] 任务完成回调失败: ${error}`);
        }
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
                    item.teleport(target, { keepVelocity: false });
                }
            } catch (error) {
                console.warn(`[VM] 掉落物传送失败: ${error}`);
            }
        }
    });
}