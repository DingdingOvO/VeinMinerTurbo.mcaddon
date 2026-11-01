/**
 * config/index.ts — 配置层统一出口
 *
 * 对外只暴露「查询 / 读写」能力，具体数据表放在 blocks/ 与 admin/ 里。
 */

export {
    isBuiltinMineable, isLogType, isForbidden, isBuiltinForbidden,
    getLeafIdSet, getMineMode,
} from './blocks';
export type { MineMode } from './blocks';
export type { CubeSize } from './PlayerConfig';

export { FORBIDDEN_IDS } from './blocks/Forbidden';

export {
    DEFAULT_MAX_VEIN, HARD_MAX_VEIN,
    SCAN_TIMEOUT_MS, LEAF_SCAN_RADIUS, LEAF_MAX_COUNT,
    DEFAULT_CUBE_SIZE, CUBE_SIZE_MIN, CUBE_SIZE_MAX,
    BLOCKS_PER_WEAR,
} from './Constants';

export {
    getPlayerToggle, setPlayerToggle,
    getPlayerMaxVein, setPlayerMaxVein,
    getPlayerAutoLeaves, setPlayerAutoLeaves,
    getPlayerCollectDrops, setPlayerCollectDrops,
    getPlayerMaxDepth, setPlayerMaxDepth,
    getPlayerDurabilityGuard, setPlayerDurabilityGuard,
    getPlayerOutline, setPlayerOutline,
    getPlayerCubeSize, setPlayerCubeSize,
} from './PlayerConfig';
