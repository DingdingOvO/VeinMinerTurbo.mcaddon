/**
 * GlobalBlacklist.ts — 服务器级方块名单（OP 可编辑，存世界动态属性）
 *
 * 两张表：
 *
 *   noWide（禁大范围）  /vm:ad bl add
 *       - 默认不给连锁
 *       - 玩家自己加进个人白名单 → 只按小范围立方体挖，不会整片 BFS
 *       - 用于石头、泥土这类「一连锁就是一大片」的方块
 *
 *   locked（锁定）      /vm:ad lk add
 *       - 任何连锁都不碰它：不管它自己在白名单里、玩家有没有加白名单、
 *         是矿脉还是立方体模式，一律无效
 *       - 内置的基岩、命令块等属于基础锁定，这里只能加、不能删
 */

import { world } from '@minecraft/server';

const KEY_NOWIDE = 'vm:global_nowide';
const KEY_LOCK = 'vm:global_lock';

// ═══════════════════════════════════════
//  存取
// ═══════════════════════════════════════

function load(key: string): Set<string> {
    try {
        const raw = world.getDynamicProperty(key);
        if (typeof raw === 'string') {
            const arr = JSON.parse(raw) as string[];
            if (Array.isArray(arr)) return new Set(arr);
        }
    } catch {
        // 解析失败按空处理
    }
    return new Set();
}

function save(key: string, set: Set<string>): void {
    try {
        world.setDynamicProperty(key, JSON.stringify([...set]));
    } catch {
        // 忽略
    }
}

let noWideCache: Set<string> | null = null;
let lockCache: Set<string> | null = null;

function noWide(): Set<string> {
    if (!noWideCache) noWideCache = load(KEY_NOWIDE);
    return noWideCache;
}

function locked(): Set<string> {
    if (!lockCache) lockCache = load(KEY_LOCK);
    return lockCache;
}

// ═══════════════════════════════════════
//  禁大范围
// ═══════════════════════════════════════

export function isNoWideBlock(blockId: string): boolean {
    return noWide().has(blockId);
}

export function addNoWideBlock(blockId: string): boolean {
    const set = noWide();
    if (set.has(blockId)) return false;

    // 已经锁定了就没必要再放这张表
    if (locked().has(blockId)) return false;

    set.add(blockId);
    save(KEY_NOWIDE, set);
    return true;
}

export function removeNoWideBlock(blockId: string): boolean {
    const set = noWide();
    if (!set.has(blockId)) return false;
    set.delete(blockId);
    save(KEY_NOWIDE, set);
    return true;
}

export function listNoWideBlocks(): string[] {
    return [...noWide()];
}

// ═══════════════════════════════════════
//  锁定（OP 追加部分）
// ═══════════════════════════════════════

/** 是否被 OP 锁定（不含内置那批） */
export function isLockedBlock(blockId: string): boolean {
    return locked().has(blockId);
}

export function addLockBlock(blockId: string): boolean {
    const set = locked();
    if (set.has(blockId)) return false;

    set.add(blockId);
    save(KEY_LOCK, set);

    // 锁定优先级更高，从「禁大范围」里摘掉避免两处都出现
    const soft = noWide();
    if (soft.has(blockId)) {
        soft.delete(blockId);
        save(KEY_NOWIDE, soft);
    }
    return true;
}

export function removeLockBlock(blockId: string): boolean {
    const set = locked();
    if (!set.has(blockId)) return false;
    set.delete(blockId);
    save(KEY_LOCK, set);
    return true;
}

export function listLockBlocks(): string[] {
    return [...locked()];
}
