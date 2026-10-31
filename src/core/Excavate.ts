/**
 * Excavate.ts — 立方体范围挖掘（普通方块白名单用）
 *
 * 矿石/原木走 BFS 连通扫描；石头、泥土这类进白名单后只按立方体挖。
 * 长(X)/宽(Z)/高(Y) 各自独立，默认 3×3×3，最大 7×7×7。
 *
 * 只挖与起点同 typeId 的方块，避免顺手把矿脉/箱子一起带走。
 */

import { Dimension, Vector3 } from '@minecraft/server';
import { Pos } from './Scanner';
import { CubeSize } from '../config';

/** 长度 n 时，负方向取多少格 */
function lowHalf(n: number): number {
    return -Math.floor((n - 1) / 2);
}

/**
 * 扫描以 origin 为中心的长方体范围，只收同类型方块。
 * 返回结果第一个元素固定是起点（与 bfsScan 行为一致，方便上层 slice(1)）。
 */
export function scanCube(
    dim: Dimension,
    origin: Vector3,
    targetId: string,
    size: CubeSize,
    maxBlocks: number,
): Pos[] {
    const ox = Math.floor(origin.x);
    const oy = Math.floor(origin.y);
    const oz = Math.floor(origin.z);

    const lx = lowHalf(size.x);
    const ly = lowHalf(size.y);
    const lz = lowHalf(size.z);

    const out: Pos[] = [{ x: ox, y: oy, z: oz }];
    if (maxBlocks <= 1) return out;

    // 按到中心的距离从近到远排，保证优先挖近处
    const cand: Array<Pos & { d: number }> = [];

    for (let dx = lx; dx < lx + size.x; dx++) {
        for (let dy = ly; dy < ly + size.y; dy++) {
            for (let dz = lz; dz < lz + size.z; dz++) {
                if (dx === 0 && dy === 0 && dz === 0) continue;

                const nx = ox + dx;
                const ny = oy + dy;
                const nz = oz + dz;

                try {
                    const block = dim.getBlock({ x: nx, y: ny, z: nz });
                    if (!block || block.typeId !== targetId) continue;
                } catch {
                    continue;
                }

                cand.push({
                    x: nx, y: ny, z: nz,
                    d: Math.abs(dx) + Math.abs(dy) + Math.abs(dz),
                });
            }
        }
    }

    cand.sort((a, b) => a.d - b.d);

    for (const c of cand) {
        if (out.length >= maxBlocks) break;
        out.push({ x: c.x, y: c.y, z: c.z });
    }

    return out;
}
