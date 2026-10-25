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
                        if (!(src instanceof Player)) {
                            return { status: CustomCommandStatus.Failure };
                        }
                        // 命令回调运行在 restricted execution 模式下，
                        // show() / setActionBar() 等原生函数在这里会抛错，必须推迟到下一 tick
                        const player = src;
                        const action = def.action;
                        system.runTimeout(() => runAction(player, action), 1);
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
