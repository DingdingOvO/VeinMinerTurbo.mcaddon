/**
 * PlayerConfig.ts — 玩家偏好（DynamicProperty）
 *
 * 每个玩家独立存储，用 DynamicProperty 持久化
 */

import { Player } from '@minecraft/server';
import { DEFAULT_MAX_VEIN, DEFAULT_CUBE_SIZE, CUBE_SIZE_MIN, CUBE_SIZE_MAX } from './Constants';

// ═══════════════════════════════════════
//  DynamicProperty key 常量
// ═══════════════════════════════════════

const KEY_TOGGLE = 'vm:toggle';
const KEY_MAX_VEIN = 'vm:max_vein';
const KEY_AUTO_LEAVES = 'vm:auto_leaves';
const KEY_COLLECT_DROPS = 'vm:collect_drops';
const KEY_EXCAVATE = 'vm:excavate';

// ═══════════════════════════════════════
//  连锁开关
// ═══════════════════════════════════════

/** 获取连锁开关，默认开启 */
export function getPlayerToggle(p: Player): boolean {
    const v = p.getDynamicProperty(KEY_TOGGLE);
    return v !== false;
}

export function setPlayerToggle(p: Player, v: boolean): void {
    p.setDynamicProperty(KEY_TOGGLE, v);
}

// ═══════════════════════════════════════
//  最大连锁数
// ═══════════════════════════════════════

export function getPlayerMaxVein(p: Player): number {
    const v = p.getDynamicProperty(KEY_MAX_VEIN);
    return typeof v === 'number' ? v : DEFAULT_MAX_VEIN;
}

export function setPlayerMaxVein(p: Player, v: number): void {
    p.setDynamicProperty(KEY_MAX_VEIN, v);
}

// ═══════════════════════════════════════
//  自动破叶
// ═══════════════════════════════════════

/** 获取自动破叶开关，默认开启 */
export function getPlayerAutoLeaves(p: Player): boolean {
    const v = p.getDynamicProperty(KEY_AUTO_LEAVES);
    return v !== false;
}

export function setPlayerAutoLeaves(p: Player, v: boolean): void {
    p.setDynamicProperty(KEY_AUTO_LEAVES, v);
}

// ═══════════════════════════════════════
//  掉落物集中
// ═══════════════════════════════════════

/** 获取掉落物集中开关，默认开启 */
export function getPlayerCollectDrops(p: Player): boolean {
    const v = p.getDynamicProperty(KEY_COLLECT_DROPS);
    return v !== false;
}

export function setPlayerCollectDrops(p: Player, v: boolean): void {
    p.setDynamicProperty(KEY_COLLECT_DROPS, v);
}

// ═══════════════════════════════════════
//  搜索深度
// ═══════════════════════════════════════

const KEY_MAX_DEPTH = 'veinminer_max_depth';
const DEFAULT_MAX_DEPTH = 8;

/** 获取最大搜索深度（BFS 层数），默认 8 */
export function getPlayerMaxDepth(p: Player): number {
    const v = p.getDynamicProperty(KEY_MAX_DEPTH);
    return typeof v === 'number' ? v : DEFAULT_MAX_DEPTH;
}

export function setPlayerMaxDepth(p: Player, v: number): void {
    p.setDynamicProperty(KEY_MAX_DEPTH, v);
}

// ═══════════════════════════════════════
//  耐久保护
// ═══════════════════════════════════════

const KEY_DURABILITY = 'veinminer_durability';

/** 是否开启耐久保护，默认开启 */
export function getPlayerDurabilityGuard(p: Player): boolean {
    return p.getDynamicProperty(KEY_DURABILITY) !== false;
}

export function setPlayerDurabilityGuard(p: Player, v: boolean): void {
    p.setDynamicProperty(KEY_DURABILITY, v);
}

// ═══════════════════════════════════════
//  轮廓预览
// ═══════════════════════════════════════

const KEY_OUTLINE = 'veinminer_outline';

/** 是否显示方块轮廓预览，默认开启 */
export function getPlayerOutline(p: Player): boolean {
    return p.getDynamicProperty(KEY_OUTLINE) !== false;
}

export function setPlayerOutline(p: Player, v: boolean): void {
    p.setDynamicProperty(KEY_OUTLINE, v);
}

// ═══════════════════════════════════════
//  3×3×3 挖掘（普通方块白名单）
// ═══════════════════════════════════════

/** 获取3×3×3挖掘开关，默认关闭 */
export function getPlayerExcavate(p: Player): boolean {
    const v = p.getDynamicProperty(KEY_EXCAVATE);
    return v === true;
}

export function setPlayerExcavate(p: Player, v: boolean): void {
    p.setDynamicProperty(KEY_EXCAVATE, v);
}

// ═══════════════════════════════════════
//  立方体尺寸（白名单普通方块，长/宽/高）
// ═══════════════════════════════════════

const KEY_SIZE_X = 'vm:size_x';
const KEY_SIZE_Y = 'vm:size_y';
const KEY_SIZE_Z = 'vm:size_z';

export interface CubeSize {
    /** 长（X 轴） */
    x: number;
    /** 高（Y 轴） */
    y: number;
    /** 宽（Z 轴） */
    z: number;
}

function readSize(p: Player, key: string): number {
    const v = p.getDynamicProperty(key);
    const n = typeof v === 'number' ? v : DEFAULT_CUBE_SIZE;
    return Math.min(CUBE_SIZE_MAX, Math.max(CUBE_SIZE_MIN, Math.floor(n)));
}

/** 获取立方体尺寸，默认 3×3×3 */
export function getPlayerCubeSize(p: Player): CubeSize {
    return {
        x: readSize(p, KEY_SIZE_X),
        y: readSize(p, KEY_SIZE_Y),
        z: readSize(p, KEY_SIZE_Z),
    };
}

export function setPlayerCubeSize(p: Player, size: Partial<CubeSize>): void {
    const clamp = (n: number): number =>
        Math.min(CUBE_SIZE_MAX, Math.max(CUBE_SIZE_MIN, Math.floor(n)));

    if (typeof size.x === 'number') p.setDynamicProperty(KEY_SIZE_X, clamp(size.x));
    if (typeof size.y === 'number') p.setDynamicProperty(KEY_SIZE_Y, clamp(size.y));
    if (typeof size.z === 'number') p.setDynamicProperty(KEY_SIZE_Z, clamp(size.z));
}