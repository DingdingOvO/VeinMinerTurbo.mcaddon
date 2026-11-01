/**
 * main.ts — VeinMinerTurbo 行为包入口
 *
 * 这里只负责「启动」：迁移旧数据、注册事件、注册命令、启动预览循环。
 * 具体逻辑按职责分在：
 *
 *   commands/   命令解析与路由（wl 白名单 / c 设置 / ad 管理 / help 帮助）
 *   core/       挖矿主流程：事件捕获 → 扫描 → 排队破坏 → 粒子描边
 *   config/     默认方块表、玩家偏好、服务器级名单
 *   data/       玩家白名单、方块中文名
 *   ui/         设置表单
 *   utils/      语言、附魔、工具
 *
 * 命令一览见 commands/registry.ts，或游戏内 /vm:help。
 */

import { world } from '@minecraft/server';
import { migrateAll, migratePlayerProperties } from './config/migrate';
import { registerVeinMiner } from './core/VeinMiner';
import { startOutlineLoop } from './core/Outline';
import { registerCommands, startCommandQueue } from './commands/registry';

console.log('[VMT] VeinMinerTurbo scripts loaded');

// 旧版本键名迁移（只搬一次，之后新键已有值就不会再动）
migrateAll();
world.afterEvents.playerSpawn.subscribe((ev) => {
    if (!ev.initialSpawn) return;
    migratePlayerProperties(ev.player);
});

registerVeinMiner();
startOutlineLoop();

registerCommands();
startCommandQueue();
