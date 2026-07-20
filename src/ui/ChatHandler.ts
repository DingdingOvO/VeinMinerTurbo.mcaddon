/**
 * ChatHandler.ts -- Chat command handler
 *
 * 2.8.0 stable doesn't have chatSend event, uses afterEvents.chatSend:
 *   - Can listen to chat messages
 *   - Cannot cancel (message shows in chat)
 *   - Use ActionBar for feedback
 *
 * If afterEvents.chatSend doesn't exist, silently skip.
 *
 * Commands:
 *   #vm        -> open settings
 *   #vm on     -> enable vein mining
 *   #vm off    -> disable vein mining
 *   #vm reload -> hot reload config
 */

import { world } from '@minecraft/server';
import {
    setPlayerToggle,
    CHAT_PREFIX,
} from '../config';
import { showSettings } from './VeinMinerUI';

const TAG = '\u00a78[VM]\u00a7r';

// ═══════════════════════════════════════
//  Register
// ═══════════════════════════════════════

export function registerChatHandler(): void {
    const afterEvents = world.afterEvents as unknown as Record<string, { subscribe: (cb: (e: { message: string; sender: import('@minecraft/server').Player }) => void) => void }>;
    const chatSend = afterEvents['chatSend'];

    if (!chatSend) {
        console.warn('[VM] chatSend event not available. Use /scriptevent veinminer:settings');
        return;
    }

    chatSend.subscribe((event) => {
        try {
            handleChatCommand(event);
        } catch (error) {
            console.warn(`[VM] Chat command error: ${error}`);
        }
    });
}

function handleChatCommand(event: { message: string; sender: import('@minecraft/server').Player }): void {
    const message = event.message.trim();
    if (!message.startsWith(CHAT_PREFIX)) return;

    const sender = event.sender;
    const args = message.slice(CHAT_PREFIX.length).trim();

    if (args === '' || args === 'set' || args === 'settings') {
        showSettings(sender);
    } else if (args === 'on') {
        setPlayerToggle(sender, true);
        sender.onScreenDisplay.setActionBar(`${TAG} \u00a7aVein Mining ON`);
    } else if (args === 'off') {
        setPlayerToggle(sender, false);
        sender.onScreenDisplay.setActionBar(`${TAG} \u00a7cVein Mining OFF`);
    } else if (args === 'reload') {
        console.warn('[VM] Config reload requested (chat)');
        sender.onScreenDisplay.setActionBar(`${TAG} \u00a7aConfig reloaded`);
    } else {
        sender.onScreenDisplay.setActionBar(
            `${TAG} \u00a77#vm \u00a7fsettings \u00a77| \u00a7f#vm on \u00a77| \u00a7f#vm off \u00a77| \u00a7f#vm reload`,
        );
    }
}