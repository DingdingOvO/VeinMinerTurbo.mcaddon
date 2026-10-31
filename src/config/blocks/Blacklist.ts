/**
 * Blacklist.ts — 两类"不给连锁"的方块
 *
 * FORBIDDEN_IDS：内置锁定，任何情况都不连锁，加白名单也不认（基岩、命令块这类）
 *                OP 可以用 /vm:ad lk add 往锁定名单里追加，但这批删不掉。
 * TERRAIN_IDS  ：默认不连锁的大片地形方块（草、土、石…）
 *                它们不是永久锁定 —— 玩家用 /vm:whitelist add 加进来后，
 *                会按 3×3×3（可调，有上限）的立方体范围挖，而不是无限连锁。
 */

/** 永远不破坏 */
export const FORBIDDEN_IDS: readonly string[] = [
    'minecraft:bedrock',
    'minecraft:barrier',
    'minecraft:command_block',
    'minecraft:repeating_command_block',
    'minecraft:chain_command_block',
    'minecraft:structure_void',
    'minecraft:structure_block',
    'minecraft:end_portal_frame',
    'minecraft:end_portal',
    'minecraft:nether_portal',
    'minecraft:reinforced_deepslate',
    'minecraft:light_block',
    'minecraft:jigsaw',
    'minecraft:deny',
    'minecraft:allow',
    'minecraft:border_block',
];

/**
 * 默认黑名单：一挖就是一大片的地形方块。
 * 想连锁它们，必须先 /vm:whitelist add，加完只按立方体范围挖。
 */
export const BLACKLIST_IDS: readonly string[] = [
    'minecraft:grass_block',
    'minecraft:dirt',
    'minecraft:coarse_dirt',
    'minecraft:rooted_dirt',
    'minecraft:podzol',
    'minecraft:mycelium',
    'minecraft:farmland',
    'minecraft:dirt_with_roots',
    'minecraft:mud',
    'minecraft:clay',
    'minecraft:stone',
    'minecraft:cobblestone',
    'minecraft:mossy_cobblestone',
    'minecraft:deepslate',
    'minecraft:cobbled_deepslate',
    'minecraft:tuff',
    'minecraft:calcite',
    'minecraft:andesite',
    'minecraft:diorite',
    'minecraft:granite',
    'minecraft:sand',
    'minecraft:red_sand',
    'minecraft:sandstone',
    'minecraft:gravel',
    'minecraft:snow',
    'minecraft:snow_layer',
    'minecraft:ice',
    'minecraft:packed_ice',
    'minecraft:blue_ice',
    'minecraft:netherrack',
    'minecraft:soul_sand',
    'minecraft:soul_soil',
    'minecraft:end_stone',
    'minecraft:obsidian',
    'minecraft:magma',
    'minecraft:basalt',
    'minecraft:blackstone',
];
