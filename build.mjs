/**
 * build.mjs -- VeinMiner Build Script (BP + RP)
 *
 * src/*.ts  --esbuild bundle-->  behavior_pack/scripts/main.js
 * behavior_pack/  --zip-->  VeinMiner-BP-v0.0.1.mcpack
 * resource_pack/  --zip-->  VeinMiner-RP-v0.0.1.mcpack
 * both mcpacks  --zip-->  VeinMiner-v0.0.1.mcaddon
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { build as esbuild } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const BP_DIR = path.join(ROOT, 'behavior_pack');
const RP_DIR = path.join(ROOT, 'resource_pack');
const ENTRY = path.join(ROOT, 'src', 'main.ts');
const OUTPUT_DIR = path.join(ROOT, 'upload');
const VERSION = 'v0.0.1';

// ═══════════════════════════════════════
//  esbuild
// ═══════════════════════════════════════

async function bundle() {
    console.log('  Bundling TypeScript...');

    const outDir = path.join(BP_DIR, 'scripts');
    if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outDir, { recursive: true });

    await esbuild({
        entryPoints: [ENTRY],
        bundle: true,
        outfile: path.join(outDir, 'main.js'),
        format: 'esm',
        target: 'es2022',
        platform: 'neutral',
        minify: false,
        sourcemap: false,
        external: ['@minecraft/server', '@minecraft/server-ui'],
        legalComments: 'inline',
    });

    const size = (fs.statSync(path.join(outDir, 'main.js')).size / 1024).toFixed(1);
    console.log(`  main.js (${size} KB)`);
}

// ═══════════════════════════════════════
//  Package
// ═══════════════════════════════════════

function zipPack(dir, outFile) {
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
    execSync(`cd "${dir}" && zip -r "${outFile}" . -x "*.DS_Store"`, { stdio: 'pipe' });
    const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
    console.log(`  ${path.basename(outFile)} (${kb} KB)`);
}

function packagePacks() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const bpPack = path.join(OUTPUT_DIR, `VeinMiner-BP-${VERSION}.mcpack`);
    const rpPack = path.join(OUTPUT_DIR, `VeinMiner-RP-${VERSION}.mcpack`);
    const mcaddon = path.join(OUTPUT_DIR, `VeinMiner-${VERSION}.mcaddon`);

    console.log('  Packaging BP...');
    zipPack(BP_DIR, bpPack);

    console.log('  Packaging RP...');
    zipPack(RP_DIR, rpPack);

    console.log('  Creating .mcaddon...');
    if (fs.existsSync(mcaddon)) fs.unlinkSync(mcaddon);
    execSync(
        `cd "${OUTPUT_DIR}" && zip "${mcaddon}" "${path.basename(bpPack)}" "${path.basename(rpPack)}"`,
        { stdio: 'pipe' }
    );
    const kb = (fs.statSync(mcaddon).size / 1024).toFixed(1);
    console.log(`  ${path.basename(mcaddon)} (${kb} KB)`);
}

// ═══════════════════════════════════════
//  Main
// ═══════════════════════════════════════

const args = process.argv.slice(2);

if (args.includes('--clean')) {
    const scriptsDir = path.join(BP_DIR, 'scripts');
    if (fs.existsSync(scriptsDir)) {
        fs.rmSync(scriptsDir, { recursive: true, force: true });
    }
    console.log('  behavior_pack/scripts/ cleaned');
    process.exit(0);
}

console.log(`\n=== VeinMiner Build ${VERSION} ===\n`);

await bundle();
packagePacks();

console.log('\n  Done.');