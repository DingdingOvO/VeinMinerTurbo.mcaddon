/**
 * TreeDetector.ts — 树叶扫描
 *
 * 在原木位置周围搜索树叶方块
 */

import { Dimension } from '@minecraft/server';
import { Pos } from './Scanner';
import { LEAF_SCAN_RADIUS, LEAF_MAX_COUNT } from '../config';

/**
 * 在原木位置周围扫描树叶
 * @param dim          维度
 * @param logPositions 原木坐标列表
 * @param leafTypeIds  树叶 typeId 集合
 * @param maxRadius    扫描半径（曼哈顿距离），默认使用常量
 * @param maxCount     最大树叶数量，默认使用常量
 */
export function scanLeaves(
    dim: Dimension,
    logPositions: Pos[],
    leafTypeIds: ReadonlySet<string>,
    maxRadius: number = LEAF_SCAN_RADIUS,
    maxCount: number = LEAF_MAX_COUNT,
): Pos[] {
    const leaves: Pos[] = [];
    const visited = new Set<string>();

    for (const log of logPositions) {
        if (leaves.length >= maxCount) break;

        for (let dx = -maxRadius; dx <= maxRadius; dx++) {
            if (leaves.length >= maxCount) break;
            for (let dy = -maxRadius; dy <= maxRadius; dy++) {
                if (leaves.length >= maxCount) break;
                for (let dz = -maxRadius; dz <= maxRadius; dz++) {
                    if (leaves.length >= maxCount) break;

                    const dist = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
                    if (dist > maxRadius || dist === 0) continue;

                    const nx = log.x + dx;
                    const ny = log.y + dy;
                    const nz = log.z + dz;
                    const k = `${nx},${ny},${nz}`;

                    if (visited.has(k)) continue;
                    visited.add(k);

                    try {
                        const block = dim.getBlock({ x: nx, y: ny, z: nz });
                        if (block && leafTypeIds.has(block.typeId)) {
                            leaves.push({ x: nx, y: ny, z: nz });
                        }
                    } catch {
                        // 维度边界外等异常，忽略
                    }
                }
            }
        }
    }

    return leaves;
}