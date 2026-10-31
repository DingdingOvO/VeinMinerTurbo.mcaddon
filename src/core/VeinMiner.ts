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
 *
 * 三种模式：
 *   vein  矿石 / 原木 —— BFS 连通，默认上限 64
 *   cube  玩家白名单里的普通方块 —— 立方体范围，默认 3×3×3（可调到 7×7×7）
 *   none  基岩 / 默认黑名单 / 没加白名单的方块
 */

import { world, system, Player, Dimension, GameMode, PlayerBreakBlockBeforeEvent, Vector3 } from '@minecraft/server';
import { bfsScan, Pos } from './Scanner';
import { scanLeaves } from './TreeDetector';
import { scanCube } from './Excavate';
import { executeBreak } from './BreakExecutor';
import {
    getMineMode, isLogType, getLeafIdSet,
    getPlayerToggle, getPlayerMaxVein, getPlayerAutoLeaves, getPlayerCollectDrops,
    getPlayerMaxDepth, getPlayerDurabilityGuard, getPlayerCubeSize,
    SCAN_TIMEOUT_MS,
} from '../config';
import { getWhitelist } from '../ui/WhiteListManager';
import { isPlayerBanned } from '../config/PlayerBlacklist';
import { getHeldTool } from '../utils/ToolHelper';
import { t, tf1, rawtext, TAG } from '../utils/LangHelper';

// 被限制玩家的提示节流（玩家 id → 上次提示 tick）
const banNoticeAt = new Map<string, number>();

function noticeBanned(player: Player): void {
    const now = system.currentTick;
    const last = banNoticeAt.get(player.id) ?? -99999;
    if (now - last < 100) return; // 5 秒最多一次，别刷屏
    banNoticeAt.set(player.id, now);
    try {
        player.onScreenDisplay.setActionBar(`${TAG} §c你已被禁止使用连锁采集`);
    } catch {
        // 忽略
    }
}

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

        // 玩家黑名单：整个模组对这个人不生效
        if (isPlayerBanned(player)) {
            noticeBanned(player);
            return;
        }

        // 创造模式：方块是瞬间破坏且不掉落，连锁没有意义，直接跳过
        try {
            if (player.getGameMode() === GameMode.Creative) return;
        } catch {
            // 读取失败时按生存处理
        }

        // 玩家开关
        if (!getPlayerToggle(player)) return;

        // 模式判定：基岩/默认黑名单/未加白名单 → none
        const personal = getWhitelist(player);
        const mode = getMineMode(typeId, personal);
        if (mode === 'none') return;

        const maxVein = getPlayerMaxVein(player);

        let blocks: Pos[];
        let autoLeaves = false;

        if (mode === 'vein') {
            const isLog = isLogType(typeId);
            autoLeaves = isLog && getPlayerAutoLeaves(player);

            // BFS 扫描（包含起点）
            const result = bfsScan(
                dimension, startLoc, typeId, maxVein,
                SCAN_TIMEOUT_MS, isLog, getPlayerMaxDepth(player),
            );

            if (result.timedOut) {
                player.onScreenDisplay.setActionBar([
                    rawtext(TAG + ' §e'),
                    tf1('veinminer.tip.scan_timeout_full', String(result.blocks.length), player),
                ]);
                return;
            }
            blocks = result.blocks;
        } else {
            // cube：普通方块白名单，只挖立方体范围内的同类
            blocks = scanCube(dimension, startLoc, typeId, getPlayerCubeSize(player), maxVein);
        }

        // 起点由玩家正常破坏，只处理剩余
        let extraBlocks: Pos[] = blocks.length > 1 ? blocks.slice(1) : [];

        // 耐久保护：剩余耐久不足时截断，避免连锁把工具一次打爆
        if (extraBlocks.length > 0 && getPlayerDurabilityGuard(player)) {
            extraBlocks = limitByDurability(player, extraBlocks);
        }

        // 自动破叶（只有整棵树才做）
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
            t('veinminer.tip.tool_low', player),
        ]);
        return [];
    }
    return blocks.slice(0, usable);
}
