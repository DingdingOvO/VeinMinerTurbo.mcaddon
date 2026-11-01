/**
 * Menu.ts — 设置菜单
 *
 * 三块：
 *   1. 首页：ActionFormData，按钮带原版图标（镐子 / 齿轮 / 书本 / 对勾）
 *   2. 设置：交给 Ddui.ts 用 CustomForm 排版；那条路走不通时退回一页式 ModalFormData
 *   3. 白名单：一行一个方块，左边物品图标，右边 ✕
 *
 * 图标全部用原版贴图 textures/ui/xxx，不需要额外资源包。
 */

import { Player, system } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import {
    getPlayerToggle, setPlayerToggle,
    getPlayerMaxVein, setPlayerMaxVein,
    getPlayerAutoLeaves, setPlayerAutoLeaves,
    getPlayerCollectDrops, setPlayerCollectDrops,
    getPlayerMaxDepth, setPlayerMaxDepth,
    getPlayerDurabilityGuard, setPlayerDurabilityGuard,
    getPlayerOutline, setPlayerOutline,
    getPlayerCubeSize, setPlayerCubeSize,
    CUBE_SIZE_MIN, CUBE_SIZE_MAX,
    HARD_MAX_VEIN,
} from '../config';
import { getWhitelist, clearWhitelist, removeFromWhitelist } from '../data/Whitelist';
import { blockName } from '../data/BlockNames';
import { blockIcon } from '../data/BlockIcons';
import { t, tagged } from '../utils/LangHelper';
import { showSettingsDdui } from './Ddui';

/** 原版 UI 贴图（全部核对过文件存在，写错路径会显示不出图标） */
const ICON = {
    pickaxe: 'textures/ui/icon_iron_pickaxe',
    settings: 'textures/ui/gear',
    whitelist: 'textures/ui/icon_book_writable',
    trash: 'textures/ui/icon_trash',
    close: 'textures/ui/check',
};

/** 关掉当前表单再开下一个，直接连开会撞 UserBusy */
function reopen(player: Player, next: (p: Player) => Promise<void>): void {
    system.runTimeout(() => {
        void next(player).catch((e) => console.warn(`[VMT] menu: ${e}`));
    }, 4);
}

// ═══════════════════════════════════════
//  首页
// ═══════════════════════════════════════

export async function showMainMenu(player: Player): Promise<void> {
    const on = getPlayerToggle(player);
    const size = getPlayerCubeSize(player);
    const wl = getWhitelist(player).length;

    const form = new ActionFormData()
        .title(t('veinminer.ui.menu.title', player))
        .body([
            '§8潜行 + 挖掘  触发连锁',
            '',
            `§7状态  ${on ? '§a已开启' : '§c已关闭'}`,
            `§7范围  §f${size.x}×${size.y}×${size.z}    §7白名单  §f${wl} 种`,
        ].join('\n'));

    form.button(`${on ? '§a' : '§c'}连锁采集  §7${on ? '已开启' : '已关闭'}`, ICON.pickaxe);
    form.button('§f设置\n§8范围 · 上限 · 行为 · 描边', ICON.settings);
    form.button(`§f白名单 §7(${wl})\n§8查看与删除`, ICON.whitelist);
    form.button('§8关闭', ICON.close);

    const res = await form.show(player);
    if (res.canceled || res.selection === undefined) return;

    switch (res.selection) {
        case 0: {
            const next = !getPlayerToggle(player);
            setPlayerToggle(player, next);
            player.sendMessage(tagged(next ? 'veinminer.tip.on' : 'veinminer.tip.off', player));
            reopen(player, showMainMenu);
            return;
        }
        case 1: {
            // 优先用 DDUI 排版；不可用时退回老的一页式表单
            const done = await showSettingsDdui(player);
            if (!done) reopen(player, showSettingsFallback);
            return;
        }
        case 2: return reopen(player, showWhitelistPage);
        default: return;
    }
}

// ═══════════════════════════════════════
//  设置（降级版：CustomForm 不可用时才用）
// ═══════════════════════════════════════

async function showSettingsFallback(player: Player): Promise<void> {
    const size = getPlayerCubeSize(player);

    const res = await new ModalFormData()
        .title(t('veinminer.ui.title', player))
        .slider(t('veinminer.ui.size_x', player), CUBE_SIZE_MIN, CUBE_SIZE_MAX, {
            defaultValue: size.x, valueStep: 1,
        })
        .slider(t('veinminer.ui.size_y', player), CUBE_SIZE_MIN, CUBE_SIZE_MAX, {
            defaultValue: size.y, valueStep: 1,
        })
        .slider(t('veinminer.ui.size_z', player), CUBE_SIZE_MIN, CUBE_SIZE_MAX, {
            defaultValue: size.z, valueStep: 1,
        })
        .slider(t('veinminer.ui.max_vein', player), 1, HARD_MAX_VEIN, {
            defaultValue: getPlayerMaxVein(player), valueStep: 1,
        })
        .slider(t('veinminer.ui.max_depth', player), 1, 32, {
            defaultValue: getPlayerMaxDepth(player), valueStep: 1,
        })
        .toggle(t('veinminer.ui.durability_full', player), { defaultValue: getPlayerDurabilityGuard(player) })
        .toggle(t('veinminer.ui.collect_drops_full', player), { defaultValue: getPlayerCollectDrops(player) })
        .toggle(t('veinminer.ui.auto_leaves_full', player), { defaultValue: getPlayerAutoLeaves(player) })
        .toggle(t('veinminer.ui.outline', player), { defaultValue: getPlayerOutline(player) })
        .submitButton(t('veinminer.ui.back', player))
        .show(player);

    if (res.canceled || !res.formValues) return;

    setPlayerCubeSize(player, {
        x: res.formValues[0] as number,
        y: res.formValues[1] as number,
        z: res.formValues[2] as number,
    });
    setPlayerMaxVein(player, res.formValues[3] as number);
    setPlayerMaxDepth(player, res.formValues[4] as number);
    setPlayerDurabilityGuard(player, res.formValues[5] as boolean);
    setPlayerCollectDrops(player, res.formValues[6] as boolean);
    setPlayerAutoLeaves(player, res.formValues[7] as boolean);
    setPlayerOutline(player, res.formValues[8] as boolean);

    player.sendMessage(tagged('veinminer.ui.saved', player));
    reopen(player, showMainMenu);
}

// ═══════════════════════════════════════
//  白名单
// ═══════════════════════════════════════

async function showWhitelistPage(player: Player): Promise<void> {
    const list = getWhitelist(player);

    // 空列表：只留一行提示和一个返回
    if (list.length === 0) {
        const empty = new ActionFormData()
            .title(t('veinminer.ui.whitelist.title', player))
            .body('§7还没有方块\n\n§8对着方块打 §f/vm:wl a §8可以添加');
        empty.button('§8返回', ICON.close);

        const r = await empty.show(player);
        if (!r.canceled) reopen(player, showMainMenu);
        return;
    }

    const form = new ActionFormData()
        .title(t('veinminer.ui.whitelist.title', player))
        .body(`§7共 §f${list.length} §7种方块\n§8点一下方块后面的 §c✕ §8即可移除`);

    // 每种方块一行：左边物品图标，右边 ✕
    for (const id of list) {
        const label = `§f${blockName(id)}   §c✕`;
        const icon = blockIcon(id);
        if (icon) form.button(label, icon);
        else form.button(label);
    }
    form.button('§c清空全部', ICON.trash);
    form.button('§8返回', ICON.close);

    const res = await form.show(player);
    if (res.canceled || res.selection === undefined) return;

    const sel = res.selection;

    // 点方块行 → 移除该方块
    if (sel < list.length) {
        removeFromWhitelist(player, list[sel]);
        player.sendMessage(`§8[§bVMT§8] §7已移除 §f${blockName(list[sel])}`);
        reopen(player, showWhitelistPage);
        return;
    }

    // 清空全部
    if (sel === list.length) {
        clearWhitelist(player);
        player.sendMessage(tagged('veinminer.ui.whitelist_cleared', player));
        reopen(player, showWhitelistPage);
        return;
    }

    reopen(player, showMainMenu);
}
