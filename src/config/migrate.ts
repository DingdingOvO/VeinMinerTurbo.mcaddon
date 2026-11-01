/**
 * migrate.ts — 旧动态属性键名迁移
 *
 * 早期版本键名混用 `vm:` 与 `veinminer_` 两种前缀，这里统一到 `vmt_`。
 * 只在目标键还没有值时才搬，搬完删掉旧键；失败就保持原样，不影响读取。
 *
 * 这个文件只跑一次，稳定后可以整个删掉。
 */

import { world, Player } from '@minecraft/server';

/** 旧键 → 新键 */
const PLAYER_KEYS: Record<string, string> = {
    'vm:toggle': 'vmt_toggle',
    'vm:max_vein': 'vmt_max_vein',
    'vm:auto_leaves': 'vmt_auto_leaves',
    'vm:collect_drops': 'vmt_collect_drops',
    'vm:size_x': 'vmt_size_x',
    'vm:size_y': 'vmt_size_y',
    'vm:size_z': 'vmt_size_z',
    'veinminer_max_depth': 'vmt_max_depth',
    'veinminer_durability': 'vmt_durability',
    'veinminer_outline': 'vmt_outline',
    'veinminer_whitelist': 'vmt_whitelist',
};

const WORLD_KEYS: Record<string, string> = {
    'vm:global_nowide': 'vmt_nowide',
    'vm:global_lock': 'vmt_lock',
    'vm:player_ban': 'vmt_player_ban',
};

export function migratePlayerProperties(player: Player): void {
    for (const [oldKey, newKey] of Object.entries(PLAYER_KEYS)) {
        try {
            const oldValue = player.getDynamicProperty(oldKey);
            if (oldValue === undefined) continue;

            if (player.getDynamicProperty(newKey) === undefined) {
                player.setDynamicProperty(newKey, oldValue as string | number | boolean);
            }
            player.setDynamicProperty(oldKey, undefined);
        } catch {
            // 单个键失败不影响其它键
        }
    }
}

export function migrateWorldProperties(): void {
    for (const [oldKey, newKey] of Object.entries(WORLD_KEYS)) {
        try {
            const oldValue = world.getDynamicProperty(oldKey);
            if (oldValue === undefined) continue;

            if (world.getDynamicProperty(newKey) === undefined) {
                world.setDynamicProperty(newKey, oldValue as string | number | boolean);
            }
            world.setDynamicProperty(oldKey, undefined);
        } catch {
            // 同上
        }
    }
}

/** 启动时把在线玩家和世界的旧键都搬一遍 */
export function migrateAll(): void {
    migrateWorldProperties();
    for (const player of world.getAllPlayers()) {
        migratePlayerProperties(player);
    }
}
