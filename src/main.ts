/**
 * main.ts -- VeinMiner Behavior Pack Entry
 *
 * 触发方式:
 *   - 潜行 + 破坏方块 -> 连锁挖矿
 *   - 聊天 #vm       -> 打开设置
 *   - 聊天 #vm on/off -> 开关
 *   - /scriptevent vm:s -> 设置
 *   - /scriptevent vm:t -> 开关
 *   - /scriptevent vm:a -> 添加注视方块到白名单
 */

import { world, system, Player, ScriptEventSource, ScriptEventCommandMessageAfterEvent } from '@minecraft/server';
import { registerVeinMiner } from './core';
import { registerChatHandler } from './ui/ChatHandler';
import { showSettings } from './ui/VeinMinerUI';
import { getPlayerToggle, setPlayerToggle } from './config';
import { CHAT_PREFIX } from './config';
import { addToWhitelist } from './ui/WhiteListManager';

// ═══════════════════════════════════════
//  启动
// ═══════════════════════════════════════

console.warn('[VM] VeinMiner v0.0.2 启动中...');

registerVeinMiner();
registerChatHandler();

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
                entity.onScreenDisplay.setActionBar(
                    `§8[VM]§r ${next ? '§a连锁挖矿已开启' : '§c连锁挖矿已关闭'}`,
                );
            // vm:s = settings
            } else if (id === 'vm:s' || id === 'veinminer:settings') {
                showSettings(entity);
            // vm:a = add block
            } else if (id === 'vm:a' || id === 'veinminer:addblock') {
                const hit = entity.getBlockFromViewDirection({ maxDistance: 6 });
                if (hit && hit.block) {
                    const added = addToWhitelist(entity, hit.block.typeId);
                    entity.sendMessage(
                        added
                            ? `§8[VM] §a已添加 §f${hit.block.typeId.replace(/^minecraft:/, '')}`
                            : `§8[VM] §c${hit.block.typeId.replace(/^minecraft:/, '')} 已在白名单中`,
                    );
                } else {
                    entity.sendMessage('§8[VM] §c没有注视任何方块');
                }
            }
        } catch (error) {
            console.warn(`[VM] scriptEvent 错误: ${error}`);
        }
    },
    { namespaces: ['vm', 'veinminer'] },
);

console.warn('[VM] 启动完成');

system.run(() => {
    for (const player of world.getAllPlayers()) {
        player.onScreenDisplay.setActionBar(
            `§8[VM]§r §a已加载 §7| §f潜行+挖掘 §7| §f${CHAT_PREFIX} 设置`,
        );
    }
});