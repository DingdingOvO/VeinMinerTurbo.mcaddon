/**
 * admin.ts — /vm:ad  管理命令（仅 OP）
 *
 *   bl|blocklist  add|remove|list [方块]   禁大范围：默认不连锁，白名单后只能小范围
 *   lk|lock       add|remove|list [方块]   锁定：白名单怎么写都不连锁
 *   lk bi                                  看内置锁定清单
 *   pb|player     add|remove|list <玩家名> 玩家黑名单：整个模组对他失效
 */

import { Player } from '@minecraft/server';
import {
    addNoWideBlock, removeNoWideBlock, listNoWideBlocks,
    addLockBlock, removeLockBlock, listLockBlocks, isLockedBlock,
} from '../config/admin/GlobalBlacklist';
import {
    addBannedPlayer, removeBannedPlayer, listBannedPlayers,
} from '../config/admin/PlayerBlacklist';
import { isBuiltinForbidden, FORBIDDEN_IDS } from '../config';
import { blockName } from '../data/BlockNames';
import { bar, chat, isOp, resolveBlock } from './shared';

export function runAdmin(player: Player, args: string[]): void {
    if (!isOp(player)) {
        bar(player, '§c需要 OP 权限');
        return;
    }

    const group = (args[0] ?? '').toLowerCase();

    if (group === 'bl' || group === 'blocklist') {
        blocklist(player, args, false);
        return;
    }

    if (group === 'lk' || group === 'lock' || group === 'sl' || group === 'strong') {
        blocklist(player, args, true);
        return;
    }

    if (group === 'pb' || group === 'player' || group === 'players') {
        playerBan(player, args);
        return;
    }

    chat(player, [
        '§8── §f管理 §e/vm:ad §8(OP) ──',
        '§e/vm:ad bl add|remove|list',
        '§7   禁大范围：默认不连锁，白名单后只能小范围',
        '§e/vm:ad lk add|remove|list',
        '§7   锁定：白名单怎么写都不会连锁它',
        '§e/vm:ad pb add|remove|list',
        '§7   玩家黑名单：这个人整个模组都用不了',
        '§7详情：§f/vm:help ad',
    ].join('\n'));
}

/**
 * @param locked true = 锁定（lk），false = 禁大范围（bl）
 */
function blocklist(player: Player, args: string[], locked: boolean): void {
    const action = (args[1] ?? 'list').toLowerCase();
    const cmd = locked ? '/vm:ad lk' : '/vm:ad bl';

    // ── 列表 ──
    if (action === 'list' || action === 'l' || action === '') {
        if (locked) {
            const custom = listLockBlocks();
            chat(player, `§f锁定方块 §7· 内置 §e${FORBIDDEN_IDS.length} §7个（不可改）`);
            if (custom.length === 0) {
                chat(player, '§7自己锁的是空的，看着方块打 §f/vm:ad lk a');
            } else {
                chat(player, `§7自锁 §e${custom.length} §7个: §c${custom.map(blockName).join('、')}`);
            }
            chat(player, '§8看内置列表：§7/vm:ad lk bi');
            return;
        }

        const list = listNoWideBlocks();
        if (list.length === 0) {
            chat(player, '§7禁大范围是空的，看着方块打 §f/vm:ad bl a');
        } else {
            chat(player, `§f禁大范围 §7(${list.length}): §c${list.map(blockName).join('、')}`);
        }
        return;
    }

    // ── 内置锁定清单（只读） ──
    if (locked && (action === 'builtin' || action === 'bi')) {
        chat(player, `§f内置锁定方块 §7(${FORBIDDEN_IDS.length})`);
        chat(player, `§8${FORBIDDEN_IDS.map(blockName).join('、')}`);
        return;
    }

    // ── 增删 ──
    if (action !== 'add' && action !== 'a' && action !== 'remove' && action !== 'r') {
        bar(player, `§c用法: ${cmd} <add|remove|list> [方块] §7· /vm:help ad`);
        return;
    }

    const id = resolveBlock(player, args[2] ?? '');
    if (!id) {
        bar(player, '§c没有瞄准任何方块');
        return;
    }
    const name = blockName(id);

    if (action === 'add' || action === 'a') {
        if (isBuiltinForbidden(id)) {
            bar(player, `§7${name} §7是内置锁定，本来就生效`);
            return;
        }

        if (locked) {
            const added = addLockBlock(id);
            bar(player, added
                ? `§f${name} §c已锁定 §7（白名单怎么写都不连锁）`
                : `§7${name} 已经锁定了`);
            return;
        }

        if (isLockedBlock(id)) {
            bar(player, `§7${name} §7已锁定，比禁大范围更彻底`);
            return;
        }

        const added = addNoWideBlock(id);
        bar(player, added
            ? `§f${name} §c已加入禁大范围 §7（默认不连锁，白名单后只能小范围）`
            : `§7${name} 已经在禁大范围里`);
        return;
    }

    // remove
    if (locked) {
        if (isBuiltinForbidden(id)) {
            bar(player, `§c${name} §7是内置锁定，删不掉`);
            return;
        }
        const ok = removeLockBlock(id);
        chat(player, ok ? `§f${name} §a已解锁` : `§7${name} 不在锁定名单里`);
        return;
    }

    const ok = removeNoWideBlock(id);
    chat(player, ok ? `§f${name} §a已移出禁大范围` : `§7${name} 不在禁大范围里`);
}

function playerBan(player: Player, args: string[]): void {
    const action = (args[1] ?? 'list').toLowerCase();

    if (action === 'list' || action === 'l' || action === '') {
        const list = listBannedPlayers();
        if (list.length === 0) {
            chat(player, '§7玩家黑名单是空的，用 §f/vm:ad pb a <玩家名>');
        } else {
            chat(player, `§f玩家黑名单 §7(${list.length}): §c${list.join('、')}`);
        }
        return;
    }

    if (action !== 'add' && action !== 'a' && action !== 'remove' && action !== 'r') {
        bar(player, '§c用法: /vm:ad pb <add|remove|list> <玩家名>');
        return;
    }

    const name = (args[2] ?? '').trim();
    if (!name) {
        bar(player, '§c要填玩家名，例：/vm:ad pb a Steve');
        return;
    }

    if (name.toLowerCase() === player.name.toLowerCase()) {
        bar(player, '§c不能把自己加进玩家黑名单');
        return;
    }

    if (action === 'add' || action === 'a') {
        const ok = addBannedPlayer(name);
        chat(player, ok
            ? `§f${name} §c已被禁止使用连锁采集`
            : `§7${name} 已经在玩家黑名单里`);
        return;
    }

    const ok = removeBannedPlayer(name);
    chat(player, ok ? `§f${name} §a已恢复使用权限` : `§7${name} 不在玩家黑名单里`);
}
