/**
 * WhiteListManager.ts -- 玩家自定义白名单
 *
 * DynamicProperty 键名前缀 veinminer_
 */

import { Player } from '@minecraft/server';

const WHITELIST_KEY = 'veinminer_whitelist';
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

export function addToWhitelist(player: Player, blockTypeId: string): boolean {
    const list = getWhitelist(player);
    if (list.includes(blockTypeId)) return false;
    if (list.length >= MAX_SIZE) return false;
    list.push(blockTypeId);
    setWhitelist(player, list);
    return true;
}

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
    if (items.length === 0) return '(空)';
    return items.map(id => id.replace(/^minecraft:/, '')).join(', ');
}