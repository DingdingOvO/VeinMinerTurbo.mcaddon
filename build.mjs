/**
 * build.mjs -- VeinMiner Build Script (BP only)
 *
 * src/*.ts  --esbuild bundle-->  behavior_pack/scripts/main.js
 * behavior_pack/  --zip-->  VeinMiner.mcpack
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { build as esbuild } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

const BP_DIR = path.join(ROOT, 'behavior_pack');
const ENTRY = path.join(ROOT, 'src', 'main.ts');
const OUTPUT_DIR = path.join(ROOT, 'upload');

// ═══════════════════════════════════════
//  esbuild
// ═══════════════════════════════════════

async function bundle() {
    console.log('  Bundling...');

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

function packagePacks() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const version = 'v0.3.2';
    const name = `VeinMiner-${version}.mcpack`;
    const outPath = path.join(OUTPUT_DIR, name);

    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

    execSync(`cd "${BP_DIR}" && zip -r "${outPath}" .`, { stdio: 'pipe' });
    console.log(`  ${name} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
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

console.log('\n=== VeinMiner Build ===\n');

await bundle();
packagePacks();

console.log('\n  Done.');