# VeinMiner

Sneak + mine to vein mine connected blocks. Chat `#vm` for settings.

## Structure

```
├── src/                    TypeScript source
├── behavior_pack/          Behavior pack (manifest, texts, pack_icon)
│   └── scripts/main.js     ← build output (gitignored)
├── build.mjs               esbuild bundle + zip .mcpack
├── tsconfig.json
└── package.json
```

## Build

```bash
npm install
npm run build
# → upload/VeinMiner-v0.3.2.mcpack
```

## Install

1. Copy `VeinMiner-*.mcpack` to device, open with Minecraft
2. Enable "Beta APIs" in world settings
3. Activate VeinMiner behavior pack

## Usage

- **Sneak + mine** connected ore/log blocks
- **`#vm`** open settings (DDUI 3-tab form)
- **`#vm on` / `#vm off`** toggle vein mining
- **`#vm reload`** hot reload

## Requirements

- Engine: 1.21.0+
- `@minecraft/server` 2.8.0
- `@minecraft/server-ui` 2.1.0 (experimental)