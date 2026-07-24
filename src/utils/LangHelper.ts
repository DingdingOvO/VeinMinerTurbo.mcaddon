/**
 * LangHelper.ts — 翻译工具
 *
 * Bedrock Script API 使用 RawMessage.translate 来引用 .lang 文件中的键。
 * 代码中所有面向玩家的文本都必须用 t() 或 tf() 代替硬编码字符串。
 *
 * 用法:
 *   player.sendMessage(t('veinminer.tip.on'));
 *   player.sendMessage(tf('veinminer.tip.broken', String(count)));
 *   form.title(t('veinminer.ui.title'));
 */

import type { RawMessage } from '@minecraft/server';

const TAG = '§8[VMT]§r';

/**
 * 翻译 — 无参数占位符
 * 返回可直接传给 sendMessage / setActionBar / form.title 的 RawMessage
 */
export function t(key: string): RawMessage {
    return { translate: key };
}

/**
 * 翻译 — 带 1 个参数占位符（%s）
 * Bedrock lang 文件用 %s 占位，with 数组按序替换
 */
export function tf1(key: string, arg: string): RawMessage {
    return { translate: key, with: [arg] };
}

/**
 * 翻译 — 带 2 个参数占位符
 */
export function tf2(key: string, a1: string, a2: string): RawMessage {
    return { translate: key, with: [a1, a2] };
}

/**
 * 拼接 TAG + 翻译文本（用于 sendMessage / setActionBar）
 * Bedrock sendMessage 支持传入 RawMessage[]，会依次拼接显示
 */
export function tagged(key: string): RawMessage[] {
    return [rawtext(TAG + ' '), t(key)];
}

/**
 * 拼接 TAG + 带参数翻译
 */
export function taggedf1(key: string, arg: string): RawMessage[] {
    return [rawtext(TAG + ' '), tf1(key, arg)];
}

/**
 * 获取纯文本的 TAG RawMessage（用于自行拼接）
 */
export function rawtext(text: string): RawMessage {
    return { rawtext: [{ text }] };
}

/** 前缀 TAG 常量，供需要手动拼接的场景使用 */
export { TAG };
