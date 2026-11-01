/**
 * registry.ts — 自定义命令注册 + 执行队列
 *
 * 为什么要有队列：
 *   自定义命令的回调运行在 restricted execution 里，不能直接用 ModalFormData.show()
 *   或 setActionBar()。命令回调只把任务丢进数组，真正的执行放在模块顶层的
 *   system.runInterval 里，那个上下文没有限制。
 *
 * 权限：
 *   permissionLevel: Any + cheatsRequired: false → 普通成员也能用，不需要 OP。
 */

import {
    world, system, CommandPermissionLevel, CustomCommandParamType,
    CustomCommandStatus,
} from '@minecraft/server';
import { runAction, ModuleId } from './index';

interface CmdDef {
    name: string;
    description: string;
    module: ModuleId;
    /** 可选参数个数，全部按 string 收，模块自己解析 */
    params: number;
}

const CMDS: CmdDef[] = [
    { name: 'vm:help', description: '命令列表 /vm:help [wl|c|ad]', module: 'help', params: 1 },
    { name: 'vm:h', description: '命令列表（同 vm:help）', module: 'help', params: 1 },
    { name: 'vm:wl', description: '白名单 add/remove/list/clear', module: 'wl', params: 2 },
    { name: 'vm:whitelist', description: '白名单（同 vm:wl）', module: 'wl', params: 2 },
    { name: 'vm:c', description: '设置 toggle/outline/menu', module: 'cfg', params: 1 },
    { name: 'vm:cfg', description: '设置（同 vm:c）', module: 'cfg', params: 1 },
    { name: 'vm:ad', description: '管理命令（仅 OP）', module: 'ad', params: 3 },
    { name: 'vm:admin', description: '管理命令（同 vm:ad）', module: 'ad', params: 3 },
];

interface PendingJob {
    playerId: string;
    module: ModuleId;
    args: string[];
}

const pendingJobs: PendingJob[] = [];

/** 命令参数可能不是字符串（数字/实体引用），统一转成字符串 */
function toStr(v: unknown): string {
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    const obj = v as { id?: unknown };
    if (obj && typeof obj.id === 'string') return obj.id;
    return '';
}

export function registerCommands(): void {
    try {
        system.beforeEvents.startup.subscribe((ev) => {
            const reg = ev.customCommandRegistry;

            for (const def of CMDS) {
                const optional = Array.from({ length: def.params }, (_, i) => ({
                    name: `arg${i + 1}`,
                    type: CustomCommandParamType.String,
                }));

                try {
                    reg.registerCommand(
                        {
                            name: def.name,
                            description: def.description,
                            permissionLevel: CommandPermissionLevel.Any,
                            cheatsRequired: false,
                            optionalParameters: optional,
                        },
                        (origin, ...rest) => {
                            const src = origin.sourceEntity;
                            if (!src || src.typeId !== 'minecraft:player') {
                                return { status: CustomCommandStatus.Failure, message: '只能由玩家执行' };
                            }

                            pendingJobs.push({
                                playerId: src.id,
                                module: def.module,
                                args: rest.map(toStr),
                            });
                            return { status: CustomCommandStatus.Success };
                        },
                    );
                } catch (error) {
                    console.warn(`[VMT] register ${def.name} failed: ${error}`);
                }
            }
        });
    } catch (error) {
        console.warn(`[VMT] custom command registration unavailable: ${error}`);
    }
}

/** 独立 tick 消费队列（不在 restricted execution 里） */
export function startCommandQueue(): void {
    system.runInterval(() => {
        if (pendingJobs.length === 0) return;

        const job = pendingJobs.shift();
        if (!job) return;

        const player = world.getAllPlayers().find(p => p.id === job.playerId);
        if (!player) return;

        try {
            runAction(player, job.module, job.args);
        } catch (error) {
            console.warn(`[VMT] command ${job.module} failed: ${error}`);
        }
    }, 1);
}
