/**
 * ChatHandler.ts -- 聊天命令处理
 *
 * 命令:
 *   #vm        -> 打开设置
 *   #vm on     -> 开启连锁挖矿
 *   #vm off    -> 关闭连锁挖矿
 *   #vm reload -> 热重载配置
 */

import { world } from '@minecraft/server';
import {
    setPlayerToggle,
    CHAT_PREFIX,
} from '../config';
import { showSettings } from './VeinMinerUI';

export function registerChatHandler(): void {
    // chatSend 在 beforeEvents 上（可 cancel 消息）
    const beforeEvents = world.beforeEvents as unknown as Record<string, { subscribe: (cb: (e: { message: string; sender: import('@minecraft/server').Player; cancel: boolean }) => void) => void }>;
    const chatSend = beforeEvents['chatSend'];

    if (!chatSend) {
        console.warn('[VM] chatSend 事件不可用，请使用 /scriptevent veinminer:settings');
        return;
    }

    chatSend.subscribe((event) => {
        try {
            const message = event.message.trim();
            if (!message.startsWith(CHAT_PREFIX)) return;

            // 隐藏 #vm 命令，不让它显示在聊天里
            event.cancel = true;

            const sender = event.sender;
            const args = message.slice(CHAT_PREFIX.length).trim();

            if (args === '' || args === 'set' || args === 'settings') {
                showSettings(sender);
            } else if (args === 'on') {
                setPlayerToggle(sender, true);
                sender.onScreenDisplay.setActionBar('§8[VM]§r §a连锁挖矿已开启');
            } else if (args === 'off') {
                setPlayerToggle(sender, false);
                sender.onScreenDisplay.setActionBar('§8[VM]§r §c连锁挖矿已关闭');
            } else if (args === 'reload') {
                console.warn('[VM] 聊天请求重载配置');
                sender.onScreenDisplay.setActionBar('§8[VM]§r §a配置已重载');
            } else {
                sender.onScreenDisplay.setActionBar(
                    '§8[VM]§r §7#vm §f设置 §7| §f#vm on §7| §f#vm off §7| §f#vm reload',
                );
            }
        } catch (error) {
            console.warn(`[VM] 聊天命令错误: ${error}`);
        }
    });
}