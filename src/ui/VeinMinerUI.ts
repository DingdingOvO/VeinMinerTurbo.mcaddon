/**
 * VeinMinerUI.ts -- 设置表单（ModalFormData）
 *
 * @minecraft/server-ui 2.x：toggle/slider 用 options 对象传默认值。
 * 注意：label 不产生 formValues，下表 IDX 只统计会产出值的控件。
 *
 * 触发: /vm:c menu（或 /vm:c 不带参数）
 */

import { Player, system } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
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
} from '../config';
import {
    getWhitelist, clearWhitelist, formatWhitelist,
} from '../data/Whitelist';
import { t, tf1, tagged } from '../utils/LangHelper';

// ═══════════════════════════════════════
//  设置表单
// ═══════════════════════════════════════

export async function showSettings(player: Player): Promise<void> {
    try {
        const toggle = getPlayerToggle(player);
        const maxVein = getPlayerMaxVein(player);
        const maxDepth = getPlayerMaxDepth(player);
        const dur = getPlayerDurabilityGuard(player);
        const outlineOn = getPlayerOutline(player);
        const wlItems = getWhitelist(player);

        const collect = getPlayerCollectDrops(player);
        const leaves = getPlayerAutoLeaves(player);

        const size = getPlayerCubeSize(player);

        const IDX = {
            TOGGLE: 0,
            MAX_VEIN: 1,
            SIZE_X: 2,
            SIZE_Y: 3,
            SIZE_Z: 4,
            MAX_DEPTH: 5,
            DURABILITY: 6,
            OUTLINE: 7,
            CLEAR_WL: 8,
            COLLECT: 9,
            AUTO_LEAVES: 10,
        };

        const form = new ModalFormData()
            .title(t('veinminer.ui.title', player))
            .toggle(t('veinminer.ui.toggle', player), { defaultValue: toggle })
            .slider(t('veinminer.ui.max_vein', player), 1, 256, {
                defaultValue: maxVein,
                valueStep: 1,
            })
            .slider(t('veinminer.ui.size_x', player), CUBE_SIZE_MIN, CUBE_SIZE_MAX, {
                defaultValue: size.x,
                valueStep: 1,
                tooltip: t('veinminer.ui.size_x_tip', player),
            })
            .slider(t('veinminer.ui.size_y', player), CUBE_SIZE_MIN, CUBE_SIZE_MAX, {
                defaultValue: size.y,
                valueStep: 1,
                tooltip: t('veinminer.ui.size_y_tip', player),
            })
            .slider(t('veinminer.ui.size_z', player), CUBE_SIZE_MIN, CUBE_SIZE_MAX, {
                defaultValue: size.z,
                valueStep: 1,
                tooltip: t('veinminer.ui.size_z_tip', player),
            })
            .slider(t('veinminer.ui.max_depth', player), 1, 32, {
                defaultValue: maxDepth,
                valueStep: 1,
            })
            .toggle(t('veinminer.ui.durability_full', player), { defaultValue: dur })
            .toggle(t('veinminer.ui.outline', player), { defaultValue: outlineOn });

        if (wlItems.length === 0) {
            form.label(t('veinminer.ui.whitelist_label_empty', player));
        } else {
            form.label(tf1('veinminer.ui.whitelist_label', formatWhitelist(wlItems), player));
        }

        form.toggle(t('veinminer.ui.whitelist.clear', player), { defaultValue: false });
        form.toggle(t('veinminer.ui.collect_drops_full', player), { defaultValue: collect });
        form.toggle(t('veinminer.ui.auto_leaves_full', player), { defaultValue: leaves });

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
        setPlayerCubeSize(player, {
            x: v[IDX.SIZE_X] as number,
            y: v[IDX.SIZE_Y] as number,
            z: v[IDX.SIZE_Z] as number,
        });
        setPlayerMaxDepth(player, v[IDX.MAX_DEPTH] as number);
        setPlayerDurabilityGuard(player, v[IDX.DURABILITY] as boolean);
        setPlayerOutline(player, v[IDX.OUTLINE] as boolean);

        if (v[IDX.CLEAR_WL] as boolean) {
            clearWhitelist(player);
        }

        setPlayerCollectDrops(player, v[IDX.COLLECT] as boolean);
        setPlayerAutoLeaves(player, v[IDX.AUTO_LEAVES] as boolean);

        player.sendMessage(tagged('veinminer.ui.saved', player));
    } catch (error) {
        console.warn(`[VMT] settings form error: ${error}`);
        player.sendMessage(tagged('veinminer.tip.settings_error', player));
    }
}
