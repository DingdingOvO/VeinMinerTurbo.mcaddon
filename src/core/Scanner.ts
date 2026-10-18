/**
 * Scanner.ts — BFS 连锁扫描引擎
 *
 * 矿石/石头使用 6 面方向
 * 原木使用 26 面方向（覆盖斜向生长）
 */

import { Dimension, Vector3 } from '@minecraft/server';

// ═══════════════════════════════════════
//  方向向量
// ═══════════════════════════════════════

const DIR_6: Vector3[] = [
    { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
];

const DIR_26: Vector3[] = [];
for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++)
            if (dx || dy || dz) DIR_26.push({ x: dx, y: dy, z: dz });

// ═══════════════════════════════════════
//  类型
// ═══════════════════════════════════════

export interface Pos {
    x: number;
    y: number;
    z: number;
}

export interface ScanResult {
    blocks: Pos[];
    timedOut: boolean;
}

// ═══════════════════════════════════════
//  BFS 扫描
// ═══════════════════════════════════════

/**
 * 坐标 key。
 * 旧实现用 BigInt 左移 + 异或：负数会按补码符号扩展，导致不同坐标得到相同 key，
 * 表现为漏块 / 重复访问。这里改为字符串 key，无碰撞。
 */
function posKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
}

/** BFS 最大迭代次数硬限制，防止极端情况下卡服 */
const MAX_BFS_ITERATIONS = 20000;

/**
 * BFS 扫描相连的同类型方块
 * @param dim       维度
 * @param start     起点坐标
 * @param targetId  目标方块 typeId
 * @param maxBlocks 最大数量
 * @param timeoutMs 超时（ms）
 * @param use26Dir  是否使用26面方向（原木=true，矿石=false）
 * @param maxDepth  最大搜索深度（BFS 层数，1 = 只找相邻一圈）
 */
export function bfsScan(
    dim: Dimension,
    start: Vector3,
    targetId: string,
    maxBlocks: number,
    timeoutMs: number,
    use26Dir: boolean,
    maxDepth: number = 32,
): ScanResult {
    const dirs = use26Dir ? DIR_26 : DIR_6;
    const sx = Math.floor(start.x);
    const sy = Math.floor(start.y);
    const sz = Math.floor(start.z);

    const result: Pos[] = [{ x: sx, y: sy, z: sz }];
    const visited = new Set<string>([posKey(sx, sy, sz)]);
    // 队列同时记录层数，用于 maxDepth 限制
    const queue: Array<{ x: number; y: number; z: number; d: number }> = [
        { x: sx, y: sy, z: sz, d: 0 },
    ];
    const t0 = Date.now();
    let iterations = 0;
    let head = 0;

    while (head < queue.length) {
        if (++iterations > MAX_BFS_ITERATIONS) {
            console.warn(`[VMT] BFS 达到迭代上限，已收集 ${result.length} 个方块`);
            return { blocks: result, timedOut: false };
        }
        if (Date.now() - t0 > timeoutMs) return { blocks: result, timedOut: true };
        if (result.length >= maxBlocks) return { blocks: result, timedOut: false };

        // 用 head 索引代替 shift()，避免每轮 O(n) 数组搬移
        const cur = queue[head++];

        if (cur.d >= maxDepth) continue;

        for (const d of dirs) {
            const nx = cur.x + d.x;
            const ny = cur.y + d.y;
            const nz = cur.z + d.z;
            const k = posKey(nx, ny, nz);
            if (visited.has(k)) continue;
            visited.add(k);

            try {
                const block = dim.getBlock({ x: nx, y: ny, z: nz });
                if (!block || block.typeId !== targetId) continue;
            } catch {
                continue;
            }

            const pos: Pos = { x: nx, y: ny, z: nz };
            result.push(pos);
            queue.push({ ...pos, d: cur.d + 1 });
            if (result.length >= maxBlocks) return { blocks: result, timedOut: false };
        }
    }

    return { blocks: result, timedOut: false };
}

// ═══════════════════════════════════════
//  距离排序（曼哈顿距离，从近到远）
// ═══════════════════════════════════════

export function sortByDistance(blocks: Pos[], origin: Vector3): Pos[] {
    return [...blocks].sort((a, b) => {
        const da = Math.abs(a.x - origin.x) + Math.abs(a.y - origin.y) + Math.abs(a.z - origin.z);
        const db = Math.abs(b.x - origin.x) + Math.abs(b.y - origin.y) + Math.abs(b.z - origin.z);
        return da - db;
    });
}
