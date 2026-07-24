/**
 * EnchantmentHelper.ts — 附魔精确掉落计算
 *
 * 负责：
 *   - 根据时运等级计算矿物掉落数量
 *   - 精准采集直接掉原矿方块
 *   - 生成经验球
 *   - 返回生成的掉落物实体引用（供 BreakExecutor 直接持有，避免搜索）
 */

import { Player, ItemStack, Dimension, Vector3, Entity } from '@minecraft/server';
import { getEnchantLevel } from './ToolHelper';

// ═══════════════════════════════════════
//  矿物掉落映射表
// ═══════════════════════════════════════

interface DropEntry {
    /** 掉落物 ID */
    itemId: string;
    /** 基础数量 */
    count: number;
    /** 是否受时运加成（红石/青金石等群体矿物） */
    fortuneScale: boolean;
}

const BLOCK_DROP_MAP: Record<string, DropEntry> = {
    // 普通矿石
    'minecraft:coal_ore':            { itemId: 'minecraft:coal',            count: 1, fortuneScale: true },
    'minecraft:iron_ore':            { itemId: 'minecraft:raw_iron',        count: 1, fortuneScale: false },
    'minecraft:gold_ore':            { itemId: 'minecraft:raw_gold',        count: 1, fortuneScale: false },
    'minecraft:diamond_ore':         { itemId: 'minecraft:diamond',         count: 1, fortuneScale: true },
    'minecraft:emerald_ore':         { itemId: 'minecraft:emerald',         count: 1, fortuneScale: true },
    'minecraft:lapis_ore':           { itemId: 'minecraft:lapis_lazuli',    count: 4, fortuneScale: true },
    'minecraft:redstone_ore':        { itemId: 'minecraft:redstone',        count: 4, fortuneScale: true },
    'minecraft:quartz_ore':          { itemId: 'minecraft:quartz',          count: 1, fortuneScale: true },
    'minecraft:nether_gold_ore':     { itemId: 'minecraft:gold_nugget',     count: 1, fortuneScale: true },
    'minecraft:ancient_debris':      { itemId: 'minecraft:netherite_scrap', count: 1, fortuneScale: false },
    'minecraft:copper_ore':          { itemId: 'minecraft:raw_copper',      count: 1, fortuneScale: false },

    // 深板岩矿石
    'minecraft:deepslate_coal_ore':      { itemId: 'minecraft:coal',         count: 1, fortuneScale: true },
    'minecraft:deepslate_iron_ore':      { itemId: 'minecraft:raw_iron',     count: 1, fortuneScale: false },
    'minecraft:deepslate_gold_ore':      { itemId: 'minecraft:raw_gold',     count: 1, fortuneScale: false },
    'minecraft:deepslate_diamond_ore':   { itemId: 'minecraft:diamond',      count: 1, fortuneScale: true },
    'minecraft:deepslate_emerald_ore':   { itemId: 'minecraft:emerald',      count: 1, fortuneScale: true },
    'minecraft:deepslate_lapis_ore':     { itemId: 'minecraft:lapis_lazuli', count: 4, fortuneScale: true },
    'minecraft:deepslate_redstone_ore':  { itemId: 'minecraft:redstone',     count: 4, fortuneScale: true },
    'minecraft:deepslate_copper_ore':    { itemId: 'minecraft:raw_copper',   count: 1, fortuneScale: false },
};

// ═══════════════════════════════════════
//  经验值映射表
// ═══════════════════════════════════════

const EXP_MAP: Record<string, number> = {
    'minecraft:coal_ore': 0, 'minecraft:deepslate_coal_ore': 0,
    'minecraft:iron_ore': 0, 'minecraft:deepslate_iron_ore': 0,
    'minecraft:gold_ore': 0, 'minecraft:deepslate_gold_ore': 0,
    'minecraft:copper_ore': 0, 'minecraft:deepslate_copper_ore': 0,
    'minecraft:diamond_ore': 7, 'minecraft:deepslate_diamond_ore': 7,
    'minecraft:emerald_ore': 7, 'minecraft:deepslate_emerald_ore': 7,
    'minecraft:lapis_ore': 2, 'minecraft:deepslate_lapis_ore': 2,
    'minecraft:redstone_ore': 1, 'minecraft:deepslate_redstone_ore': 1,
    'minecraft:quartz_ore': 2,
    'minecraft:nether_gold_ore': 0,
    'minecraft:ancient_debris': 0,
};

// ═══════════════════════════════════════
//  获取玩家手持工具的附魔等级
// ═══════════════════════════════════════

/** 获取玩家手持物品的指定附魔等级 */
export function getHeldEnchantLevel(player: Player, enchantId: string): number {
    try {
        const inventory = player.getComponent('inventory');
        if (!inventory || !inventory.container) return 0;
        const item = inventory.container.getItem(player.selectedSlotIndex);
        if (!item) return 0;
        return getEnchantLevel(item, enchantId);
    } catch {
        return 0;
    }
}

// ═══════════════════════════════════════
//  公共接口
// ═══════════════════════════════════════

/**
 * 根据方块类型和附魔计算掉落物
 * @returns 掉落物列表，不在映射表中返回 null（走原版 setblock air destroy）
 */
export function getDrops(
    blockId: string,
    player: Player,
): { itemId: string; count: number }[] | null {
    const entry = BLOCK_DROP_MAP[blockId];
    if (!entry) return null;

    const silkTouch = getHeldEnchantLevel(player, 'silk_touch') > 0;

    if (silkTouch) {
        return [{ itemId: blockId, count: 1 }];
    }

    const fortuneLevel = getHeldEnchantLevel(player, 'fortune');
    let finalCount = entry.count;

    if (entry.fortuneScale && fortuneLevel > 0) {
        // 基岩版时运公式：count * (fortuneLevel + 1) 的随机范围
        // 简化实现：基础数量 + random(0 ~ fortuneLevel)
        const bonus = Math.floor(Math.random() * (fortuneLevel + 1));
        finalCount = entry.count * (1 + bonus);
    }

    return [{ itemId: entry.itemId, count: finalCount }];
}

/**
 * 在指定位置生成掉落物和经验球
 * @returns 生成的掉落物实体数组（不含经验球），供外部持有引用
 */
export function spawnDrops(
    dimension: Dimension,
    pos: Vector3,
    drops: { itemId: string; count: number }[],
    exp: number,
): Entity[] {
    const entities: Entity[] = [];

    for (const drop of drops) {
        try {
            const item = new ItemStack(drop.itemId, drop.count);
            const entity = dimension.spawnItem(item, pos);
            entities.push(entity);
        } catch {
            // 掉落物生成失败忽略
        }
    }

    if (exp > 0) {
        try {
            dimension.spawnEntity('xp_orb', pos);
        } catch {
            // 经验球生成失败忽略
        }
    }

    return entities;
}

/**
 * 获取方块的经验值
 */
export function getExperience(blockId: string): number {
    return EXP_MAP[blockId] ?? 0;
}