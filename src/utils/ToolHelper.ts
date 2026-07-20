/**
 * ToolHelper.ts — 工具相关工具函数
 *
 * 获取主手工具、耐久组件、附魔等级
 */

import { Player, ItemStack } from '@minecraft/server';

// ═══════════════════════════════════════
//  类型
// ═══════════════════════════════════════

export interface DurabilityInfo {
    damage: number;
    maxDurability: number;
}

export interface ToolInfo {
    item: ItemStack | undefined;
    durability: DurabilityInfo | undefined;
}

// ═══════════════════════════════════════
//  工具获取
// ═══════════════════════════════════════

/** 获取玩家主手工具及耐久信息 */
export function getHeldTool(player: Player): ToolInfo {
    try {
        const equippable = player.getComponent('minecraft:equippable');
        if (!equippable) return { item: undefined, durability: undefined };

        const slot = equippable.getEquipmentSlot('Mainhand' as never) as unknown as {
            getItem?: () => ItemStack | undefined;
        };
        const item = slot?.getItem?.();
        if (!item) return { item: undefined, durability: undefined };

        const dur = item.getComponent('minecraft:durability') as DurabilityInfo | undefined;
        return { item, durability: dur };
    } catch {
        return { item: undefined, durability: undefined };
    }
}

// ═══════════════════════════════════════
//  耐久消耗
// ═══════════════════════════════════════

/**
 * 消耗一次耐久
 * @returns true 表示工具已损坏，应停止挖掘
 */
export function consumeDurability(tool: ToolInfo): boolean {
    if (!tool.durability) return false;

    const { durability } = tool;
    if (durability.damage >= durability.maxDurability) {
        return true; // 已损坏
    }

    // 耐久附魔：每级有 level/(level+1) 概率免消耗
    if (tool.item) {
        const unbreaking = getEnchantLevel(tool.item, 'unbreaking');
        if (unbreaking > 0 && Math.random() < unbreaking / (unbreaking + 1)) {
            return false; // 免消耗
        }
    }

    durability.damage += 1;
    return false;
}

// ═══════════════════════════════════════
//  附魔读取
// ═══════════════════════════════════════

/** 读取指定附魔的等级，没有则返回 0 */
export function getEnchantLevel(item: ItemStack, enchantId: string): number {
    try {
        const comp = item.getComponent('minecraft:enchantable') as {
            getEnchantment?: (id: string) => { level: number } | undefined;
        } | undefined;
        return comp?.getEnchantment?.(enchantId)?.level ?? 0;
    } catch {
        return 0;
    }
}