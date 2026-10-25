/**
 * main.ts -- VeinMinerTurbo Behavior Pack Entry
 *
 * 交互方式（没有物品、没有 UI 入口）:
 *   - 潜行 + 破坏方块 -> 连锁挖矿
 *   - /vm:menu   打开设置（成员权限即可，不需要 OP）
 *   - /vm:toggle 开关
 *   - /vm:add    添加注视方块到白名单
 *   - 兼容旧接口：/scriptevent vm:s / vm:t / vm:a
 */

import {
    world, system, Player,
    CommandPermissionLevel, CustomCommandStatus,
    ScriptEventSource, ScriptEventCommandMessageAfterEvent,
} from '@minecraft/server';
import { registerVeinMiner } from './core';
import { showSettings } from './ui/VeinMinerUI';
import { getPlayerToggle, setPlayerToggle } from './config';
import { addToWhitelist } from './ui/WhiteListManager';
import { t, tf1, tagged, rawtext, TAG } from './utils/LangHelper';

/** 脚本加载标记：日志里出现这一行，说明模块已成功解析并运行 */
console.log('[VMT] VeinMinerTurbo scripts loaded');

// ═══════════════════════════════════════
//  动作实现
// ═══════════════════════════════════════

type Action = 'menu' | 'toggle' | 'add';

/** 切换开关 */
function toggleVeinMiner(player: Player): void {
    const next = !getPlayerToggle(player);
    setPlayerToggle(player, next);

    player.onScreenDisplay.setActionBar([
        rawtext(TAG + ' '),
        t(next ? 'veinminer.tip.on' : 'veinminer.tip.off', player),
    ]);
}

/** 把注视的方块加进白名单 */
function addLookedAtBlock(player: Player): void {
    const hit = player.getBlockFromViewDirection({ maxDistance: 6 });
    if (hit && hit.block) {
        const added = addToWhitelist(player, hit.block.typeId);
        const blockName = hit.block.typeId.replace(/^minecraft:/, '');
        player.sendMessage(
            added
                ? [rawtext(TAG + ' §a'), tf1('veinminer.tip.added', '§f' + blockName, player)]
                : [rawtext(TAG + ' §c' + blockName + ' '), t('veinminer.tip.already', player)],
        );
    } else {
        player.sendMessage(tagged('veinminer.tip.not_looking', player));
    }
}

/** 统一入口：命令与 scriptevent 共用 */
function runAction(player: Player, action: Action): void {
    if (action === 'toggle') toggleVeinMiner(player);
    else if (action === 'menu') showSettings(player);
    else if (action === 'add') addLookedAtBlock(player);
}

registerVeinMiner();

// ═══════════════════════════════════════
//  命令请求队列
// ═══════════════════════════════════════

interface PendingJob {
    playerId: string;
    action: Action;
}

/** 命令回调只往这里塞任务，由正常 tick 消费 */
const pendingJobs: PendingJob[] = [];

// ═══════════════════════════════════════
//  自定义命令（成员可用，不需要 OP）
// ═══════════════════════════════════════

/**
 * permissionLevel: Any    -> 权限等级 0，任何玩家都能执行
 * cheatsRequired: false   -> 世界未开作弊也能用
 *
 * 注意：必须在 startup（早执行）阶段注册，且只能在模块顶层同步完成。
 */
try {
    system.beforeEvents.startup.subscribe((ev) => {
        const reg = ev.customCommandRegistry;

        const defs: Array<{ name: string; description: string; action: Action }> = [
            { name: 'vm:menu', description: '打开连锁采集设置菜单', action: 'menu' },
            { name: 'vm:toggle', description: '开启/关闭连锁采集', action: 'toggle' },
            { name: 'vm:add', description: '把注视的方块加入白名单', action: 'add' },
        ];

        for (const def of defs) {
            try {
                reg.registerCommand(
                    {
                        name: def.name,
                        description: def.description,
                        permissionLevel: CommandPermissionLevel.Any,
                        cheatsRequired: false,
                    },
                    (origin) => {
                        const src = origin.sourceEntity;
                        // 不用 instanceof：脚本重载后 Player 实例可能来自旧模块，判断会失败
                        const isPlayer = !!src && src.typeId === 'minecraft:player';

                        console.warn(
                            `[VMT] cmd=${def.name} source=${origin.sourceType} entity=${src ? src.typeId : 'none'}`,
                        );

                        if (!isPlayer || !src) {
                            return { status: CustomCommandStatus.Failure };
                        }

                        // 命令回调处于 restricted execution，连 system.run / runTimeout 都可能
                        // 继承该上下文。这里只入队，真正的执行交给下面的 tick 消费循环。
                        pendingJobs.push({ playerId: src.id, action: def.action });
                        return { status: CustomCommandStatus.Success };
                    },
                );
            } catch (error) {
                // 单个命令注册失败不影响其他命令
                console.warn(`[VMT] register ${def.name} failed: ${error}`);
            }
        }
    });
} catch (error) {
    // 旧版本没有 startup / customCommandRegistry，退回 scriptevent
    console.warn(`[VMT] custom command registration unavailable: ${error}`);
}

/**
 * 独立 tick 循环消费队列。
 * 这个 interval 是在模块加载的常规上下文中注册的，回调绝对不在 restricted execution 里，
 * 所以 show() / setActionBar() / playSound 都可以正常调用。
 */
system.runInterval(() => {
    if (pendingJobs.length === 0) return;

    const job = pendingJobs.shift();
    if (!job) return;

    const player = world.getAllPlayers().find(p => p.id === job.playerId);
    if (!player) return;

    console.warn(`[VMT] consume action=${job.action} player=${job.playerId}`);

    try {
        runAction(player, job.action);
    } catch (error) {
        console.warn(`[VMT] queued action failed: ${error}`);
    }
}, 1);

// ═══════════════════════════════════════
//  scriptEvent 监听（兼容旧接口）
// ═══════════════════════════════════════

system.afterEvents.scriptEventReceive.subscribe(
    (event: ScriptEventCommandMessageAfterEvent) => {
        try {
            if (event.sourceType !== ScriptEventSource.Entity) return;
            const entity = event.sourceEntity;
            if (!entity || !(entity instanceof Player)) return;

            const id = event.id;

            if (id === 'vm:t' || id === 'veinminer:toggle') {
                runAction(entity, 'toggle');
            } else if (id === 'vm:s' || id === 'veinminer:settings') {
                runAction(entity, 'menu');
            } else if (id === 'vm:a' || id === 'veinminer:addblock') {
                runAction(entity, 'add');
            }
        } catch (error) {
            console.warn(`[VMT] scriptevent error: ${error}`);
        }
    },
    { namespaces: ['vm', 'veinminer'] },
);

// ═══════════════════════════════════════
//  进服初始化
// ═══════════════════════════════════════

system.run(() => {
    for (const player of world.getAllPlayers()) {
        player.onScreenDisplay.setActionBar([
            rawtext(TAG + ' §a'),
            t('veinminer.tip.loaded', player),
            rawtext(' §7| §f'),
            t('veinminer.tip.sneak_mine', player),
        ]);
    }
});
