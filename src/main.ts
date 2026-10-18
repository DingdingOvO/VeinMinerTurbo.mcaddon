/**
 * main.ts -- VeinMinerTurbo Behavior Pack Entry
 *
 * 触发方式:
 *   - 潜行 + 破坏方块 -> 连锁挖矿
 *   - 连锁采集遥控器（vm:remote）  使用 -> 开关；潜行 + 使用 -> 设置
 *   - /scriptevent vm:s -> 打开设置
 *   - /scriptevent vm:t -> 开关
 *   - /scriptevent vm:a -> 添加注视方块到白名单
 */

import {
    world, system, Player, ItemStack,
    ScriptEventSource, ScriptEventCommandMessageAfterEvent,
} from '@minecraft/server';
import { registerVeinMiner } from './core';
import { showSettings } from './ui/VeinMinerUI';
import { getPlayerToggle, setPlayerToggle } from './config';
import { addToWhitelist } from './ui/WhiteListManager';
import { syncHud } from './ui/HudSync';
import { t, tf1, tagged, rawtext, TAG } from './utils/LangHelper';

const REMOTE_ID = 'vm:remote';

/** 切换开关并广播状态 */
function toggleVeinMiner(player: Player): void {
    const next = !getPlayerToggle(player);
    setPlayerToggle(player, next);
    syncHud(player, next);

    player.onScreenDisplay.setActionBar([
        rawtext(TAG + ' '),
        t(next ? 'veinminer.tip.on' : 'veinminer.tip.off'),
    ]);
}

registerVeinMiner();

// ═══════════════════════════════════════
//  scriptEvent 监听 (vm: 短命名)
// ═══════════════════════════════════════

system.afterEvents.scriptEventReceive.subscribe(
    (event: ScriptEventCommandMessageAfterEvent) => {
        try {
            if (event.sourceType !== ScriptEventSource.Entity) return;
            const entity = event.sourceEntity;
            if (!entity || !(entity instanceof Player)) return;

            const id = event.id;

            // vm:t = toggle
            if (id === 'vm:t' || id === 'veinminer:toggle') {
                toggleVeinMiner(entity);
            // vm:s = settings
            } else if (id === 'vm:s' || id === 'veinminer:settings') {
                showSettings(entity);
            // vm:a = add block
            } else if (id === 'vm:a' || id === 'veinminer:addblock') {
                const hit = entity.getBlockFromViewDirection({ maxDistance: 6 });
                if (hit && hit.block) {
                    const added = addToWhitelist(entity, hit.block.typeId);
                    const blockName = hit.block.typeId.replace(/^minecraft:/, '');
                    entity.sendMessage(
                        added
                            ? [rawtext(TAG + ' §a'), tf1('veinminer.tip.added', '§f' + blockName)]
                            : [rawtext(TAG + ' §c' + blockName + ' '), t('veinminer.tip.already')],
                    );
                } else {
                    entity.sendMessage(tagged('veinminer.tip.not_looking'));
                }
            }
        } catch (error) {
            console.warn(`[VMT] scriptevent error: ${error}`);
        }
    },
    { namespaces: ['vm', 'veinminer'] },
);

// ═══════════════════════════════════════
//  遥控器物品
// ═══════════════════════════════════════

world.afterEvents.itemUse.subscribe((ev) => {
    try {
        if (ev.itemStack?.typeId !== REMOTE_ID) return;
        const player = ev.source;

        if (player.isSneaking) {
            showSettings(player);
        } else {
            toggleVeinMiner(player);
        }
    } catch (error) {
        console.warn(`[VMT] item use error: ${error}`);
    }
});

// ═══════════════════════════════════════
//  进服初始化
// ═══════════════════════════════════════

system.run(() => {
    for (const player of world.getAllPlayers()) {
        syncHud(player, getPlayerToggle(player));
        player.onScreenDisplay.setActionBar([
            rawtext(TAG + ' §a'),
            t('veinminer.tip.loaded'),
            rawtext(' §7| §f'),
            t('veinminer.tip.sneak_mine'),
        ]);

        // 首次安装时给一个遥控器（仅当背包里没有时）
        grantRemoteOnce(player);
    }
});

world.afterEvents.playerSpawn.subscribe((ev) => {
    if (!ev.initialSpawn) return;
    system.run(() => {
        syncHud(ev.player, getPlayerToggle(ev.player));
        grantRemoteOnce(ev.player);
    });
});

/** 背包里没有遥控器时补发一个，避免玩家找不到入口 */
function grantRemoteOnce(player: Player): void {
    try {
        const inv = player.getComponent('inventory')?.container;
        if (!inv) return;

        for (let i = 0; i < inv.size; i++) {
            if (inv.getItem(i)?.typeId === REMOTE_ID) return;
        }

        inv.addItem(new ItemStack(REMOTE_ID, 1));
    } catch {
        // 背包满 / 未加载，忽略
    }
}
