/**
 * main.ts -- VeinMinerTurbo Behavior Pack Entry
 *
 * 交互方式（没有物品、没有额外 UI 入口）:
 *   - 潜行 + 破坏方块 -> 连锁挖矿
 *   - /scriptevent vm:s -> 打开设置
 *   - /scriptevent vm:t -> 开关
 *   - /scriptevent vm:a -> 添加注视方块到白名单
 *
 */

import {
    world, system, Player,
    ScriptEventSource, ScriptEventCommandMessageAfterEvent,
} from '@minecraft/server';
import { registerVeinMiner } from './core';
import { showSettings } from './ui/VeinMinerUI';
import { getPlayerToggle, setPlayerToggle } from './config';
import { addToWhitelist } from './ui/WhiteListManager';
import { t, tf1, tagged, rawtext, TAG } from './utils/LangHelper';

/** 脚本加载标记：日志里出现这一行，说明模块已成功解析并运行 */
console.log('[VMT] VeinMinerTurbo scripts loaded');

/** 切换开关并广播状态 */
function toggleVeinMiner(player: Player): void {
    const next = !getPlayerToggle(player);
    setPlayerToggle(player, next);

    player.onScreenDisplay.setActionBar([
        rawtext(TAG + ' '),
        t(next ? 'veinminer.tip.on' : 'veinminer.tip.off', player),
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
                            ? [rawtext(TAG + ' §a'), tf1('veinminer.tip.added', '§f' + blockName, entity)]
                            : [rawtext(TAG + ' §c' + blockName + ' '), t('veinminer.tip.already', entity)],
                    );
                } else {
                    entity.sendMessage(tagged('veinminer.tip.not_looking', entity));
                }
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
