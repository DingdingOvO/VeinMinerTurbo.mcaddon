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
            .title('VeinMiner 设置')

            // 0: 连锁开关
            .toggle('连锁挖矿', { defaultValue: toggle })

            // 1: 最大连锁数
            .slider('最大连锁数', 1, 256, {
                defaultValue: maxVein,
                valueStep: 1,
            })

            // 2: 搜索深度
            .slider('搜索深度', 1, 32, {
                defaultValue: maxDepth,
                valueStep: 1,
            })

            // 3: 耐久保护
            .toggle('耐久保护 (工具快坏时停止)', { defaultValue: dur })

            // 4: 自动补种
            .toggle('自动补种 (破坏后补回树苗)', { defaultValue: repl });

        // 5: 白名单标签
        if (wlItems.length === 0) {
            form.label('白名单: (空)');
        } else {
            form.label('白名单: ' + formatWhitelist(wlItems));
        }

        // 6: 清空白名单
        form.toggle('清空白名单', { defaultValue: false });

        if (op) {
            // 7: 掉落物集中
            form.toggle('掉落物集中 (传送到挖掘起点)', { defaultValue: collect })
            // 8: 自动破叶
            .toggle('自动破叶 (砍树时连带树叶)', { defaultValue: leaves });
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

        player.sendMessage('§8[VM] §a设置已保存');
    } catch (error) {
        console.warn(`[VM] 设置表单出错: ${error}`);
        player.sendMessage('§8[VM] §c设置界面出错: ' + error);
    }
}