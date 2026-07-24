/**
 * VeinMinerUI.ts -- 设置表单（ModalFormData）
 *
 * 使用 ModalFormData（老式表单 API），
 * toggle/slider 接收普通 boolean/number，不依赖 Observable/DDUI。
 *
 * 触发: #vm / /scriptevent veinminer:settings
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

        // 构建表单
        const form = new ModalFormData()
            .title(t('veinminer.ui.title'))

            // 0: 连锁开关
            .toggle(t('veinminer.ui.toggle'), { defaultValue: toggle })

            // 1: 最大连锁数
            .slider(t('veinminer.ui.max_vein'), 1, 256, {
                defaultValue: maxVein,
                valueStep: 1,
            })

            // 2: 搜索深度
            .slider(t('veinminer.ui.max_depth'), 1, 32, {
                defaultValue: maxDepth,
                valueStep: 1,
            })

            // 3: 耐久保护
            .toggle(t('veinminer.ui.durability_full'), { defaultValue: dur })

            // 4: 自动补种
            .toggle(t('veinminer.ui.replant_full'), { defaultValue: repl });

        // 5: 白名单标签
        if (wlItems.length === 0) {
            form.label(t('veinminer.ui.whitelist_label_empty'));
        } else {
            form.label(tf1('veinminer.ui.whitelist_label', formatWhitelist(wlItems)));
        }

        // 6: 清空白名单
        form.toggle(t('veinminer.ui.whitelist.clear'), { defaultValue: false });

        if (op) {
            // 7: 掉落物集中
            form.toggle(t('veinminer.ui.collect_drops_full'), { defaultValue: collect })
            // 8: 自动破叶
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

        setPlayerToggle(player, v[0] as boolean);
        syncHud(player, v[0] as boolean);
        setPlayerMaxVein(player, v[1] as number);
        setMaxDepth(player, v[2] as number);
        setDurability(player, v[3] as boolean);
        setReplant(player, v[4] as boolean);

        // v[5] 是 label，跳过
        if (v[6] as boolean) {
            clearWhitelist(player);
        }

        if (op) {
            setPlayerCollectDrops(player, v[7] as boolean);
            setPlayerAutoLeaves(player, v[8] as boolean);
        }

        player.sendMessage(tagged('veinminer.ui.saved'));
    } catch (error) {
        console.warn(`[VMT] settings form error: ${error}`);
        player.sendMessage(tagged('veinminer.tip.settings_error'));
    }
}