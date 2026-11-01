/**
 * whitelist.ts — /vm:wl  个人白名单
 *
 *   add|a    [方块]  加（不填 ID 就用瞄准的方块）
 *   remove|r [方块]  移除
 *   list|l           查看
 *   clear|c          清空
 */

import { Player } from '@minecraft/server';
import {
    getWhitelist, addToWhitelist, removeFromWhitelist, clearWhitelist, formatWhitelist,
    WHITELIST_LIMIT,
} from '../data/Whitelist';
import { isNoWideBlock } from '../config/admin/GlobalBlacklist';
import { isForbidden } from '../config';
import { blockName } from '../data/BlockNames';
import { bar, chat, resolveBlock } from './shared';

export function runWhitelist(player: Player, args: string[]): void {
    const sub = (args[0] ?? 'list').toLowerCase();

    if (sub === 'list' || sub === 'l' || sub === '') {
        const list = getWhitelist(player);
        if (list.length === 0) {
            chat(player, '§7白名单是空的，看着方块打 §f/vm:wl a');
        } else {
            chat(player, `§f白名单 §7(${list.length}): §a${formatWhitelist(list)}`);
        }
        return;
    }

    if (sub === 'clear' || sub === 'c') {
        clearWhitelist(player);
        bar(player, '§c白名单已清空');
        return;
    }

    if (sub !== 'add' && sub !== 'a' && sub !== 'remove' && sub !== 'r') {
        bar(player, '§c用法: /vm:wl <add|remove|list|clear> §7· /vm:help wl');
        return;
    }

    const id = resolveBlock(player, args[1] ?? '');
    if (!id) {
        bar(player, '§c没有瞄准任何方块');
        return;
    }

    if (isForbidden(id)) {
        bar(player, `§c${blockName(id)} §7已被锁定，连锁不了`);
        return;
    }

    if (sub === 'add' || sub === 'a') {
        const result = addToWhitelist(player, id);
        if (result === 'exists') {
            bar(player, `§7${blockName(id)} §7已在白名单里`);
            return;
        }
        if (result === 'full') {
            bar(player, `§c白名单满了（上限 ${WHITELIST_LIMIT} 种），先 /vm:wl r 删掉一些`);
            return;
        }
        const extra = isNoWideBlock(id) ? '§7· 只能小范围' : '';
        bar(player, `§f${blockName(id)} §a已加入白名单 ${extra}`);
        return;
    }

    const ok = removeFromWhitelist(player, id);
    bar(player, ok ? `§f${blockName(id)} §c已移出白名单` : `§7${blockName(id)} 不在白名单里`);
}
