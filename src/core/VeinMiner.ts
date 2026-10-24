/**
 * VeinMiner.ts — 核心事件监听与调度
 *
 * 关键设计：beforeEvents.playerBreakBlock 处于「早执行模式」，回调里能做的事很有限，
 * 而且在这里做 BFS（几百次 getBlock）会直接卡主线程。
 *
 * 所以回调里只做两件必须当场做的事：
 *   1. 读 player.isSneaking（下一 tick 可能就松开潜行了）
 *   2. 记下方块坐标 / 维度 / typeId
 * 其余扫描、读配置、破坏全部 system.run 推迟到事件结束后的 tick。
 *
 * 起点方块由玩家自己破坏，下一 tick 已是空气也没关系 —— bfsScan 的起点不校验类型。
 */

import { world, system, Player, Dimension, PlayerBreakBlockBeforeEvent, Vector3 } from '@minecraft/server';
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
//  方块破坏事件（只做轻量捕获）
// ═══════════════════════════════════════

function onBreak(event: PlayerBreakBlockBeforeEvent): void {
    try {
        const player = event.player;

        // 必须潜行（只有这里能拿到准确值）
        if (!player.isSneaking) return;

        const block = event.block;
        const typeId = block.typeId;
        const dimension = block.dimension;
        const startLoc: Vector3 = {
            x: Math.floor(block.location.x),
            y: Math.floor(block.location.y),
            z: Math.floor(block.location.z),
        };

        // 其余全部推迟
        system.run(() => handleBreak(player, dimension, startLoc, typeId));
    } catch (error) {
        console.warn(`[VMT] block event error: ${error}`);
    }
}

// ═══════════════════════════════════════
//  真正的处理（事件之外）
// ═══════════════════════════════════════

function handleBreak(
    player: Player,
    dimension: Dimension,
    startLoc: Vector3,
    typeId: string,
): void {
    try {
        // 玩家可能已经退出
        if (!player.isValid) return;

        // 白名单 / 黑名单（含玩家自定义白名单）
        if (isBlacklisted(typeId)) return;
        if (!isWhitelisted(typeId) && !getWhitelist(player).includes(typeId)) return;

        // 玩家开关
        if (!getPlayerToggle(player)) return;

        const maxVein = getPlayerMaxVein(player);
        const maxDepth = getPlayerMaxDepth(player);
        const isLog = isLogType(typeId);
        const autoLeaves = isLog && getPlayerAutoLeaves(player);

        // BFS 扫描（包含起点）
        const result = bfsScan(dimension, startLoc, typeId, maxVein, SCAN_TIMEOUT_MS, isLog, maxDepth);

        if (result.timedOut) {
            player.onScreenDisplay.setActionBar([
                rawtext(TAG + ' §e'),
                tf1('veinminer.tip.scan_timeout_full', String(result.blocks.length)),
            ]);
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

        const collectDrops = getPlayerCollectDrops(player);
        executeBreak(player, dimension, extraBlocks, leafBlocks, startLoc, collectDrops);
    } catch (error) {
        console.warn(`[VMT] handleBreak error: ${error}`);
    }
}

/**
 * 按工具剩余耐久截断连锁列表
 * 每个方块消耗 1 点耐久，留 1 点保底（防止工具直接碎掉）
 */
function limitByDurability(player: Player, blocks: Pos[]): Pos[] {
    const tool = getHeldTool(player);
    if (!tool.durability) return blocks; // 无耐久条（创造 / 空手）→ 不限制

    const remain = tool.durability.maxDurability - tool.durability.damage;
    const usable = Math.max(0, remain - 1);
    if (blocks.length <= usable) return blocks;

    if (usable === 0) {
        player.onScreenDisplay.setActionBar([
            rawtext(TAG + ' §c'),
            { translate: 'veinminer.tip.tool_low' },
        ]);
        return [];
    }
    return blocks.slice(0, usable);
}
