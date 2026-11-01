/**
 * settings.ts — /vm:c  玩家设置
 *
 *   toggle|t   连锁开关
 *   outline|o  描边开关
 *   menu|m     打开设置菜单（默认）
 */

import { Player } from '@minecraft/server';
import { getPlayerToggle, setPlayerToggle, getPlayerOutline, setPlayerOutline } from '../config';
import { showMainMenu } from '../ui/Menu';
import { t } from '../utils/LangHelper';
import { bar } from './shared';

export function runSettings(player: Player, args: string[]): void {
    const sub = (args[0] ?? '').toLowerCase();

    if (sub === 'toggle' || sub === 't') {
        const next = !getPlayerToggle(player);
        setPlayerToggle(player, next);
        bar(player, t(next ? 'veinminer.tip.on' : 'veinminer.tip.off', player));
        return;
    }

    if (sub === 'outline' || sub === 'o') {
        const next = !getPlayerOutline(player);
        setPlayerOutline(player, next);
        bar(player, `轮廓预览 ${next ? '§a开' : '§c关'}`);
        return;
    }

    if (sub === 'menu' || sub === 'm' || sub === '') {
        void showMainMenu(player);
        return;
    }

    bar(player, '§c用法: /vm:c <toggle|outline|menu> §7· /vm:help c');
}
