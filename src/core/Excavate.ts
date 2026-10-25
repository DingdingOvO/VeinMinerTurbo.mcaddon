/**
 * Excavate.ts — 3×3×3 挖掘（预留）
 *
 * 开启后，挖掘任意方块时以 3×3×3 范围破坏
 * 暂未实现，仅保留接口
 */

import { Dimension, Vector3 } from '@minecraft/server';
import { Pos } from './Scanner';


/**
 * 生成 3×3×3 范围内的方块坐标（排除起点）
 * @param origin 起点坐标
 * @param dim    维度（用于检查方块是否存在）
 * @param maxBlocks 最大数量限制
 */
export function getExcavateBlocks(
    origin: Vector3,
    dim: Dimension,
    maxBlocks: number = 27,
): Pos[] {
    const blocks: Pos[] = [];
    const ox = Math.floor(origin.x);
    const oy = Math.floor(origin.y);
    const oz = Math.floor(origin.z);

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (dx === 0 && dy === 0 && dz === 0) continue; // 排除起点

                const nx = ox + dx;
                const ny = oy + dy;
                const nz = oz + dz;

                try {
                    const block = dim.getBlock({ x: nx, y: ny, z: nz });
                    if (block && block.typeId !== 'minecraft:air') {
                        blocks.push({ x: nx, y: ny, z: nz });
                        if (blocks.length >= maxBlocks) return blocks;
                    }
                } catch {
                    continue;
                }
            }
        }
    }

    return blocks;
}