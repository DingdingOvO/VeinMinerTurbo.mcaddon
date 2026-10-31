/**
 * PlayerBlacklist.ts — 玩家黑名单
 *
 * 进了这张表的玩家：整个模组对他就等于不存在
 *   - 潜行挖掘不触发连锁
 *   - 开关、白名单、菜单命令一律不响应（只回一句「你已被限制」）
 *
 * 按玩家名存（小写匹配），存世界动态属性，重启后仍在。
 * 改名会失效，这是名字方案的固有限制。
 */

import { world, Player } from '@minecraft/server';

const KEY = 'vm:player_ban';

let cache: Set<string> | null = null;

function load(): Set<string> {
    try {
        const raw = world.getDynamicProperty(KEY);
        if (typeof raw === 'string') {
            const arr = JSON.parse(raw) as string[];
            if (Array.isArray(arr)) return new Set(arr.map(n => String(n).toLowerCase()));
        }
    } catch {
        // 解析失败按空处理
    }
    return new Set();
}

function save(set: Set<string>): void {
    try {
        world.setDynamicProperty(KEY, JSON.stringify([...set]));
    } catch {
        // 忽略
    }
}

function table(): Set<string> {
    if (!cache) cache = load();
    return cache;
}

/** 该玩家是否被禁止使用模组 */
export function isPlayerBanned(player: Player): boolean {
    try {
        return table().has(player.name.toLowerCase());
    } catch {
        return false;
    }
}

export function addBannedPlayer(name: string): boolean {
    const key = name.trim().toLowerCase();
    if (!key) return false;

    const set = table();
    if (set.has(key)) return false;
    set.add(key);
    save(set);
    return true;
}

export function removeBannedPlayer(name: string): boolean {
    const key = name.trim().toLowerCase();
    const set = table();
    if (!set.has(key)) return false;
    set.delete(key);
    save(set);
    return true;
}

export function listBannedPlayers(): string[] {
    return [...table()];
}

/** 名单里有没有这个人（不要求在线） */
export function isNameBanned(name: string): boolean {
    return table().has(name.trim().toLowerCase());
}
