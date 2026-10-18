/**
 * EnchantmentHelper.ts — 掉落计算
 *
 * 负责：
 *   - 矿石：按精准采集 / 时运计算掉落
 *   - 原木 / 树叶：按原版规则给出掉落（不再依赖 setblock destroy 命令）
 *   - 生成掉落物实体，返回引用供 BreakExecutor 集中拾取
 *
 * 说明：旧实现用 `setblock ... air destroy` 让原版处理掉落，
 * 但 player.runCommand 对非 OP 玩家会失败，导致连锁对普通玩家完全无效。
 * 现在改为纯 Script API：block.setType('air') + 手动 spawnItem。
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
    'minecraft:diamond_ore': 3, 'minecraft:deepslate_diamond_ore': 3,
    'minecraft:emerald_ore': 3, 'minecraft:deepslate_emerald_ore': 3,
    'minecraft:lapis_ore': 2, 'minecraft:deepslate_lapis_ore': 2,
    'minecraft:redstone_ore': 1, 'minecraft:deepslate_redstone_ore': 1,
    'minecraft:quartz_ore': 2,
    'minecraft:nether_gold_ore': 0,
    'minecraft:ancient_debris': 0,
};

/** 树叶 → 树苗映射 */
const LEAF_SAPLING_MAP: Record<string, string> = {
    'minecraft:oak_leaves': 'minecraft:oak_sapling',
    'minecraft:spruce_leaves': 'minecraft:spruce_sapling',
    'minecraft:birch_leaves': 'minecraft:birch_sapling',
    'minecraft:jungle_leaves': 'minecraft:jungle_sapling',
    'minecraft:acacia_leaves': 'minecraft:acacia_sapling',
    'minecraft:dark_oak_leaves': 'minecraft:dark_oak_sapling',
    'minecraft:mangrove_leaves': 'minecraft:mangrove_propagule',
    'minecraft:cherry_leaves': 'minecraft:cherry_sapling',
    'minecraft:pale_oak_leaves': 'minecraft:pale_oak_sapling',
    'minecraft:azalea_leaves': 'minecraft:azalea',
    'minecraft:azalea_leaves_flowered': 'minecraft:flowering_azalea',
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
 * @returns 掉落物列表；空数组表示该方块连锁破坏时无掉落
 */
export function getDrops(
    blockId: string,
    player: Player,
): { itemId: string; count: number }[] {
    const silkTouch = getHeldEnchantLevel(player, 'silk_touch') > 0;

    // 树叶：精准采集掉树叶本身，否则低概率掉树苗
    const sapling = LEAF_SAPLING_MAP[blockId];
    if (sapling !== undefined) {
        if (silkTouch) return [{ itemId: blockId, count: 1 }];
        const drops: { itemId: string; count: number }[] = [];
        if (Math.random() < 0.05) drops.push({ itemId: sapling, count: 1 });
        if (blockId === 'minecraft:oak_leaves' || blockId === 'minecraft:dark_oak_leaves') {
            if (Math.random() < 0.005) drops.push({ itemId: 'minecraft:apple', count: 1 });
        }
        return drops;
    }

    const entry = BLOCK_DROP_MAP[blockId];
    if (!entry) {
        // 非矿石（原木 / 玩家自定义白名单方块）：精准采集掉自身，其余也掉自身
        return [{ itemId: blockId, count: 1 }];
    }

    if (silkTouch) {
        return [{ itemId: blockId, count: 1 }];
    }

    const fortuneLevel = getHeldEnchantLevel(player, 'fortune');
    let finalCount = entry.count;

    if (entry.fortuneScale && fortuneLevel > 0) {
        // 基岩版时运：基础数量 × 随机(1 ~ fortuneLevel+1) 的近似
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
    const at = { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 };

    for (const drop of drops) {
        if (drop.count <= 0) continue;
        try {
            const item = new ItemStack(drop.itemId, drop.count);
            const entity = dimension.spawnItem(item, at);
            entities.push(entity);
        } catch {
            // 掉落物生成失败忽略（非法 itemId 等）
        }
    }

    // 经验：xp_orb 不能直接 spawnEntity，只能用 summon
    if (exp > 0) {
        try {
            dimension.runCommand(
                `summon xp_orb ${at.x} ${at.y} ${at.z}`,
            );
        } catch {
            // 世界未开作弊时忽略
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
