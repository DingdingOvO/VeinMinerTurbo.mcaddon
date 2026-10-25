/**
 * Outline.ts — 方块轮廓预览
 *
 * 基岩版没有方块描边 API，这里用白色粒子沿方块表面画虚线框。
 *
 * 三层剔除，保证"只看得到表面、不透视"：
 *   1. 内部面剔除：相邻方块是同类型 → 这个面在矿脉内部，跳过
 *   2. 背面剔除：面法线与"面→眼睛"方向不同向 → 背对玩家，跳过
 *   3. 遮挡剔除：从眼睛向面中心打一条射线，中途命中任何方块 → 被挡住，跳过
 *      （第 3 步是关键，否则埋在石头里的矿脉会把整圈框都画出来）
 *
 * 每 6 tick 刷新一次，粒子寿命约 0.5s，刚好接上不会堆积。
 */

import { world, system, Player, Dimension, Vector3 } from '@minecraft/server';
import { bfsScan } from './Scanner';
import { isWhitelisted, isLogType, getPlayerOutline } from '../config';

/** 最多预览多少个方块 */
const MAX_BLOCKS = 32;
/** 单次最多打多少粒子，超出截断 */
const MAX_PARTICLES = 240;
/** 刷新间隔（tick） */
const INTERVAL = 8;
/** 白色小十字（原地生成，不像 endrod 那样上飘） */
const PARTICLE = 'minecraft:basic_crit_particle';
/** 预览距离上限（格） */
const MAX_DISTANCE = 8;
/** 每个方块最多检测几个面（按朝向排序取前 N，控制射线数量） */
const MAX_FACES_PER_BLOCK = 2;

interface Face {
    n: Vector3;
    c: Array<[number, number, number]>;
}

const FACES: Face[] = [
    { n: { x: 1, y: 0, z: 0 }, c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { n: { x: -1, y: 0, z: 0 }, c: [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]] },
    { n: { x: 0, y: 1, z: 0 }, c: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]] },
    { n: { x: 0, y: -1, z: 0 }, c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { n: { x: 0, y: 0, z: 1 }, c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { n: { x: 0, y: 0, z: -1 }, c: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]] },
];

/** 启动预览循环 */
export function startOutlineLoop(): void {
    system.runInterval(() => {
        for (const player of world.getAllPlayers()) {
            try {
                if (!getPlayerOutline(player)) continue;
                drawFor(player);
            } catch {
                // 玩家切换维度 / 退出，忽略
            }
        }
    }, INTERVAL);
}

function drawFor(player: Player): void {
    const hit = player.getBlockFromViewDirection({ maxDistance: MAX_DISTANCE });
    if (!hit || !hit.block) return;

    const typeId = hit.block.typeId;
    if (!isWhitelisted(typeId)) return;

    const dimension = hit.block.dimension;
    const origin: Vector3 = {
        x: Math.floor(hit.block.location.x),
        y: Math.floor(hit.block.location.y),
        z: Math.floor(hit.block.location.z),
    };

    // 预览扫描：短超时，避免影响主线程
    const scan = bfsScan(dimension, origin, typeId, MAX_BLOCKS, 30, isLogType(typeId), 8);
    if (scan.blocks.length === 0) return;

    const eye = player.getHeadLocation();
    const drawn = new Set<string>();
    let count = 0;

    for (const b of scan.blocks) {
        // 先挑出"朝向我且不在矿脉内部"的面，按正对程度排序
        const candidates: Array<{ face: Face; score: number; center: Vector3 }> = [];

        for (const face of FACES) {
            // 1) 内部面剔除
            try {
                const neighbor = dimension.getBlock({
                    x: b.x + face.n.x,
                    y: b.y + face.n.y,
                    z: b.z + face.n.z,
                });
                if (neighbor && neighbor.typeId === typeId) continue;
            } catch {
                continue;
            }

            // 2) 背面剔除
            const fc = {
                x: b.x + 0.5 + face.n.x * 0.5,
                y: b.y + 0.5 + face.n.y * 0.5,
                z: b.z + 0.5 + face.n.z * 0.5,
            };
            const dx = eye.x - fc.x;
            const dy = eye.y - fc.y;
            const dz = eye.z - fc.z;
            const dot = dx * face.n.x + dy * face.n.y + dz * face.n.z;
            if (dot <= 0) continue;

            const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            candidates.push({ face, score: dot / (len || 1), center: fc });
        }

        candidates.sort((a, b2) => b2.score - a.score);

        for (const cand of candidates.slice(0, MAX_FACES_PER_BLOCK)) {
            // 3) 遮挡剔除
            if (!isFaceVisible(dimension, eye, cand.center)) continue;

            for (const p of facePoints(b.x, b.y, b.z, cand.face)) {
                if (count >= MAX_PARTICLES) return;

                // 只外推 0.01 格，贴着方块表面，几乎不浮空
                const out = {
                    x: p.x + cand.face.n.x * 0.01,
                    y: p.y + cand.face.n.y * 0.01,
                    z: p.z + cand.face.n.z * 0.01,
                };

                const key = `${out.x.toFixed(2)},${out.y.toFixed(2)},${out.z.toFixed(2)}`;
                if (drawn.has(key)) continue;
                drawn.add(key);

                try {
                    dimension.spawnParticle(PARTICLE, out);
                    count++;
                } catch {
                    // 粒子不可用 / 区块未加载
                }
            }
        }
    }
}

/**
 * 从眼睛到面中心打一条射线，中途命中任何方块即视为被遮挡。
 * 目标方块自身不算遮挡（射线在到达面中心前就停住）。
 */
function isFaceVisible(
    dimension: Dimension,
    eye: Vector3,
    faceCenter: Vector3,
): boolean {
    const dx = faceCenter.x - eye.x;
    const dy = faceCenter.y - eye.y;
    const dz = faceCenter.z - eye.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // 贴脸看的情况直接放行，射线起点可能已经在方块内部
    if (len < 0.6) return true;

    try {
        const hit = dimension.getBlockFromRay(
            eye,
            { x: dx / len, y: dy / len, z: dz / len },
            {
                maxDistance: len - 0.2,
                includeLiquidBlocks: false,
                includePassableBlocks: false,
            },
        );
        // 没命中 = 视线畅通
        if (!hit) return true;

        // 命中任何方块（包括同类矿石）都说明这个面被挡住了。
        // 之前这里对同类方块放行，导致矿脉内部的面也被画出来。
        return false;
    } catch {
        // 未加载区块等异常，保守放行
        return true;
    }
}

/**
 * 只取面的 4 个角。
 * 角与角之间间隔 1 格，本身就是虚线的节奏，粒子数量也最少。
 */
function facePoints(x: number, y: number, z: number, face: Face): Vector3[] {
    return face.c.map(([dx, dy, dz]) => ({ x: x + dx, y: y + dy, z: z + dz }));
}

