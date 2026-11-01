/**
 * shared.ts — 命令模块共用的小工具
 *
 * 只放「几乎所有命令都要用」的东西：回显、权限判断、方块 ID 解析。
 */

import { Player, PlayerPermissionLevel } from '@minecraft/server';
import { TAG } from '../utils/LangHelper';

/** 动作栏回显（失败静默，玩家可能刚退出） */
export function bar(player: Player, text: string): void {
    try {
        player.onScreenDisplay.setActionBar(`${TAG} ${text}`);
    } catch {
        // 忽略
    }
}

/** 聊天框回显 */
export function chat(player: Player, text: string): void {
    try {
        player.sendMessage(`${TAG} ${text}`);
    } catch {
        // 忽略
    }
}

export function isOp(player: Player): boolean {
    try {
        return player.playerPermissionLevel >= PlayerPermissionLevel.Operator;
    } catch {
        return false;
    }
}

/** 补全 minecraft: 前缀，统一小写 */
export function normalizeId(raw: string): string {
    let id = (raw ?? '').trim().toLowerCase();
    if (!id) return '';
    if (!id.includes(':')) id = `minecraft:${id}`;
    return id;
}

/** 玩家正瞄准的方块，没瞄到返回空串 */
export function lookedAt(player: Player): string {
    try {
        const hit = player.getBlockFromViewDirection({ maxDistance: 6 });
        return hit?.block?.typeId ?? '';
    } catch {
        return '';
    }
}

/** 取方块 ID：命令里填了就用填的，没填就看瞄准 */
export function resolveBlock(player: Player, raw: string): string {
    return normalizeId(raw) || lookedAt(player);
}
