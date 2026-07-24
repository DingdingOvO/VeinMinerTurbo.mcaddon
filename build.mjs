/**
 * build.mjs -- VeinMinerTurbo Build Script
 *
 * Single source of truth: package.json "version" field.
 * Automatically syncs version to behavior_pack/manifest.json and resource_pack/manifest.json.
 *
 * Usage:
 *   node build.mjs            # bundle + package .mcaddon
 *   node build.mjs --watch    # esbuild watch (no packaging)
 *   node build.mjs --bundle   # bundle only, no packaging
 *   node build.mjs --pack     # package only (skip bundle)
 *   node build.mjs --clean    # remove build artifacts
 *   node build.mjs --version  # print current version
 *   PACK_VERSION=v0.1.0 node build.mjs  # override version
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { build as esbuild, context as esbuildContext } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const BP_DIR = path.join(ROOT, 'behavior_pack');
const RP_DIR = path.join(ROOT, 'resource_pack');
const ENTRY = path.join(ROOT, 'src', 'main.ts');
const OUTPUT_DIR = path.join(ROOT, 'upload');
const DOWNLOAD_DIR = path.join(ROOT, '..', 'download');
const BP_MANIFEST = path.join(BP_DIR, 'manifest.json');
const RP_MANIFEST = path.join(RP_DIR, 'manifest.json');

// ═══════════════════════════════════════
//  Version — single source of truth
// ═══════════════════════════════════════

function readPkgVersion() {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    return pkg.version;
}

/** "0.0.3" → "v0.0.3" */
function toTag(v) { return `v${v}`; }

/** "0.0.3" → [0, 0, 3] */
function toSemverArray(v) { return v.split('.').map(Number); }

const RAW_VERSION = process.env.PACK_VERSION || readPkgVersion();
const VERSION = toTag(RAW_VERSION);
const VERSION_ARRAY = toSemverArray(RAW_VERSION);

// ═══════════════════════════════════════
//  Sync version to manifests
// ═══════════════════════════════════════

function syncManifestVersion(manifestPath) {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);
    manifest.header.version = VERSION_ARRAY;
    for (const mod of manifest.modules) {
        mod.version = VERSION_ARRAY;
    }
    // Sync RP dependency on BP version
    for (const dep of (manifest.dependencies || [])) {
        if (dep.uuid) dep.version = VERSION_ARRAY;
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');
}

function syncVersions() {
    syncManifestVersion(BP_MANIFEST);
    syncManifestVersion(RP_MANIFEST);
    console.log(`  Synced version ${VERSION} to manifests`);
}

// ═══════════════════════════════════════
//  esbuild bundle
// ═══════════════════════════════════════

const ESBUILD_OPTIONS = {
    entryPoints: [ENTRY],
    bundle: true,
    outfile: path.join(BP_DIR, 'scripts', 'main.js'),
    format: 'esm',
    target: 'es2022',
    platform: 'neutral',
    minify: false,
    sourcemap: false,
    external: ['@minecraft/server', '@minecraft/server-ui'],
    legalComments: 'inline',
};

async function bundle() {
    console.log('  Bundling TypeScript...');
    const outDir = path.join(BP_DIR, 'scripts');
    if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    await esbuild(ESBUILD_OPTIONS);

    const size = (fs.statSync(ESBUILD_OPTIONS.outfile).size / 1024).toFixed(1);
    console.log(`  main.js (${size} KB)`);
}

async function watch() {
    console.log('  Watching for changes... (Ctrl+C to stop)');
    const outDir = path.join(BP_DIR, 'scripts');
    if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    const ctx = await esbuildContext(ESBUILD_OPTIONS);
    await ctx.watch();
    // Keep process alive
    await new Promise(() => {});
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
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const bpPack = path.join(OUTPUT_DIR, `VeinMinerTurbo-BP-${VERSION}.mcpack`);
    const rpPack = path.join(OUTPUT_DIR, `VeinMinerTurbo-RP-${VERSION}.mcpack`);
    const mcaddon = path.join(OUTPUT_DIR, `VeinMinerTurbo-${VERSION}.mcaddon`);

    console.log('  Packaging BP...');
    zipPack(BP_DIR, bpPack);

    console.log('  Packaging RP...');
    zipPack(RP_DIR, rpPack);

    console.log('  Creating .mcaddon...');
    if (fs.existsSync(mcaddon)) fs.unlinkSync(mcaddon);
    execSync(
        `cd "${OUTPUT_DIR}" && zip "${mcaddon}" "${path.basename(bpPack)}" "${path.basename(rpPack)}"`,
        { stdio: 'pipe' },
    );
    const kb = (fs.statSync(mcaddon).size / 1024).toFixed(1);
    console.log(`  ${path.basename(mcaddon)} (${kb} KB)`);

    // Copy to download directory
    if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    const dlFile = path.join(DOWNLOAD_DIR, `VeinMinerTurbo-${VERSION}.mcaddon`);
    fs.copyFileSync(mcaddon, dlFile);
    console.log(`  Copied to download/`);
}

// ═══════════════════════════════════════
//  CLI
// ═══════════════════════════════════════

const args = process.argv.slice(2);

if (args.includes('--version')) {
    console.log(VERSION);
    process.exit(0);
}

if (args.includes('--clean')) {
    const scriptsDir = path.join(BP_DIR, 'scripts');
    if (fs.existsSync(scriptsDir)) fs.rmSync(scriptsDir, { recursive: true, force: true });
    if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    console.log('  Build artifacts cleaned');
    process.exit(0);
}

const doWatch = args.includes('--watch');
const bundleOnly = args.includes('--bundle');
const packOnly = args.includes('--pack');

console.log(`\n=== VeinMinerTurbo ${VERSION} ===\n`);

syncVersions();

if (doWatch) {
    await watch();
} else if (packOnly) {
    packagePacks();
} else {
    await bundle();
    if (!bundleOnly) packagePacks();
}

if (!doWatch) console.log('\n  Done.');
