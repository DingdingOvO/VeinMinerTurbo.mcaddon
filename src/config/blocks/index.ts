/**
 * blocks/index.ts — 方块列表汇总与查询
 */

import { ORE_IDS } from './Ores';
import { LOG_IDS } from './Logs';
import { LEAF_IDS } from './Leaves';
import { BLACKLIST_IDS } from './Blacklist';

// 预构建 Set，O(1) 查询
const WHITELIST_SET = new Set<string>([...ORE_IDS, ...LOG_IDS]);
const LOG_SET = new Set<string>(LOG_IDS);
const LEAF_SET = new Set<string>(LEAF_IDS);
const BLACKLIST_SET = new Set<string>(BLACKLIST_IDS);

/** 是否在白名单内（矿石/原木） */
export function isWhitelisted(blockId: string): boolean {
    return WHITELIST_SET.has(blockId);
}

/** 是否在黑名单内 */
export function isBlacklisted(blockId: string): boolean {
    return BLACKLIST_SET.has(blockId);
}

/** 是否是原木（决定使用26面BFS + 可选树叶扫描） */
export function isLogType(blockId: string): boolean {
    return LOG_SET.has(blockId);
}

/** 获取树叶类型集合 */
export function getLeafIdSet(): ReadonlySet<string> {
    return LEAF_SET;
}