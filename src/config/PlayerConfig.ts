/**
 * PlayerConfig.ts — 玩家偏好（DynamicProperty）
 *
 * 每个玩家独立存储，用 DynamicProperty 持久化
 */

import { Player } from '@minecraft/server';
import { DEFAULT_MAX_VEIN } from './Constants';

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

/** 获取自动破叶开关，默认关闭 */
export function getPlayerAutoLeaves(p: Player): boolean {
    const v = p.getDynamicProperty(KEY_AUTO_LEAVES);
    return v === true;
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
//  3×3×3 挖掘（预留）
// ═══════════════════════════════════════

/** 获取3×3×3挖掘开关，默认关闭 */
export function getPlayerExcavate(p: Player): boolean {
    const v = p.getDynamicProperty(KEY_EXCAVATE);
    return v === true;
}

export function setPlayerExcavate(p: Player, v: boolean): void {
    p.setDynamicProperty(KEY_EXCAVATE, v);
}