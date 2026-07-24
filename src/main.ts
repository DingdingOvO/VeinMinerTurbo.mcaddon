/**
 * main.ts -- VeinMinerTurbo Behavior Pack Entry
 *
 * 触发方式:
 *   - 潜行 + 破坏方块 -> 连锁挖矿
 *   - /scriptevent vm:s -> 打开设置
 *   - /scriptevent vm:t -> 开关
 *   - /scriptevent vm:a -> 添加注视方块到白名单
 */

import { world, system, Player, ScriptEventSource, ScriptEventCommandMessageAfterEvent } from '@minecraft/server';
import { registerVeinMiner } from './core';
import { showSettings } from './ui/VeinMinerUI';
import { getPlayerToggle, setPlayerToggle } from './config';
import { addToWhitelist } from './ui/WhiteListManager';
import { t, tf1, tagged, rawtext, TAG } from './utils/LangHelper';

// ═══════════════════════════════════════
//  HUD 同步：通过 title 文本驱动 JSON UI 绑定
// ═══════════════════════════════════════

/** 向 HUD 推送开关状态。title 文本 'vm:1' / 'vm:0' 会被 JSON UI 绑定读取 */
export function syncHud(player: Player, enabled: boolean): void {
    player.runCommand(`title @s title ${enabled ? 'vm:1' : 'vm:0'}`);
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
                const next = !getPlayerToggle(entity);
                setPlayerToggle(entity, next);
                syncHud(entity, next);
                entity.onScreenDisplay.setActionBar(
                    [rawtext(TAG + ' '), t(next ? 'veinminer.tip.on' : 'veinminer.tip.off')],
                );
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

system.run(() => {
    for (const player of world.getAllPlayers()) {
        syncHud(player, getPlayerToggle(player));
        player.onScreenDisplay.setActionBar(
            [rawtext(TAG + ' §a'), t('veinminer.tip.loaded'), rawtext(' §7| §f'), t('veinminer.tip.sneak_mine')],
        );
    }
});

// 玩家首次进入世界时同步 HUD
world.afterEvents.playerSpawn.subscribe((ev) => {
    if (ev.initialSpawn) {
        system.run(() => {
            syncHud(ev.player, getPlayerToggle(ev.player));
        });
    }
});