/**
 * main.ts -- VeinMinerTurbo Behavior Pack Entry
 *
 * 命令分三层：vm → 模块 → 动作，每个都有简写。
 *
 *   /vm:wl  (whitelist)  个人白名单
 *       add|a  [方块]     加白名单（不填就取瞄准的方块）
 *       remove|r [方块]   移除
 *       list|l            查看
 *       clear|c           清空
 *
 *   /vm:c   (cfg)        玩家设置
 *       toggle|t          连锁开关
 *       outline|o         描边开关
 *       menu|m            设置菜单
 *
 *   /vm:ad  (admin)      管理命令（仅 OP）
 *       blocklist|bl add|a [方块]     加入「禁大范围」黑名单
 *       blocklist|bl remove|r [方块]  移出
 *       blocklist|bl list|l           查看
 *       lock|lk add|a [方块]          锁定方块（白名单也连锁不了）
 *       lock|lk remove|r [方块]       解锁（内置的删不掉）
 *       lock|lk list|l                查看 · bi 看内置清单
 *       player|pb add|a <玩家名>      禁用该玩家的整个模组
 *       player|pb remove|r <玩家名>   恢复
 *       player|pb list|l              查看
 *
 *   /vm:help [wl|c|ad]   命令列表
 */

import {
    world, system, Player, PlayerPermissionLevel,
    CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus,
    ScriptEventSource, ScriptEventCommandMessageAfterEvent,
} from '@minecraft/server';
import { registerVeinMiner } from './core';
import { startOutlineLoop } from './core/Outline';
import { showSettings } from './ui/VeinMinerUI';
import {
    getPlayerToggle, setPlayerToggle,
    getPlayerOutline, setPlayerOutline,
    isForbidden, isBuiltinForbidden, FORBIDDEN_IDS,
} from './config';
import {
    addNoWideBlock, removeNoWideBlock, listNoWideBlocks, isNoWideBlock,
    addLockBlock, removeLockBlock, listLockBlocks, isLockedBlock,
} from './config/GlobalBlacklist';
import {
    isPlayerBanned, addBannedPlayer, removeBannedPlayer, listBannedPlayers,
} from './config/PlayerBlacklist';
import {
    getWhitelist, addToWhitelist, removeFromWhitelist, clearWhitelist, formatWhitelist,
} from './ui/WhiteListManager';
import { t, rawtext, TAG } from './utils/LangHelper';
import { blockName } from './utils/BlockNames';

/** 脚本加载标记 */
console.log('[VMT] VeinMinerTurbo scripts loaded');

// ═══════════════════════════════════════
//  基础工具
// ═══════════════════════════════════════

type Module = 'wl' | 'cfg' | 'ad';

function bar(player: Player, text: string): void {
    try {
        player.onScreenDisplay.setActionBar(rawtext(`${TAG} ${text}`));
    } catch {
        // 忽略
    }
}

function chat(player: Player, text: string): void {
    try {
        player.sendMessage(`${TAG} ${text}`);
    } catch {
        // 忽略
    }
}

function isOp(player: Player): boolean {
    try {
        return player.playerPermissionLevel >= PlayerPermissionLevel.Operator;
    } catch {
        return false;
    }
}

/** 补全 minecraft: 前缀 */
function normalizeId(raw: string): string {
    let id = (raw ?? '').trim().toLowerCase();
    if (!id) return '';
    if (!id.includes(':')) id = `minecraft:${id}`;
    return id;
}

/** 不填 ID 时取瞄准的方块 */
function lookedAt(player: Player): string {
    try {
        const hit = player.getBlockFromViewDirection({ maxDistance: 6 });
        return hit?.block?.typeId ?? '';
    } catch {
        return '';
    }
}

/** 取参数里的方块 ID：优先用填的，没填就看瞄准 */
function resolveBlock(player: Player, raw: string): string {
    return normalizeId(raw) || lookedAt(player);
}

// ═══════════════════════════════════════
//  白名单模块
// ═══════════════════════════════════════

function moduleWhitelist(player: Player, args: string[]): void {
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
        addToWhitelist(player, id);
        const extra = isNoWideBlock(id) ? '§7· 只能小范围' : '';
        bar(player, `§f${blockName(id)} §a已加入白名单 ${extra}`);
    } else {
        const ok = removeFromWhitelist(player, id);
        bar(player, ok ? `§f${blockName(id)} §c已移出白名单` : `§7${blockName(id)} 不在白名单里`);
    }
}

// ═══════════════════════════════════════
//  设置模块
// ═══════════════════════════════════════

function moduleConfig(player: Player, args: string[]): void {
    const sub = (args[0] ?? '').toLowerCase();

    if (sub === 'toggle' || sub === 't') {
        const next = !getPlayerToggle(player);
        setPlayerToggle(player, next);
        bar(player, t(next ? 'veinminer.tip.on' : 'veinminer.tip.off', player));
        return;
    }

    if (sub === 'outline' || sub === 'o') {
        const next = !getPlayerOutline(player);
        setPlayerOutline(player, next);
        bar(player, `轮廓预览 ${next ? '§a开' : '§c关'}`);
        return;
    }

    if (sub === 'menu' || sub === 'm' || sub === '') {
        void showSettings(player);
        return;
    }

    bar(player, '§c用法: /vm:c <toggle|outline|menu> §7· /vm:help c');
}

// ═══════════════════════════════════════
//  管理模块（仅 OP）
// ═══════════════════════════════════════

function moduleAdmin(player: Player, args: string[]): void {
    if (!isOp(player)) {
        bar(player, '§c需要 OP 权限');
        return;
    }

    const group = (args[0] ?? '').toLowerCase();

    if (group === 'blocklist' || group === 'bl') {
        adminBlocklist(player, args, false);
        return;
    }

    if (group === 'lock' || group === 'lk' || group === 'sl' || group === 'strong') {
        adminBlocklist(player, args, true);
        return;
    }

    if (group === 'pb' || group === 'player' || group === 'players') {
        adminPlayerBan(player, args);
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

// ═══════════════════════════════════════
//  玩家黑名单（禁用整个模组）
// ═══════════════════════════════════════

function adminPlayerBan(player: Player, args: string[]): void {
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
        chat(
            player,
            ok
                ? `§f${name} §c已被禁止使用连锁采集`
                : `§7${name} 已经在玩家黑名单里`,
        );
        return;
    }

    const ok = removeBannedPlayer(name);
    chat(player, ok ? `§f${name} §a已恢复使用权限` : `§7${name} 不在玩家黑名单里`);
}

/**
 * @param strong true = 锁定（lk），false = 禁大范围（bl）
 */
function adminBlocklist(player: Player, args: string[], strong: boolean): void {
    const action = (args[1] ?? 'list').toLowerCase();
    const cmd = strong ? '/vm:ad lk' : '/vm:ad bl';

    // ── 列表 ──
    if (action === 'list' || action === 'l' || action === '') {
        if (strong) {
            const builtin = FORBIDDEN_IDS.length;
            const custom = listLockBlocks();
            chat(player, `§f锁定方块 §7· 内置 §e${builtin} §7个（不可改）`);
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

    // ── 内置锁定方块清单（只读） ──
    if (strong && (action === 'builtin' || action === 'bi')) {
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

        if (strong) {
            const added = addLockBlock(id);
            bar(
                player,
                added
                    ? `§f${name} §c已锁定 §7（白名单怎么写都不连锁）`
                    : `§7${name} 已经锁定了`,
            );
            return;
        }

        if (isLockedBlock(id)) {
            bar(player, `§7${name} §7已锁定，比禁大范围更彻底`);
            return;
        }
        const added = addNoWideBlock(id);
        bar(
            player,
            added
                ? `§f${name} §c已加入禁大范围 §7（默认不连锁，白名单后只能小范围）`
                : `§7${name} 已经在禁大范围里`,
        );
        return;
    }

    // remove
    if (strong) {
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

// ═══════════════════════════════════════
//  帮助
// ═══════════════════════════════════════

function helpOverview(player: Player): void {
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

function helpWhitelist(player: Player): void {
    chat(player, [
        '§8── §f白名单 §e/vm:wl §8──',
        '§e/vm:wl add §7[方块]    §8加（a）',
        '§e/vm:wl remove §7[方块] §8删（r）',
        '§e/vm:wl list           §8查看（l）',
        '§e/vm:wl clear          §8清空（c）',
        '',
        '§7方块 ID 可以不填，不填就用你正瞄准的方块。',
        '§7加进白名单后：普通方块按设置的§f长/高/宽§7挖，矿石原木整条挖。',
    ].join('\n'));
}

function helpConfig(player: Player): void {
    chat(player, [
        '§8── §f设置 §e/vm:c §8──',
        '§e/vm:c toggle   §7连锁开关（t）',
        '§e/vm:c outline  §7描边开关（o）',
        '§e/vm:c menu     §7打开设置菜单（m）',
        '',
        '§7设置菜单里可以调整§f长/高/宽§7、最大连锁数、最大深度、耐久保护。',
    ].join('\n'));
}

function helpAdmin(player: Player): void {
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

function cmdHelp(player: Player, args: string[]): void {
    const topic = (args[0] ?? '').toLowerCase();

    if (!topic) return helpOverview(player);
    if (topic === 'wl' || topic === 'whitelist' || topic === 'w') return helpWhitelist(player);
    if (topic === 'c' || topic === 'cfg' || topic === 'config' || topic === 's') return helpConfig(player);
    if (topic === 'ad' || topic === 'admin') return helpAdmin(player);

    chat(player, `§7没有 §f${topic}§7 这个模块。可选的：§fwl§7 / §fc§7 / §fad§7`);
}

/** 统一入口 */
function runAction(player: Player, module: Module | 'help', args: string[]): void {
    // 玩家黑名单：整条命令线都不响应（OP 例外，方便自救）
    if (isPlayerBanned(player) && !isOp(player)) {
        chat(player, '§c你已被管理员禁止使用连锁采集');
        return;
    }

    switch (module) {
        case 'wl': moduleWhitelist(player, args); break;
        case 'cfg': moduleConfig(player, args); break;
        case 'ad': moduleAdmin(player, args); break;
        case 'help': cmdHelp(player, args); break;
    }
}

registerVeinMiner();
startOutlineLoop();

// ═══════════════════════════════════════
//  命令队列
// ═══════════════════════════════════════

interface PendingJob {
    playerId: string;
    module: Module | 'help';
    args: string[];
}

const pendingJobs: PendingJob[] = [];

/** 参数统一成字符串 */
function toStr(v: unknown): string {
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    const anyV = v as { id?: unknown };
    if (anyV && typeof anyV.id === 'string') return anyV.id;
    return '';
}

// ═══════════════════════════════════════
//  命令注册（成员可用，不需要 OP）
// ═══════════════════════════════════════

interface CmdDef {
    name: string;
    description: string;
    module: Module | 'help';
    params: number;
}

const CMDS: CmdDef[] = [
    { name: 'vm:help', description: '命令列表 /vm:help [wl|c|ad]', module: 'help', params: 1 },
    { name: 'vm:h', description: '命令列表（同 vm:help）', module: 'help', params: 1 },
    { name: 'vm:wl', description: '白名单 add/remove/list/clear', module: 'wl', params: 2 },
    { name: 'vm:whitelist', description: '白名单（同 vm:wl）', module: 'wl', params: 2 },
    { name: 'vm:c', description: '设置 toggle/outline/menu', module: 'cfg', params: 1 },
    { name: 'vm:cfg', description: '设置（同 vm:c）', module: 'cfg', params: 1 },
    { name: 'vm:ad', description: '管理命令（仅 OP）', module: 'ad', params: 3 },
    { name: 'vm:admin', description: '管理命令（同 vm:ad）', module: 'ad', params: 3 },
];

try {
    system.beforeEvents.startup.subscribe((ev) => {
        const reg = ev.customCommandRegistry;

        for (const def of CMDS) {
            const optional = Array.from({ length: def.params }, (_, i) => ({
                name: `arg${i + 1}`,
                type: CustomCommandParamType.String,
            }));

            try {
                reg.registerCommand(
                    {
                        name: def.name,
                        description: def.description,
                        permissionLevel: CommandPermissionLevel.Any,
                        cheatsRequired: false,
                        optionalParameters: optional,
                    },
                    (origin, ...rest) => {
                        const src = origin.sourceEntity;
                        const isPlayer = !!src && src.typeId === 'minecraft:player';
                        if (!isPlayer || !src) {
                            return { status: CustomCommandStatus.Failure, message: '只能由玩家执行' };
                        }

                        pendingJobs.push({
                            playerId: src.id,
                            module: def.module,
                            args: rest.map(toStr),
                        });
                        return { status: CustomCommandStatus.Success };
                    },
                );
            } catch (error) {
                console.warn(`[VMT] register ${def.name} failed: ${error}`);
            }
        }
    });
} catch (error) {
    console.warn(`[VMT] custom command registration unavailable: ${error}`);
}

/**
 * 独立 tick 消费队列（不在 restricted execution 里）
 */
system.runInterval(() => {
    if (pendingJobs.length === 0) return;

    const job = pendingJobs.shift();
    if (!job) return;

    const player = world.getAllPlayers().find(p => p.id === job.playerId);
    if (!player) return;

    try {
        runAction(player, job.module, job.args);
    } catch (error) {
        console.warn(`[VMT] command ${job.module} failed: ${error}`);
    }
}, 1);

// ═══════════════════════════════════════
//  scriptEvent 兼容旧接口
// ═══════════════════════════════════════

system.afterEvents.scriptEventReceive.subscribe(
    (event: ScriptEventCommandMessageAfterEvent) => {
        try {
            if (event.sourceType !== ScriptEventSource.Entity) return;
            const entity = event.sourceEntity;
            if (!entity || entity.typeId !== 'minecraft:player') return;
            const player = entity as Player;

            const id = event.id;

            if (id === 'vm:t' || id === 'veinminer:toggle') {
                runAction(player, 'cfg', ['toggle']);
            } else if (id === 'vm:s' || id === 'veinminer:settings') {
                runAction(player, 'cfg', ['menu']);
            } else if (id === 'vm:a' || id === 'veinminer:addblock') {
                runAction(player, 'wl', ['add']);
            }
        } catch (error) {
            console.warn(`[VMT] scriptevent error: ${error}`);
        }
    },
    { namespaces: ['vm', 'veinminer'] },
);
