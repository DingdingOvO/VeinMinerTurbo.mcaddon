/**
 * Whitelist.ts — 玩家个人白名单（每个玩家自己维护）
 *
 * 存玩家动态属性，JSON 数组，上限 64 种方块。
 * 只存 typeId，显示时经 BlockNames 转中文。
 */

import { Player } from '@minecraft/server';
import { blockName } from './BlockNames';

const WHITELIST_KEY = 'vmt_whitelist';
const MAX_SIZE = 64;

// ═══════════════════════════════════════
//  读写
// ═══════════════════════════════════════

export function getWhitelist(player: Player): string[] {
    const raw = player.getDynamicProperty(WHITELIST_KEY);
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as string[];
        } catch {
            return [];
        }
    }
    return [];
}

function setWhitelist(player: Player, list: string[]): void {
    player.setDynamicProperty(WHITELIST_KEY, JSON.stringify(list));
}

// ═══════════════════════════════════════
//  增删清
// ═══════════════════════════════════════

export type AddResult = 'added' | 'exists' | 'full';

export function addToWhitelist(player: Player, blockTypeId: string): AddResult {
    const list = getWhitelist(player);
    if (list.includes(blockTypeId)) return 'exists';
    if (list.length >= MAX_SIZE) return 'full';
    list.push(blockTypeId);
    setWhitelist(player, list);
    return 'added';
}

/** 白名单条数上限 */
export const WHITELIST_LIMIT = MAX_SIZE;

export function removeFromWhitelist(player: Player, blockTypeId: string): boolean {
    const list = getWhitelist(player);
    const idx = list.indexOf(blockTypeId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    setWhitelist(player, list);
    return true;
}

export function clearWhitelist(player: Player): void {
    player.setDynamicProperty(WHITELIST_KEY, '[]');
}

// ═══════════════════════════════════════
//  格式化显示
// ═══════════════════════════════════════

export function formatWhitelist(items: string[]): string {
    if (items.length === 0) return '';
    return items.map(id => blockName(id)).join('、');
}