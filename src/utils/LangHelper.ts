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
    'veinminer.ui.menu.title': '连锁采集',
    'veinminer.ui.general.title': '基础设置',
    'veinminer.ui.range.title': '挖掘范围',
    'veinminer.ui.behavior.title': '采集行为',
    'veinminer.ui.visual.title': '显示与特效',
    'veinminer.ui.whitelist.title': '白名单',
    'veinminer.ui.back': '保存并返回',
    'veinminer.ui.whitelist_cleared': '白名单已清空',
    'veinminer.ui.toggle': '连锁挖矿',
    'veinminer.ui.max_vein': '最大连锁数',
    'veinminer.ui.size_x': '长',
    'veinminer.ui.size_y': '高',
    'veinminer.ui.size_z': '宽',
    'veinminer.ui.size_x_tip': '沿 X 轴挖几格，1 就是单层',
    'veinminer.ui.size_y_tip': '竖直方向几层，1 就是单层',
    'veinminer.ui.size_z_tip': '沿 Z 轴挖几格，1 就是单层',
    'veinminer.ui.max_depth': '最大搜索深度',
    'veinminer.ui.durability_full': '耐久保护 (工具快坏时停止)',
    'veinminer.ui.outline': '轮廓预览 (红色描边)',
    'veinminer.ui.collect_drops_full': '掉落物集中 (传送到挖掘起点)',
    'veinminer.ui.auto_leaves_full': '自动破叶 (砍树时连带破坏树叶)',
    // 设置页分节与说明
    'veinminer.ui.sec.range': '挖掘范围',
    'veinminer.ui.sec.limit': '连锁上限',
    'veinminer.ui.sec.behavior': '采集行为',
    'veinminer.ui.sec.display': '显示与特效',
    'veinminer.ui.desc.range': '以瞄准的方块为中心，向四周扩展',
    'veinminer.ui.desc.size_x': '左右方向几格',
    'veinminer.ui.desc.size_y': '上下方向几层',
    'veinminer.ui.desc.size_z': '前后方向几格',
    'veinminer.ui.desc.max_vein': '一次最多破坏多少块',
    'veinminer.ui.desc.max_depth': '从瞄准点向下最多挖几层',
    'veinminer.ui.desc.guard': '耐久不够时自动少挖一些',
    'veinminer.ui.desc.collect': '掉落物收拢到脚下，不再四散',
    'veinminer.ui.desc.leaves': '砍完原木后连带破坏周围树叶',
    'veinminer.ui.desc.outline': '用红色粒子勾出连锁范围',
    'veinminer.ui.whitelist_label': '白名单: %s',
    'veinminer.ui.whitelist_label_empty': '白名单: （空）',
    'veinminer.ui.whitelist.clear': '清空白名单',
    'veinminer.ui.saved': '设置已保存',
    'veinminer.tip.on': '连锁挖矿已开启',
    'veinminer.tip.off': '连锁挖矿已关闭',
    'veinminer.tip.scan_timeout_full': '连锁扫描超时，已破坏 %s 个方块',
    'veinminer.tip.broken': '连锁破坏了 %s 个方块',
    'veinminer.tip.settings_error': '设置界面打开失败，请稍后重试',
    'veinminer.tip.tool_low': '工具耐久不足，已停止连锁',
    'veinminer.tip.durability_cut': '耐久见底，只连锁了 %s/%s 块',
};

const ZH_TW: Dict = {
    'veinminer.ui.title': 'VeinMinerTurbo 設定',
    'veinminer.ui.menu.title': '連鎖採集',
    'veinminer.ui.general.title': '基礎設定',
    'veinminer.ui.range.title': '挖掘範圍',
    'veinminer.ui.behavior.title': '採集行為',
    'veinminer.ui.visual.title': '顯示與特效',
    'veinminer.ui.whitelist.title': '白名單',
    'veinminer.ui.back': '儲存並返回',
    'veinminer.ui.whitelist_cleared': '白名單已清空',
    'veinminer.ui.toggle': '連鎖挖礦',
    'veinminer.ui.max_vein': '最大連鎖數',
    'veinminer.ui.size_x': '長',
    'veinminer.ui.size_y': '高',
    'veinminer.ui.size_z': '寬',
    'veinminer.ui.size_x_tip': '沿 X 軸挖幾格，1 就是單層',
    'veinminer.ui.size_y_tip': '豎直方向幾層，1 就是單層',
    'veinminer.ui.size_z_tip': '沿 Z 軸挖幾格，1 就是單層',
    'veinminer.ui.max_depth': '最大搜尋深度',
    'veinminer.ui.durability_full': '耐久保護 (工具快壞時自動停止)',
    'veinminer.ui.outline': '輪廓預覽 (紅色描邊)',
    'veinminer.ui.collect_drops_full': '掉落物集中 (傳送到挖掘起點)',
    'veinminer.ui.auto_leaves_full': '自動破葉 (砍樹時連帶破壞樹葉)',
    // 設定頁分節與說明
    'veinminer.ui.sec.range': '挖掘範圍',
    'veinminer.ui.sec.limit': '連鎖上限',
    'veinminer.ui.sec.behavior': '採集行為',
    'veinminer.ui.sec.display': '顯示與特效',
    'veinminer.ui.desc.range': '以瞄準的方塊為中心，向四周擴展',
    'veinminer.ui.desc.size_x': '左右方向幾格',
    'veinminer.ui.desc.size_y': '上下方向幾層',
    'veinminer.ui.desc.size_z': '前後方向幾格',
    'veinminer.ui.desc.max_vein': '一次最多破壞多少塊',
    'veinminer.ui.desc.max_depth': '從瞄準點向下最多挖幾層',
    'veinminer.ui.desc.guard': '耐久不夠時自動少挖一些',
    'veinminer.ui.desc.collect': '掉落物收攏到腳下，不再四散',
    'veinminer.ui.desc.leaves': '砍完原木後連帶破壞周圍樹葉',
    'veinminer.ui.desc.outline': '用紅色粒子勾出連鎖範圍',
    'veinminer.ui.whitelist_label': '白名單: %s',
    'veinminer.ui.whitelist_label_empty': '白名單: （空）',
    'veinminer.ui.whitelist.clear': '清空白名單',
    'veinminer.ui.saved': '設定已儲存',
    'veinminer.tip.on': '連鎖挖礦已開啟',
    'veinminer.tip.off': '連鎖挖礦已關閉',
    'veinminer.tip.scan_timeout_full': '連鎖掃描逾時，已破壞 %s 個方塊',
    'veinminer.tip.broken': '連鎖破壞了 %s 個方塊',
    'veinminer.tip.settings_error': '設定介面開啟失敗，請稍後重試',
    'veinminer.tip.tool_low': '工具耐久不足，已停止連鎖',
    'veinminer.tip.durability_cut': '耐久見底，只連鎖了 %s/%s 塊',
};

const EN_US: Dict = {
    'veinminer.ui.title': 'VeinMinerTurbo Settings',
    'veinminer.ui.menu.title': 'Vein Mining',
    'veinminer.ui.general.title': 'General',
    'veinminer.ui.range.title': 'Mining Range',
    'veinminer.ui.behavior.title': 'Collection',
    'veinminer.ui.visual.title': 'Visuals',
    'veinminer.ui.whitelist.title': 'Whitelist',
    'veinminer.ui.back': 'Save & Back',
    'veinminer.ui.whitelist_cleared': 'Whitelist cleared',
    'veinminer.ui.toggle': 'Vein Mining',
    'veinminer.ui.max_vein': 'Max Range',
    'veinminer.ui.size_x': 'Length',
    'veinminer.ui.size_y': 'Height',
    'veinminer.ui.size_z': 'Width',
    'veinminer.ui.size_x_tip': 'Blocks along X, 1 = single layer',
    'veinminer.ui.size_y_tip': 'Layers vertically, 1 = single layer',
    'veinminer.ui.size_z_tip': 'Blocks along Z, 1 = single layer',
    'veinminer.ui.max_depth': 'Max Depth',
    'veinminer.ui.durability_full': 'Durability Guard (stop before tool breaks)',
    'veinminer.ui.outline': 'Outline Preview (red)',
    'veinminer.ui.collect_drops_full': 'Collect Drops (teleport to break origin)',
    'veinminer.ui.auto_leaves_full': 'Auto Leaves (break leaves when chopping trees)',
    // settings sections & descriptions
    'veinminer.ui.sec.range': 'Mining Area',
    'veinminer.ui.sec.limit': 'Vein Limits',
    'veinminer.ui.sec.behavior': 'Behavior',
    'veinminer.ui.sec.display': 'Display',
    'veinminer.ui.desc.range': 'Expands around the targeted block',
    'veinminer.ui.desc.size_x': 'Blocks to the left and right',
    'veinminer.ui.desc.size_y': 'Layers up and down',
    'veinminer.ui.desc.size_z': 'Blocks to the front and back',
    'veinminer.ui.desc.max_vein': 'Max blocks per vein mine',
    'veinminer.ui.desc.max_depth': 'Max layers downward from the target',
    'veinminer.ui.desc.guard': 'Mines fewer blocks when durability is low',
    'veinminer.ui.desc.collect': 'Gather drops at your feet',
    'veinminer.ui.desc.leaves': 'Break nearby leaves after felling a tree',
    'veinminer.ui.desc.outline': 'Highlight the area with red particles',
    'veinminer.ui.whitelist_label': 'Whitelist: %s',
    'veinminer.ui.whitelist_label_empty': 'Whitelist: (empty)',
    'veinminer.ui.whitelist.clear': 'Clear whitelist',
    'veinminer.ui.saved': 'Settings saved',
    'veinminer.tip.on': 'Vein mining enabled',
    'veinminer.tip.off': 'Vein mining disabled',
    'veinminer.tip.scan_timeout_full': 'Scan timed out, broke %s blocks',
    'veinminer.tip.broken': 'Chain-broke %s blocks',
    'veinminer.tip.settings_error': 'Failed to open settings, please try again later',
    'veinminer.tip.tool_low': 'Tool durability too low, chain stopped',
    'veinminer.tip.durability_cut': 'Out of durability: chained %s of %s blocks',
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

/** 带前缀的提示文本 */
export function tagged(key: string, player?: Player): string {
    return `${TAG} ${t(key, player)}`;
}

/** 前缀 TAG */
export const TAG = '§8[VMT]§r';

