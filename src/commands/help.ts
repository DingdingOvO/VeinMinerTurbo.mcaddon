/**
 * help.ts — /vm:help [wl|c|ad]  命令说明
 */

import { Player } from '@minecraft/server';
import { chat, isOp } from './shared';

export function runHelp(player: Player, args: string[]): void {
    const topic = (args[0] ?? '').toLowerCase();

    if (!topic) return overview(player);
    if (topic === 'wl' || topic === 'whitelist' || topic === 'w') return whitelistHelp(player);
    if (topic === 'c' || topic === 'cfg' || topic === 'config' || topic === 's') return settingsHelp(player);
    if (topic === 'ad' || topic === 'admin') return adminHelp(player);

    chat(player, `§7没有 §f${topic}§7 这个模块。可选的：§fwl§7 / §fc§7 / §fad§7`);
}

function overview(player: Player): void {
    chat(player, [
        '§8───── §fVeinMinerTurbo§8 ─────',
        '§7玩法：§f潜行 §7+ §f挖掘 §7＝连锁采集',
        '',
        '§e/vm:wl  §7个人白名单',
        '§e/vm:c   §7设置与开关',
        '§e/vm:ad  §7管理命令 §8(仅 OP)',
        '',
        '§7看单个模块：§f/vm:help <wl|c|ad>',
    ].join('\n'));
}

function whitelistHelp(player: Player): void {
    chat(player, [
        '§8── §f白名单 §e/vm:wl §8──',
        '§e/vm:wl add §7[方块]    §8加（a）',
        '§e/vm:wl remove §7[方块] §8删（r）',
        '§e/vm:wl list           §8查看（l）',
        '§e/vm:wl clear          §8清空（c）',
        '',
        '§7方块 ID 可以不填，不填就用你正瞄准的方块。',
        '§7矿石原木整条挖；普通方块按设置的§f长/高/宽§7挖。',
    ].join('\n'));
}

function settingsHelp(player: Player): void {
    chat(player, [
        '§8── §f设置 §e/vm:c §8──',
        '§e/vm:c toggle   §7连锁开关（t）',
        '§e/vm:c outline  §7描边开关（o）',
        '§e/vm:c menu     §7打开设置菜单（m）',
        '',
        '§7设置菜单里可以调整§f长/高/宽§7、最大连锁数、最大深度、耐久保护。',
    ].join('\n'));
}

function adminHelp(player: Player): void {
    if (!isOp(player)) {
        chat(player, '§7管理命令只有 OP 能用；你需要的都在 §f/vm:help');
        return;
    }

    chat(player, [
        '§8── §f管理 §e/vm:ad §8(OP) ──',
        '§e/vm:ad bl add §7[方块]    §8禁大范围（a）',
        '§e/vm:ad bl remove §7[方块] §8移出（r）',
        '§e/vm:ad bl list            §8查看（l）',
        '§e/vm:ad lk add §7[方块]    §8锁定（a）',
        '§e/vm:ad lk list            §8查看（l）· §7bi 看内置',
        '§e/vm:ad pb add §7<玩家名>   §8禁用该玩家（a）',
        '§e/vm:ad pb remove §7<名字>  §8恢复（r）· §7list 查看',
        '',
        '§7禁大范围：所有人默认不连锁；加白名单后只能小范围挖。',
        '§7锁定：玩家白名单怎么写都连锁不了它；基岩等内置的删不掉。',
        '§7玩家黑名单：这个人的连锁采集和所有命令全部失效。',
    ].join('\n'));
}
