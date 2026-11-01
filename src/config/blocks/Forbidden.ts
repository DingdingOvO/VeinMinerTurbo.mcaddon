/**
 * Forbidden.ts — 内置锁定方块
 *
 * 这批方块任何情况都不连锁，加白名单也不认，OP 也删不掉
 * （基岩、命令块、结构方块、各种屏障）。
 *
 * 注意：草、土、石这些「一挖一大片」的地形方块**不在这里**。
 * 它们走的是「没加白名单就不连锁」这条通用规则（见 getMineMode），
 * 加进个人白名单后按设置里的长/高/宽挖一个立方体。
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

