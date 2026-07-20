/**
 * VeinMiner.ts — 核心事件监听与调度
 *
 * 监听 beforeEvents.playerBreakBlock
 * 检查条件后分发给 Scanner → TreeDetector → BreakExecutor
 */

import { world, system, PlayerBreakBlockBeforeEvent, Vector3 } from '@minecraft/server';
import { bfsScan } from './Scanner';
import { scanLeaves } from './TreeDetector';
import { executeBreak } from './BreakExecutor';
import {
    isWhitelisted, isBlacklisted, isLogType, getLeafIdSet,
    getPlayerToggle, getPlayerMaxVein, getPlayerAutoLeaves, getPlayerCollectDrops,
    SCAN_TIMEOUT_MS,
} from '../config';

const TAG = '§8[VM]§r';

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
        console.warn(`[VM] 方块破坏事件处理失败: ${error}`);
    }
}

function onBreakInner(event: PlayerBreakBlockBeforeEvent): void {
    const player = event.player;

    // 必须潜行
    if (!player.isSneaking) return;

    const block = event.block;
    const typeId = block.typeId;

    // 白名单/黑名单检查
    if (!isWhitelisted(typeId) || isBlacklisted(typeId)) return;

    // 玩家开关
    if (!getPlayerToggle(player)) return;

    const startLoc: Vector3 = {
        x: Math.floor(block.location.x),
        y: Math.floor(block.location.y),
        z: Math.floor(block.location.z),
    };
    const dimension = block.dimension;
    const maxVein = getPlayerMaxVein(player);
    const isLog = isLogType(typeId);
    const autoLeaves = isLog && getPlayerAutoLeaves(player);

    // BFS 扫描（包含起点）
    const result = bfsScan(dimension, startLoc, typeId, maxVein, SCAN_TIMEOUT_MS, isLog);

    if (result.timedOut) {
        player.onScreenDisplay.setActionBar(`${TAG} §e扫描超时`);
        return;
    }

    // 起点由玩家正常破坏，只处理剩余
    const extraBlocks = result.blocks.length > 1 ? result.blocks.slice(1) : [];

    // 自动破叶
    let leafBlocks: Array<{ x: number; y: number; z: number }> = [];
    if (autoLeaves) {
        leafBlocks = scanLeaves(dimension, result.blocks, getLeafIdSet());
    }

    if (extraBlocks.length === 0 && leafBlocks.length === 0) return;

    // 下一 tick 执行破坏（起点已被正常破坏）
    const collectDrops = getPlayerCollectDrops(player);
    system.run(() => {
        executeBreak(player, dimension, extraBlocks, leafBlocks, startLoc, collectDrops);
    });
}