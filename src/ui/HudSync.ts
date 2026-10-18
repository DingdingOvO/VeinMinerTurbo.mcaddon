/**
 * HudSync.ts — 把开关状态推送到 JSON UI
 *
 * 原理：JSON UI 只能读取客户端提供的绑定值，脚本无法直接写 UI 变量。
 * 因此借用 title 文本作为"数据通道"：
 *   - setTitle() 是 Script API，不需要 OP / 命令权限（runCommand('title') 普通玩家会失败）
 *   - stayDuration: 1 tick，肉眼几乎不可见
 *   - UI 侧绑定 #hud_title_text_string，比较 'vm:1' / 'vm:0' 切换按钮文案与颜色
 */

import { Player } from '@minecraft/server';

export const HUD_ON = 'vm:1';
export const HUD_OFF = 'vm:0';

/** 静默推送当前开关状态到 HUD */
export function syncHud(player: Player, enabled: boolean): void {
    try {
        player.onScreenDisplay.setTitle(enabled ? HUD_ON : HUD_OFF, {
            fadeInDuration: 0,
            stayDuration: 1,
            fadeOutDuration: 0,
        });
    } catch {
        // 玩家正在退出 / 未加载，忽略
    }
}
