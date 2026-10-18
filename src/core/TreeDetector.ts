/**
 * TreeDetector.ts — 树叶扫描
 *
 * 旧实现：对每个原木都跑一遍 (2r+1)^3 立方体，
 * 64 个原木 × 729 次 getBlock ≈ 4.6 万次读方块，砍大树会明显卡顿。
 * 现在改为：先求原木包围盒，只在包围盒外扩 r 的区域内扫描一次。
 */

import { Dimension } from '@minecraft/server';
import { Pos } from './Scanner';
import { LEAF_SCAN_RADIUS, LEAF_MAX_COUNT } from '../config';

/** 单次树叶扫描的最大方块读取次数，防止极端大树卡服 */
const MAX_SCAN_READS = 6000;

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
    if (logPositions.length === 0) return leaves;

    const visited = new Set<string>();
    const logKeys = new Set<string>();
    for (const log of logPositions) logKeys.add(`${log.x},${log.y},${log.z}`);

    // 包围盒
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of logPositions) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.z < minZ) minZ = p.z;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
        if (p.z > maxZ) maxZ = p.z;
    }

    const fromX = minX - maxRadius;
    const toX = maxX + maxRadius;
    const fromY = minY - maxRadius;
    const toY = maxY + maxRadius;
    const fromZ = minZ - maxRadius;
    const toZ = maxZ + maxRadius;

    let reads = 0;

    for (let x = fromX; x <= toX; x++) {
        for (let y = fromY; y <= toY; y++) {
            for (let z = fromZ; z <= toZ; z++) {
                if (leaves.length >= maxCount) return leaves;
                if (++reads > MAX_SCAN_READS) return leaves;

                const k = `${x},${y},${z}`;
                if (logKeys.has(k) || visited.has(k)) continue;
                visited.add(k);

                try {
                    const block = dim.getBlock({ x, y, z });
                    if (block && leafTypeIds.has(block.typeId)) {
                        leaves.push({ x, y, z });
                    }
                } catch {
                    // 维度边界外等异常，忽略
                }
            }
        }
    }

    return leaves;
}
