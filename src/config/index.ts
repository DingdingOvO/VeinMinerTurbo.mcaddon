/**
 * config/index.ts — 配置模块统一导出
 */
export {
    isWhitelisted, isBlacklisted, isLogType, isForbidden, isBuiltinForbidden,
    getLeafIdSet, getMineMode,
} from './blocks';
export type { MineMode } from './blocks';
export type { CubeSize } from './PlayerConfig';
export { ORE_IDS } from './blocks/Ores';
export { LOG_IDS } from './blocks/Logs';
export { LEAF_IDS } from './blocks/Leaves';
export { BLACKLIST_IDS, FORBIDDEN_IDS } from './blocks/Blacklist';
export {
    DEFAULT_MAX_VEIN, HARD_MAX_VEIN, SLIDER_MIN, SLIDER_MAX,
    SCAN_TIMEOUT_MS, LEAF_SCAN_RADIUS, LEAF_MAX_COUNT,
    DEFAULT_CUBE_SIZE, CUBE_SIZE_MIN, CUBE_SIZE_MAX,
} from './Constants';
export {
    getPlayerToggle, setPlayerToggle,
    getPlayerMaxVein, setPlayerMaxVein,
    getPlayerAutoLeaves, setPlayerAutoLeaves,
    getPlayerCollectDrops, setPlayerCollectDrops,
    getPlayerMaxDepth, setPlayerMaxDepth,
    getPlayerDurabilityGuard, setPlayerDurabilityGuard,
    getPlayerOutline, setPlayerOutline,
    getPlayerExcavate, setPlayerExcavate,
    getPlayerCubeSize, setPlayerCubeSize,
} from './PlayerConfig';
