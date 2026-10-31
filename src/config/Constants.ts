/**
 * Constants.ts — 默认常量
 */

/** 默认最大连锁数 */
export const DEFAULT_MAX_VEIN = 64;

/** 单次连锁的服务器硬上限（玩家设置不能超过它） */
export const HARD_MAX_VEIN = 256;

/** 设置表单 slider 范围 */
export const SLIDER_MIN = 1;
export const SLIDER_MAX = HARD_MAX_VEIN;

/** BFS 扫描超时（ms），防止卡服 */
export const SCAN_TIMEOUT_MS = 100;

/** 树叶扫描半径（曼哈顿距离） */
export const LEAF_SCAN_RADIUS = 4;

/** 树叶最大扫描数量 */
export const LEAF_MAX_COUNT = 64;

/**
 * 普通方块（石头/泥土这类）的立方体尺寸，分别对应长(X)/宽(Z)/高(Y)。
 * 默认 3×3×3，最大 7×7×7。
 */
export const DEFAULT_CUBE_SIZE = 3;
export const CUBE_SIZE_MIN = 1;
export const CUBE_SIZE_MAX = 7;
