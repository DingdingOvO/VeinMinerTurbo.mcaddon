/**
 * VeinMiner.ts — 核心事件监听与调度
 *
 * 监听 beforeEvents.playerBreakBlock
 * 检查条件后分发给 Scanner → TreeDetector → BreakExecutor
 */

import { world, system, Player, PlayerBreakBlockBeforeEvent, Vector3 } from '@minecraft/server';
import { bfsScan, Pos } from './Scanner';
import { scanLeaves } from './TreeDetector';
import { executeBreak } from './BreakExecutor';
import {
    isWhitelisted, isBlacklisted, isLogType, getLeafIdSet,
    getPlayerToggle, getPlayerMaxVein, getPlayerAutoLeaves, getPlayerCollectDrops,
    getPlayerMaxDepth, getPlayerDurabilityGuard,
    SCAN_TIMEOUT_MS,
} from '../config';
import { getWhitelist } from '../ui/WhiteListManager';
import { getHeldTool } from '../utils/ToolHelper';
import { tf1, rawtext, TAG } from '../utils/LangHelper';

// ═══════════════════════════════════════
//  注册
// ═══════════════════════════════════════

export function registerVeinMiner(): void {
    world.beforeEvents.playerBreakBlock.subscribe(onBreak);
}

// ═══════════════════════════════════════
//  方块破坏事件
// ═══════════════════════════════════════

function onBreak(event: PlayerBreakBlockBeforeEvent): void {
    try {
        onBreakInner(event);
    } catch (error) {
        console.warn(`[VMT] block event error: ${error}`);
    }
}

/** 判断方块是否允许连锁：内置表 + 玩家自定义白名单 */
function isAllowed(player: Player, typeId: string): boolean {
    if (isBlacklisted(typeId)) return false;
    if (isWhitelisted(typeId)) return true;
    return getWhitelist(player).includes(typeId);
}

function onBreakInner(event: PlayerBreakBlockBeforeEvent): void {
    const player = event.player;

    // 必须潜行
    if (!player.isSneaking) return;

    const block = event.block;
    const typeId = block.typeId;

    // 白名单 / 黑名单检查（含玩家自定义白名单）
    if (!isAllowed(player, typeId)) return;

    // 玩家开关
    if (!getPlayerToggle(player)) return;

    const startLoc: Vector3 = {
        x: Math.floor(block.location.x),
        y: Math.floor(block.location.y),
        z: Math.floor(block.location.z),
    };
    const dimension = block.dimension;
    const maxVein = getPlayerMaxVein(player);
    const maxDepth = getPlayerMaxDepth(player);
    const isLog = isLogType(typeId);
    const autoLeaves = isLog && getPlayerAutoLeaves(player);

    // BFS 扫描（包含起点）
    const result = bfsScan(dimension, startLoc, typeId, maxVein, SCAN_TIMEOUT_MS, isLog, maxDepth);

    if (result.timedOut) {
        system.run(() => {
            player.onScreenDisplay.setActionBar([
                rawtext(TAG + ' §e'),
                tf1('veinminer.tip.scan_timeout_full', String(result.blocks.length)),
            ]);
        });
        return;
    }

    // 起点由玩家正常破坏，只处理剩余
    let extraBlocks: Pos[] = result.blocks.length > 1 ? result.blocks.slice(1) : [];

    // 耐久保护：剩余耐久不足时截断，避免连锁把工具一次打爆
    if (extraBlocks.length > 0 && getPlayerDurabilityGuard(player)) {
        extraBlocks = limitByDurability(player, extraBlocks);
    }

    // 自动破叶
    let leafBlocks: Pos[] = [];
    if (autoLeaves && extraBlocks.length > 0) {
        leafBlocks = scanLeaves(dimension, [startLoc, ...extraBlocks], getLeafIdSet());
    }

    if (extraBlocks.length === 0 && leafBlocks.length === 0) return;

    // 下一 tick 执行破坏（起点已被正常破坏）
    const collectDrops = getPlayerCollectDrops(player);
    system.run(() => {
        executeBreak(player, dimension, extraBlocks, leafBlocks, startLoc, collectDrops);
    });
}

/**
 * 按工具剩余耐久截断连锁列表
 * 每个方块消耗 1 点耐久，留 1 点保底（防止工具直接碎掉）
 */
function limitByDurability(
    player: Player,
    blocks: Pos[],
): Pos[] {
    const tool = getHeldTool(player);
    if (!tool.durability) return blocks; // 无耐久条（创造 / 空手）→ 不限制

    const remain = tool.durability.maxDurability - tool.durability.damage;
    const usable = Math.max(0, remain - 1);
    if (blocks.length <= usable) return blocks;

    if (usable === 0) {
        system.run(() => {
            player.onScreenDisplay.setActionBar([
                rawtext(TAG + ' §c'),
                { translate: 'veinminer.tip.tool_low' },
            ]);
        });
        return [];
    }
    return blocks.slice(0, usable);
}
