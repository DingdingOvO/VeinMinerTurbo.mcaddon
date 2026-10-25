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

// ═══════════════════════════════════════
//  耐久消耗
// ═══════════════════════════════════════

/**
 * 消耗一次耐久，使用组件内置 getDamageChance 处理耐久附魔
 * @returns true 表示工具已损坏，应停止挖掘
 */
export function consumeDurability(tool: ToolInfo): boolean {
    if (!tool.item || !tool.durability) return false;

    const { durability } = tool;
    if (durability.damage >= durability.maxDurability) {
        return true; // 已损坏
    }

    try {
        const durComp = tool.item.getComponent(ItemComponentTypes.Durability);
        if (!durComp) return false;

        const unbreaking = getEnchantLevel(tool.item, 'unbreaking');
        const damageChance = durComp.getDamageChance(unbreaking);

        if (Math.random() < damageChance) {
            durComp.damage += 1;
        }
    } catch {
        // 组件操作失败忽略
    }

    return false;
}