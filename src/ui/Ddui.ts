/**
 * Ddui.ts — 数据驱动表单（DDUI / CustomForm）
 *
 * 26.x 的 server-ui 提供了 CustomForm：可以分节（header / label / divider / spacer），
 * 每个控件还能带一行灰色说明文字和 tooltip，值通过 Observable 回传。
 * 比起老的 ModalFormData 把七八个控件平铺在一屏，这套排版清楚得多。
 *
 * 兼容处理：用命名空间导入 + 运行时探测。
 * 如果某个版本没有导出 CustomForm，这里返回 false，调用方退回老表单，
 * 不会因为一个 import 失败就把整个脚本干掉。
 */

import type { Player } from '@minecraft/server';
import * as ServerUI from '@minecraft/server-ui';
import {
    getPlayerMaxVein, setPlayerMaxVein,
    getPlayerAutoLeaves, setPlayerAutoLeaves,
    getPlayerCollectDrops, setPlayerCollectDrops,
    getPlayerMaxDepth, setPlayerMaxDepth,
    getPlayerDurabilityGuard, setPlayerDurabilityGuard,
    getPlayerOutline, setPlayerOutline,
    getPlayerCubeSize, setPlayerCubeSize,
    CUBE_SIZE_MIN, CUBE_SIZE_MAX,
    HARD_MAX_VEIN,
} from '../config';
import { t, tagged } from '../utils/LangHelper';

/** 只声明用到的那几个成员，避免被类型绑死 */
interface DduiApi {
    CustomForm?: new (player: Player, title: string) => DduiForm;
    ObservableNumber?: new (value: number, options?: { clientWritable?: boolean }) => DduiNumber;
    ObservableBoolean?: new (value: boolean, options?: { clientWritable?: boolean }) => DduiBoolean;
}

interface DduiForm {
    header(text: string): DduiForm;
    label(text: string): DduiForm;
    divider(): DduiForm;
    spacer(): DduiForm;
    slider(label: string, value: DduiNumber, min: number, max: number, options?: Record<string, unknown>): DduiForm;
    toggle(label: string, value: DduiBoolean, options?: Record<string, unknown>): DduiForm;
    closeButton(): DduiForm;
    show(): Promise<unknown>;
}

interface DduiNumber {
    getData(): number;
}

interface DduiBoolean {
    getData(): boolean;
}

const API = ServerUI as unknown as DduiApi;

/** 当前版本是否支持 CustomForm */
export function hasDdui(): boolean {
    return typeof API.CustomForm === 'function'
        && typeof API.ObservableNumber === 'function'
        && typeof API.ObservableBoolean === 'function';
}

/**
 * 打开设置页。
 * @returns true 表示已经用 DDUI 展示过（无论玩家是否保存）；false 表示不可用，调用方该退回老表单。
 */
export async function showSettingsDdui(player: Player): Promise<boolean> {
    if (!hasDdui()) return false;

    const Form = API.CustomForm!;
    const Num = API.ObservableNumber!;
    const Bool = API.ObservableBoolean!;

    const size = getPlayerCubeSize(player);

    // clientWritable 表示这些值由界面写回，脚本只读
    const oX = new Num(size.x, { clientWritable: true });
    const oY = new Num(size.y, { clientWritable: true });
    const oZ = new Num(size.z, { clientWritable: true });
    const oMaxVein = new Num(getPlayerMaxVein(player), { clientWritable: true });
    const oMaxDepth = new Num(getPlayerMaxDepth(player), { clientWritable: true });
    const oGuard = new Bool(getPlayerDurabilityGuard(player), { clientWritable: true });
    const oCollect = new Bool(getPlayerCollectDrops(player), { clientWritable: true });
    const oLeaves = new Bool(getPlayerAutoLeaves(player), { clientWritable: true });
    const oOutline = new Bool(getPlayerOutline(player), { clientWritable: true });

    let form: DduiForm;
    try {
        form = new Form(player, t('veinminer.ui.title', player));
        form
            // ── 范围 ──
            .header(t('veinminer.ui.sec.range', player))
            .label(t('veinminer.ui.desc.range', player))
            .slider(t('veinminer.ui.size_x', player), oX, CUBE_SIZE_MIN, CUBE_SIZE_MAX, {
                step: 1,
                description: t('veinminer.ui.desc.size_x', player),
            })
            .slider(t('veinminer.ui.size_y', player), oY, CUBE_SIZE_MIN, CUBE_SIZE_MAX, {
                step: 1,
                description: t('veinminer.ui.desc.size_y', player),
            })
            .slider(t('veinminer.ui.size_z', player), oZ, CUBE_SIZE_MIN, CUBE_SIZE_MAX, {
                step: 1,
                description: t('veinminer.ui.desc.size_z', player),
            })
            .divider()
            // ── 上限 ──
            .header(t('veinminer.ui.sec.limit', player))
            .slider(t('veinminer.ui.max_vein', player), oMaxVein, 1, HARD_MAX_VEIN, {
                step: 1,
                description: t('veinminer.ui.desc.max_vein', player),
            })
            .slider(t('veinminer.ui.max_depth', player), oMaxDepth, 1, 32, {
                step: 1,
                description: t('veinminer.ui.desc.max_depth', player),
            })
            .toggle(t('veinminer.ui.durability_full', player), oGuard, {
                description: t('veinminer.ui.desc.guard', player),
            })
            .divider()
            // ── 采集行为 ──
            .header(t('veinminer.ui.sec.behavior', player))
            .toggle(t('veinminer.ui.collect_drops_full', player), oCollect, {
                description: t('veinminer.ui.desc.collect', player),
            })
            .toggle(t('veinminer.ui.auto_leaves_full', player), oLeaves, {
                description: t('veinminer.ui.desc.leaves', player),
            })
            .divider()
            // ── 显示 ──
            .header(t('veinminer.ui.sec.display', player))
            .toggle(t('veinminer.ui.outline', player), oOutline, {
                description: t('veinminer.ui.desc.outline', player),
            })
            .spacer()
            .closeButton();
    } catch (e) {
        console.warn(`[VMT] ddui 建表失败，退回旧表单: ${e}`);
        return false;
    }

    try {
        await form.show();
    } catch (e) {
        console.warn(`[VMT] ddui 显示失败，退回旧表单: ${e}`);
        return false;
    }

    // 关掉界面后统一落盘
    setPlayerCubeSize(player, { x: oX.getData(), y: oY.getData(), z: oZ.getData() });
    setPlayerMaxVein(player, oMaxVein.getData());
    setPlayerMaxDepth(player, oMaxDepth.getData());
    setPlayerDurabilityGuard(player, oGuard.getData());
    setPlayerCollectDrops(player, oCollect.getData());
    setPlayerAutoLeaves(player, oLeaves.getData());
    setPlayerOutline(player, oOutline.getData());

    player.sendMessage(tagged('veinminer.ui.saved', player));
    return true;
}
