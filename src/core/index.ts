/**
 * core/index.ts — 核心模块统一导出
 */
export { registerVeinMiner } from './VeinMiner';
export { bfsScan, sortByDistance } from './Scanner';
export type { Pos, ScanResult } from './Scanner';
export { scanLeaves } from './TreeDetector';
export { executeBreak } from './BreakExecutor';