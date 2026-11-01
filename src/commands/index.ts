/**
 * index.ts — 命令路由
 *
 * 命令名只负责把请求分到对应模块，具体实现各管各的。
 */

import { Player } from '@minecraft/server';
import { isPlayerBanned } from '../config/admin/PlayerBlacklist';
import { chat, isOp } from './shared';
import { runWhitelist } from './whitelist';
import { runSettings } from './settings';
import { runAdmin } from './admin';
import { runHelp } from './help';

export type ModuleId = 'wl' | 'cfg' | 'ad' | 'help';

export function runAction(player: Player, module: ModuleId, args: string[]): void {
    // 玩家黑名单：整条命令线都不响应（OP 例外，方便自救）
    if (isPlayerBanned(player) && !isOp(player)) {
        chat(player, '§c你已被管理员禁止使用连锁采集');
        return;
    }

    switch (module) {
        case 'wl': return runWhitelist(player, args);
        case 'cfg': return runSettings(player, args);
        case 'ad': return runAdmin(player, args);
        case 'help': return runHelp(player, args);
    }
}
