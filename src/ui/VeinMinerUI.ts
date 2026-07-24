/**
 * VeinMinerUI.ts -- 设置表单（ModalFormData）
 *
 * 使用 ModalFormData（老式表单 API），
 * toggle/slider 接收普通 boolean/number，不依赖 Observable/DDUI。
 *
 * 触发: /scriptevent vm:s
 */

import { Player, system } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import {
    getPlayerToggle, setPlayerToggle,
    getPlayerMaxVein, setPlayerMaxVein,
    getPlayerAutoLeaves, setPlayerAutoLeaves,
    getPlayerCollectDrops, setPlayerCollectDrops,
} from '../config';
import {
    getWhitelist, clearWhitelist, formatWhitelist,
} from './WhiteListManager';
import { syncHud } from '../main';
import { t, tf1, tagged } from '../utils/LangHelper';

// ═══════════════════════════════════════
//  DynamicProperties (UI 专属)
// ═══════════════════════════════════════

const KEY_MAX_DEPTH = 'veinminer_max_depth';
const KEY_DURABILITY = 'veinminer_durability';
const KEY_REPLANT = 'veinminer_replant';

const DEFAULT_MAX_DEPTH = 8;

function getMaxDepth(p: Player): number {
    const v = p.getDynamicProperty(KEY_MAX_DEPTH);
    return typeof v === 'number' ? v : DEFAULT_MAX_DEPTH;
}

function setMaxDepth(p: Player, v: number): void {
    p.setDynamicProperty(KEY_MAX_DEPTH, v);
}

function getDurability(p: Player): boolean {
    return p.getDynamicProperty(KEY_DURABILITY) !== false;
}

function setDurability(p: Player, v: boolean): void {
    p.setDynamicProperty(KEY_DURABILITY, v);
}

function getReplant(p: Player): boolean {
    return p.getDynamicProperty(KEY_REPLANT) === true;
}

function setReplant(p: Player, v: boolean): void {
    p.setDynamicProperty(KEY_REPLANT, v);
}

function isOp(player: Player): boolean {
    try {
        return (player as unknown as { isOp: () => boolean }).isOp();
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

        // 读取当前设置
        const toggle   = getPlayerToggle(player);
        const maxVein  = getPlayerMaxVein(player);
        const maxDepth = getMaxDepth(player);
        const dur      = getDurability(player);
        const repl     = getReplant(player);
        const wlItems  = getWhitelist(player);

        let collect = false;
        let leaves  = false;
        if (op) {
            collect = getPlayerCollectDrops(player);
            leaves  = getPlayerAutoLeaves(player);
        }

        // ═══════════════════════════════════════
        //  构建表单
        //  注意：label 不产生 formValues，因此用 idx 追踪实际值索引
        // ═══════════════════════════════════════
        const IDX = { TOGGLE: 0, MAX_VEIN: 1, MAX_DEPTH: 2, DURABILITY: 3, REPLANT: 4, CLEAR_WL: 5, COLLECT: 6, AUTO_LEAVES: 7 };

        const form = new ModalFormData()
            .title(t('veinminer.ui.title'))

            // IDX.TOGGLE = 0
            .toggle(t('veinminer.ui.toggle'), { defaultValue: toggle })

            // IDX.MAX_VEIN = 1
            .slider(t('veinminer.ui.max_vein'), 1, 256, {
                defaultValue: maxVein,
                valueStep: 1,
            })

            // IDX.MAX_DEPTH = 2
            .slider(t('veinminer.ui.max_depth'), 1, 32, {
                defaultValue: maxDepth,
                valueStep: 1,
            })

            // IDX.DURABILITY = 3
            .toggle(t('veinminer.ui.durability_full'), { defaultValue: dur })

            // IDX.REPLANT = 4
            .toggle(t('veinminer.ui.replant_full'), { defaultValue: repl });

        // label — 不产生值，不影响 IDX
        if (wlItems.length === 0) {
            form.label(t('veinminer.ui.whitelist_label_empty'));
        } else {
            form.label(tf1('veinminer.ui.whitelist_label', formatWhitelist(wlItems)));
        }

        // IDX.CLEAR_WL = 5
        form.toggle(t('veinminer.ui.whitelist.clear'), { defaultValue: false });

        if (op) {
            // IDX.COLLECT = 6
            form.toggle(t('veinminer.ui.collect_drops_full'), { defaultValue: collect })
            // IDX.AUTO_LEAVES = 7
            .toggle(t('veinminer.ui.auto_leaves_full'), { defaultValue: leaves });
        }

        // ── 显示 ──

        const response = await form.show(player);

        if (response.canceled) {
            if (response.cancelationReason === 'UserBusy') {
                system.runTimeout(() => showSettings(player), 10);
            }
            return;
        }

        const v = response.formValues;
        if (!v) return;

        // ── 保存 ──

        setPlayerToggle(player, v[IDX.TOGGLE] as boolean);
        syncHud(player, v[IDX.TOGGLE] as boolean);
        setPlayerMaxVein(player, v[IDX.MAX_VEIN] as number);
        setMaxDepth(player, v[IDX.MAX_DEPTH] as number);
        setDurability(player, v[IDX.DURABILITY] as boolean);
        setReplant(player, v[IDX.REPLANT] as boolean);

        if (v[IDX.CLEAR_WL] as boolean) {
            clearWhitelist(player);
        }

        if (op) {
            setPlayerCollectDrops(player, v[IDX.COLLECT] as boolean);
            setPlayerAutoLeaves(player, v[IDX.AUTO_LEAVES] as boolean);
        }

        player.sendMessage(tagged('veinminer.ui.saved'));
    } catch (error) {
        console.warn(`[VMT] settings form error: ${error}`);
        player.sendMessage(tagged('veinminer.tip.settings_error'));
    }
}