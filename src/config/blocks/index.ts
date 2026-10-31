/**
 * blocks/index.ts — 方块列表汇总与查询
 */

import { ORE_IDS } from './Ores';
import { LOG_IDS } from './Logs';
import { LEAF_IDS } from './Leaves';
import { BLACKLIST_IDS, FORBIDDEN_IDS } from './Blacklist';
import { isNoWideBlock, isLockedBlock } from '../GlobalBlacklist';

// 预构建 Set，O(1) 查询
const WHITELIST_SET = new Set<string>([...ORE_IDS, ...LOG_IDS]);
const LOG_SET = new Set<string>(LOG_IDS);
const LEAF_SET = new Set<string>(LEAF_IDS);
const BLACKLIST_SET = new Set<string>(BLACKLIST_IDS);
const FORBIDDEN_SET = new Set<string>(FORBIDDEN_IDS);

/** 连锁模式 */
export type MineMode =
    /** 整条矿脉 / 整棵树：BFS 连通扫描，上限 maxVein */
    | 'vein'
    /** 普通方块：只挖一个立方体范围（默认 3×3×3） */
    | 'cube'
    /** 不给连锁 */
    | 'none';

/** 是否在默认白名单内（矿石/原木） */
export function isWhitelisted(blockId: string): boolean {
    return WHITELIST_SET.has(blockId);
}

/** 是否在默认黑名单内（草/土/石这类大片地形） */
export function isBlacklisted(blockId: string): boolean {
    return BLACKLIST_SET.has(blockId);
}

/** 是否绝对禁止连锁（内置的基岩/命令块 + OP 锁定的方块） */
export function isForbidden(blockId: string): boolean {
    return FORBIDDEN_SET.has(blockId) || isLockedBlock(blockId);
}

/** 是否属于内置锁定名单（这部分命令删不掉） */
export function isBuiltinForbidden(blockId: string): boolean {
    return FORBIDDEN_SET.has(blockId);
}

/** 是否是原木（决定使用26面BFS + 可选树叶扫描） */
export function isLogType(blockId: string): boolean {
    return LOG_SET.has(blockId);
}

/** 获取树叶类型集合 */
export function getLeafIdSet(): ReadonlySet<string> {
    return LEAF_SET;
}

/**
 * 判定某个方块的连锁方式。
 *
 *   基岩/命令块      → none（永久拒绝）
 *   矿石 / 原木      → vein（BFS 连通，默认上限 64）
 *   玩家白名单里的   → cube（立方体范围，默认 3×3×3，可调到 7×7×7）
 *   其它             → none（草土石这些默认就不给，必须先加白名单）
 */
export function getMineMode(blockId: string, personal: readonly string[]): MineMode {
    // 1. 锁定：内置的 + OP 加的，任何情况都不连锁
    if (isForbidden(blockId)) return 'none';

    const own = personal.includes(blockId);

    // 2. 管理员设的「禁止大范围」：默认不给，个人白名单后只能小范围
    if (isNoWideBlock(blockId)) return own ? 'cube' : 'none';

    // 3. 矿石 / 原木：整条矿脉
    if (WHITELIST_SET.has(blockId)) return 'vein';

    // 4. 普通方块：个人白名单后按立方体挖
    if (own) return 'cube';

    return 'none';
}
