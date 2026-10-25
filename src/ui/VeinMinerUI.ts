/**
 * VeinMinerUI.ts -- 设置表单（ModalFormData）
 *
 * @minecraft/server-ui 2.x：toggle/slider 用 options 对象传默认值。
 * 注意：label 不产生 formValues，下表 IDX 只统计会产出值的控件。
 *
 * 触发: /scriptevent vm:s，或使用「连锁采集遥控器」潜行 + 使用
 */

import { Player, PlayerPermissionLevel, system } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import {
    getPlayerToggle, setPlayerToggle,
    getPlayerMaxVein, setPlayerMaxVein,
    getPlayerAutoLeaves, setPlayerAutoLeaves,
    getPlayerCollectDrops, setPlayerCollectDrops,
    getPlayerMaxDepth, setPlayerMaxDepth,
    getPlayerDurabilityGuard, setPlayerDurabilityGuard,
} from '../config';
import {
    getWhitelist, clearWhitelist, formatWhitelist,
} from './WhiteListManager';
import { t, tf1, tagged } from '../utils/LangHelper';

// ═══════════════════════════════════════
//  OP 判断
// ═══════════════════════════════════════

function isOp(player: Player): boolean {
    try {
        return player.playerPermissionLevel >= PlayerPermissionLevel.Operator;
    } catch {
        return false;
    }
}

// ═══════════════════════════════════════
//  设置表单
// ═══════════════════════════════════════

export async function showSettings(player: Player): Promise<void> {
    try {
        const op = isOp(player);

        const toggle = getPlayerToggle(player);
        const maxVein = getPlayerMaxVein(player);
        const maxDepth = getPlayerMaxDepth(player);
        const dur = getPlayerDurabilityGuard(player);
        const wlItems = getWhitelist(player);

        let collect = false;
        let leaves = false;
        if (op) {
            collect = getPlayerCollectDrops(player);
            leaves = getPlayerAutoLeaves(player);
        }

        const IDX = {
            TOGGLE: 0,
            MAX_VEIN: 1,
            MAX_DEPTH: 2,
            DURABILITY: 3,
            CLEAR_WL: 4,
            COLLECT: 5,
            AUTO_LEAVES: 6,
        };

        const form = new ModalFormData()
            .title(t('veinminer.ui.title', player))
            .toggle(t('veinminer.ui.toggle', player), { defaultValue: toggle })
            .slider(t('veinminer.ui.max_vein', player), 1, 256, {
                defaultValue: maxVein,
                valueStep: 1,
            })
            .slider(t('veinminer.ui.max_depth', player), 1, 32, {
                defaultValue: maxDepth,
                valueStep: 1,
            })
            .toggle(t('veinminer.ui.durability_full', player), { defaultValue: dur });

        if (wlItems.length === 0) {
            form.label(t('veinminer.ui.whitelist_label_empty', player));
        } else {
            form.label(tf1('veinminer.ui.whitelist_label', formatWhitelist(wlItems), player));
        }

        form.toggle(t('veinminer.ui.whitelist.clear', player), { defaultValue: false });

        if (op) {
            form.toggle(t('veinminer.ui.collect_drops_full', player), { defaultValue: collect });
            form.toggle(t('veinminer.ui.auto_leaves_full', player), { defaultValue: leaves });
        }

        const response = await form.show(player);

        if (response.canceled) {
            if (response.cancelationReason === 'UserBusy') {
                system.runTimeout(() => showSettings(player), 10);
            }
            return;
        }

        const v = response.formValues;
        if (!v) return;

        const nextToggle = v[IDX.TOGGLE] as boolean;
        setPlayerToggle(player, nextToggle);

        setPlayerMaxVein(player, v[IDX.MAX_VEIN] as number);
        setPlayerMaxDepth(player, v[IDX.MAX_DEPTH] as number);
        setPlayerDurabilityGuard(player, v[IDX.DURABILITY] as boolean);

        if (v[IDX.CLEAR_WL] as boolean) {
            clearWhitelist(player);
        }

        if (op) {
            setPlayerCollectDrops(player, v[IDX.COLLECT] as boolean);
            setPlayerAutoLeaves(player, v[IDX.AUTO_LEAVES] as boolean);
        }

        player.sendMessage(tagged('veinminer.ui.saved', player));
    } catch (error) {
        console.warn(`[VMT] settings form error: ${error}`);
        player.sendMessage(tagged('veinminer.tip.settings_error', player));
    }
}
