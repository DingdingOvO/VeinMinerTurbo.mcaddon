/**
 * LangHelper.ts — 内置三语文本
 *
 * 为什么不用 .lang / RawMessage.translate：
 *   translate 由客户端解析，客户端只读资源包的 texts；
 *   官方 wiki 明确「所有本地化都应放在资源包，行为包的 lang 只应包含包名与描述」。
 *   Script API 也没有运行时解析 lang 的能力（bedrock-samples issue #79）。
 *
 * 为了只发一个行为包，这里把文本内嵌进脚本，按 player.locale 选择字典。
 * 拿不到 locale 时回退英文。
 */

import type { Player } from '@minecraft/server';

type Dict = Record<string, string>;


const ZH_CN: Dict = {
    'veinminer.ui.title': 'VeinMinerTurbo 设置',
    'veinminer.ui.toggle': '连锁挖矿',
    'veinminer.ui.max_vein': '最大连锁数',
    'veinminer.ui.size_x': '长 (X 轴, 格)',
    'veinminer.ui.size_y': '高 (Y 轴, 格)',
    'veinminer.ui.size_z': '宽 (Z 轴, 格)',
    'veinminer.ui.max_depth': '最大搜索深度',
    'veinminer.ui.durability_full': '耐久保护 (工具快坏时停止)',
    'veinminer.ui.outline': '轮廓预览 (红色描边)',
    'veinminer.ui.collect_drops_full': '掉落物集中 (传送到挖掘起点)',
    'veinminer.ui.auto_leaves_full': '自动破叶 (砍树时连带破坏树叶)',
    'veinminer.ui.whitelist_label': '白名单: %s',
    'veinminer.ui.whitelist_label_empty': '白名单: （空）',
    'veinminer.ui.whitelist.clear': '清空白名单',
    'veinminer.ui.saved': '设置已保存',
    'veinminer.tip.loaded': '已加载',
    'veinminer.tip.sneak_mine': '潜行+挖掘',
    'veinminer.tip.on': '连锁挖矿已开启',
    'veinminer.tip.off': '连锁挖矿已关闭',
    'veinminer.tip.scan_timeout_full': '连锁扫描超时，已破坏 %s 个方块',
    'veinminer.tip.broken': '连锁破坏了 %s 个方块',
    'veinminer.tip.added': '已添加 %s',
    'veinminer.tip.already': '已在白名单中',
    'veinminer.tip.not_looking': '没有注视任何方块',
    'veinminer.tip.settings_error': '设置界面打开失败，请稍后重试',
    'veinminer.tip.tool_low': '工具耐久不足，已停止连锁',
    'veinminer.hud.selected': '§f%s §a已选择 §7· §e潜行挖掘确认',
    'veinminer.hud.target': '§f%s §7× §e%s',
    'veinminer.wl.empty': '白名单是空的，用 /vm:whitelist add 加方块',
};

const ZH_TW: Dict = {
    'veinminer.ui.title': 'VeinMinerTurbo 設定',
    'veinminer.ui.toggle': '連鎖挖礦',
    'veinminer.ui.max_vein': '最大連鎖數',
    'veinminer.ui.size_x': '長 (X 軸, 格)',
    'veinminer.ui.size_y': '高 (Y 軸, 格)',
    'veinminer.ui.size_z': '寬 (Z 軸, 格)',
    'veinminer.ui.max_depth': '最大搜尋深度',
    'veinminer.ui.durability_full': '耐久保護 (工具快壞時自動停止)',
    'veinminer.ui.outline': '輪廓預覽 (紅色描邊)',
    'veinminer.ui.collect_drops_full': '掉落物集中 (傳送到挖掘起點)',
    'veinminer.ui.auto_leaves_full': '自動破葉 (砍樹時連帶破壞樹葉)',
    'veinminer.ui.whitelist_label': '白名單: %s',
    'veinminer.ui.whitelist_label_empty': '白名單: （空）',
    'veinminer.ui.whitelist.clear': '清空白名單',
    'veinminer.ui.saved': '設定已儲存',
    'veinminer.tip.loaded': '已載入',
    'veinminer.tip.sneak_mine': '潛行+挖掘',
    'veinminer.tip.on': '連鎖挖礦已開啟',
    'veinminer.tip.off': '連鎖挖礦已關閉',
    'veinminer.tip.scan_timeout_full': '連鎖掃描逾時，已破壞 %s 個方塊',
    'veinminer.tip.broken': '連鎖破壞了 %s 個方塊',
    'veinminer.tip.added': '已添加 %s',
    'veinminer.tip.already': '已在白名單中',
    'veinminer.tip.not_looking': '沒有注視任何方塊',
    'veinminer.tip.settings_error': '設定介面開啟失敗，請稍後重試',
    'veinminer.tip.tool_low': '工具耐久不足，已停止連鎖',
    'veinminer.hud.selected': '§f%s §a已選擇 §7· §e潛行挖掘確認',
    'veinminer.hud.target': '§f%s §7× §e%s',
    'veinminer.wl.empty': '白名單是空的，用 /vm:whitelist add 加方塊',
};

const EN_US: Dict = {
    'veinminer.ui.title': 'VeinMinerTurbo Settings',
    'veinminer.ui.toggle': 'Vein Mining',
    'veinminer.ui.max_vein': 'Max Range',
    'veinminer.ui.size_x': 'Length (X)',
    'veinminer.ui.size_y': 'Height (Y)',
    'veinminer.ui.size_z': 'Width (Z)',
    'veinminer.ui.max_depth': 'Max Depth',
    'veinminer.ui.durability_full': 'Durability Guard (stop before tool breaks)',
    'veinminer.ui.outline': 'Outline Preview (red)',
    'veinminer.ui.collect_drops_full': 'Collect Drops (teleport to break origin)',
    'veinminer.ui.auto_leaves_full': 'Auto Leaves (break leaves when chopping trees)',
    'veinminer.ui.whitelist_label': 'Whitelist: %s',
    'veinminer.ui.whitelist_label_empty': 'Whitelist: (empty)',
    'veinminer.ui.whitelist.clear': 'Clear whitelist',
    'veinminer.ui.saved': 'Settings saved',
    'veinminer.tip.loaded': 'Loaded',
    'veinminer.tip.sneak_mine': 'Sneak+Mine',
    'veinminer.tip.on': 'Vein mining enabled',
    'veinminer.tip.off': 'Vein mining disabled',
    'veinminer.tip.scan_timeout_full': 'Scan timed out, broke %s blocks',
    'veinminer.tip.broken': 'Chain-broke %s blocks',
    'veinminer.tip.added': 'Added %s',
    'veinminer.tip.already': 'already in whitelist',
    'veinminer.tip.not_looking': 'Not looking at any block',
    'veinminer.tip.settings_error': 'Failed to open settings, please try again later',
    'veinminer.tip.tool_low': 'Tool durability too low, chain stopped',
    'veinminer.hud.selected': '§f%s §aselected §7· §esneak + mine to confirm',
    'veinminer.hud.target': '§f%s §7× §e%s',
    'veinminer.wl.empty': 'Whitelist is empty, use /vm:whitelist add',
};


/** 取玩家客户端语言（拿不到时回退 en_US） */
function localeOf(player?: Player): string {
    try {
        return player?.clientSystemInfo?.locale ?? 'en_US';
    } catch {
        return 'en_US';
    }
}

/** 按 locale 选字典：zh_TW / zh_HK / zh_Hant → 繁体，其余 zh → 简体，其他 → 英文 */
function pick(locale: string | undefined): Dict {
    const l = (locale ?? 'en_US').toLowerCase().replace('-', '_');
    if (l.startsWith('zh')) {
        if (l.includes('tw') || l.includes('hk') || l.includes('mo') || l.includes('hant')) {
            return ZH_TW;
        }
        return ZH_CN;
    }
    return EN_US;
}

/** 取翻译。player 省略时用英文 */
export function t(key: string, player?: Player): string {
    const dict = pick(localeOf(player));
    return dict[key] ?? EN_US[key] ?? key;
}

/** 取翻译并替换第一个 %s */
export function tf1(key: string, arg: string, player?: Player): string {
    return t(key, player).replace('%s', arg);
}

/** 取翻译并替换两个 %s */
export function tf2(key: string, a1: string, a2: string, player?: Player): string {
    return t(key, player).replace('%s', a1).replace('%s', a2);
}

/** 带前缀 + 一个参数 */
export function taggedf1(key: string, arg: string, player?: Player): string {
    return `${TAG} ${tf1(key, arg, player)}`;
}

/** 带前缀的提示文本 */
export function tagged(key: string, player?: Player): string {
    return `${TAG} ${t(key, player)}`;
}

/** 前缀 TAG */
export const TAG = '§8[VMT]§r';

/** 兼容旧调用：原样返回文本（不再是 RawMessage） */
export function rawtext(text: string): string {
    return text;
}

