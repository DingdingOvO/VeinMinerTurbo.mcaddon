/**
 * main.ts -- VeinMiner Behavior Pack Entry
 *
 * Triggers:
 *   - Sneak + break block -> vein mining
 *   - Chat #vm       -> open settings
 *   - Chat #vm on/off -> toggle
 *   - Chat #vm reload -> hot reload
 *   - /scriptevent veinminer:toggle   -> toggle
 *   - /scriptevent veinminer:settings -> settings
 *   - /scriptevent veinminer:reload   -> hot reload
 */

import { world, system, Player, ScriptEventSource, ScriptEventCommandMessageAfterEvent } from '@minecraft/server';
import { registerVeinMiner } from './core';
import { registerChatHandler } from './ui/ChatHandler';
import { showSettings } from './ui/VeinMinerUI';
import { getPlayerToggle, setPlayerToggle } from './config';
import { CHAT_PREFIX } from './config';

// ═══════════════════════════════════════
//  Startup
// ═══════════════════════════════════════

console.warn('[VM] VeinMiner v0.3.2 starting...');

registerVeinMiner();
registerChatHandler();

// ═══════════════════════════════════════
//  scriptEvent listener
// ═══════════════════════════════════════

system.afterEvents.scriptEventReceive.subscribe(
    (event: ScriptEventCommandMessageAfterEvent) => {
        try {
            if (event.sourceType !== ScriptEventSource.Entity) return;
            const entity = event.sourceEntity;
            if (!entity || !(entity instanceof Player)) return;

            const id = event.id;

            if (id === 'veinminer:toggle') {
                const next = !getPlayerToggle(entity);
                setPlayerToggle(entity, next);
                entity.onScreenDisplay.setActionBar(
                    `[VM] ${next ? 'Vein Mining ON' : 'Vein Mining OFF'}`,
                );
            } else if (id === 'veinminer:settings') {
                showSettings(entity);
            } else if (id === 'veinminer:reload') {
                console.warn('[VM] Config reload requested (player)');
                entity.onScreenDisplay.setActionBar('[VM] Config reloaded');
            }
        } catch (error) {
            console.warn(`[VM] scriptEvent error: ${error}`);
        }
    },
    { namespaces: ['veinminer'] },
);

console.warn('[VM] Started');

// Online player notification
system.run(() => {
    for (const player of world.getAllPlayers()) {
        player.onScreenDisplay.setActionBar(
            `[VM] Loaded | Sneak+Mine | ${CHAT_PREFIX} settings`,
        );
    }
});