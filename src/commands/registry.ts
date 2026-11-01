/**
 * registry.ts — 自定义命令注册 + 执行队列
 *
 * 为什么要有队列：
 *   自定义命令的回调运行在 restricted execution 里，不能直接用 ModalFormData.show()
 *   或 setActionBar()。命令回调只把任务丢进数组，真正的执行放在模块顶层的
 *   system.runInterval 里，那个上下文没有限制。
 *
 * 参数类型：
 *   子命令一律用 Enum，游戏会给出下拉补全；方块/玩家这类自由输入仍是 String。
 *   注意 Enum 参数只能填注册过的值，所以简写（a/r/l/c）也一并写进枚举，
 *   否则老习惯打 /vm:wl a 会被命令层直接拒绝。
 *
 * 权限：
 *   permissionLevel: Any + cheatsRequired: false → 普通成员也能用，不需要 OP。
 */

import {
    world, system, CommandPermissionLevel, CustomCommandParamType, CustomCommandParameter,
    CustomCommandStatus,
} from '@minecraft/server';
import { runAction, ModuleId } from './index';

/** 补全用的枚举。名字必须带命名空间 */
const ENUMS: Record<string, string[]> = {
    'vmt:help_mod': ['wl', 'c', 'ad'],
    'vmt:wl_act': ['add', 'a', 'remove', 'r', 'list', 'l', 'clear', 'c'],
    'vmt:cfg_act': ['toggle', 't', 'outline', 'o', 'menu', 'm'],
    'vmt:ad_grp': ['bl', 'lk', 'pb'],
    'vmt:ad_act': ['add', 'a', 'remove', 'r', 'list', 'l', 'builtin', 'bi'],
};

const enumP = (name: string): CustomCommandParameter => ({ name, type: CustomCommandParamType.Enum });
const strP = (name: string): CustomCommandParameter => ({ name, type: CustomCommandParamType.String });

interface CmdDef {
    name: string;
    description: string;
    module: ModuleId;
    /** 全部是可选参数，按顺序对应模块收到的 args */
    params: CustomCommandParameter[];
}

const CMDS: CmdDef[] = [
    {
        name: 'vm:help', description: '命令列表 /vm:help [wl|c|ad]', module: 'help',
        params: [enumP('vmt:help_mod')],
    },
    {
        name: 'vm:h', description: '命令列表（同 vm:help）', module: 'help',
        params: [enumP('vmt:help_mod')],
    },
    {
        name: 'vm:wl', description: '白名单 add/remove/list/clear', module: 'wl',
        params: [enumP('vmt:wl_act'), strP('block')],
    },
    {
        name: 'vm:whitelist', description: '白名单（同 vm:wl）', module: 'wl',
        params: [enumP('vmt:wl_act'), strP('block')],
    },
    {
        name: 'vm:c', description: '设置 toggle/outline/menu', module: 'cfg',
        params: [enumP('vmt:cfg_act')],
    },
    {
        name: 'vm:cfg', description: '设置（同 vm:c）', module: 'cfg',
        params: [enumP('vmt:cfg_act')],
    },
    {
        name: 'vm:ad', description: '管理命令（仅 OP）', module: 'ad',
        params: [enumP('vmt:ad_grp'), enumP('vmt:ad_act'), strP('target')],
    },
    {
        name: 'vm:admin', description: '管理命令（同 vm:ad）', module: 'ad',
        params: [enumP('vmt:ad_grp'), enumP('vmt:ad_act'), strP('target')],
    },
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

            // 先注册枚举，命令的参数类型要引用它们
            for (const [name, values] of Object.entries(ENUMS)) {
                try {
                    reg.registerEnum(name, values);
                } catch (error) {
                    console.warn(`[VMT] registerEnum ${name} failed: ${error}`);
                }
            }

            for (const def of CMDS) {
                try {
                    reg.registerCommand(
                        {
                            name: def.name,
                            description: def.description,
                            permissionLevel: CommandPermissionLevel.Any,
                            cheatsRequired: false,
                            optionalParameters: def.params,
                        },
                        (origin, ...rest) => {
                            const src = origin.sourceEntity;
                            if (!src || src.typeId !== 'minecraft:player') {
                                return { status: CustomCommandStatus.Failure, message: '只能由玩家执行' };
                            }

                            pendingJobs.push({
                                playerId: src.id,
                                module: def.module,
                                args: def.params.map((_, i) => toStr(rest[i])),
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
