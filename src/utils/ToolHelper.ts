/**
 * ToolHelper.ts — 工具相关工具函数
 *
 * 获取主手工具、耐久组件、附魔等级
 */

import { Player, ItemStack, ItemComponentTypes } from '@minecraft/server';

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
        const inventory = player.getComponent('inventory');
        if (!inventory || !inventory.container) return { item: undefined, durability: undefined };

        const item = inventory.container.getItem(player.selectedSlotIndex);
        if (!item) return { item: undefined, durability: undefined };

        const durComp = item.getComponent(ItemComponentTypes.Durability);
        if (!durComp) return { item, durability: undefined };

        return {
            item,
            durability: {
                damage: durComp.damage,
                maxDurability: durComp.maxDurability,
            },
        };
    } catch {
        return { item: undefined, durability: undefined };
    }
}

// ═══════════════════════════════════════
//  附魔读取
// ═══════════════════════════════════════

/** 读取指定物品的附魔等级，没有则返回 0 */
export function getEnchantLevel(item: ItemStack, enchantId: string): number {
    try {
        const comp = item.getComponent(ItemComponentTypes.Enchantable);
        if (!comp) return 0;
        const ench = comp.getEnchantment(enchantId);
        return ench?.level ?? 0;
    } catch {
        return 0;
    }
}

