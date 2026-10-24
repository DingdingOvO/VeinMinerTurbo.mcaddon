# VeinMinerTurbo

A high-performance vein mining addon for Minecraft Bedrock Edition. Sneak + mine to chain-break connected ores, logs, and whitelisted blocks.

Single behavior pack. No HUD, no custom items, no JSON UI, no resource pack — driven by custom commands that regular members can run.

## Features

- **Sneak + Mine** — Hold sneak and break a block to chain-mine all connected same-type blocks
- **BFS Scanner** — Flood-fill with configurable max range, max depth, and 100ms timeout to prevent server lag
- **Per-Tick Queue** — Breaks blocks in batches of 20/tick across ticks, zero server freeze
- **Enchantment Support** — Silk Touch and Fortune are applied to every chained block, not just the first one
- **Auto Leaves** — When chopping trees, optionally break nearby leaves too
- **Drop Collection** — Teleport all drops to the break origin for easy pickup
- **Durability Guard** — Stops the chain before the tool breaks
- **Whitelist** — Add any block to your personal mining whitelist
- **i18n** — English, 简体中文, 繁體中文, resolved per player from `player.clientSystemInfo.locale` (no resource pack needed)

## Commands

All commands use `/scriptevent`:

| Command | Permission | Description |
|---|---|---|
| `/vm:menu` | Any (member) | Open settings menu |
| `/vm:toggle` | Any (member) | Toggle vein mining on/off |
| `/vm:add` | Any (member) | Add looked-at block to whitelist |
| `/scriptevent vm:s` | OP | Legacy alias |
| `/scriptevent vm:t` | OP | Legacy alias |
| `/scriptevent vm:a` | OP | Legacy alias |

Custom commands are registered with `permissionLevel: Any` and `cheatsRequired: false`, so regular members can use them without operator status.

## Project Structure

```
VeinMinerTurbo/
├── src/
│   ├── main.ts              # Entry point, scriptEvent listeners
│   ├── core/
│   │   ├── VeinMiner.ts      # Block break event handler
│   │   ├── Scanner.ts        # BFS flood-fill scanner
│   │   ├── BreakExecutor.ts  # Per-tick batch breaking + drop collection
│   │   ├── TreeDetector.ts   # Leaf detection around broken logs
│   │   └── Excavate.ts       # Excavation mode (experimental)
│   ├── ui/
│   │   ├── VeinMinerUI.ts    # Settings form (ModalFormData)
│   │   └── WhiteListManager.ts
│   ├── config/
│   │   ├── Constants.ts      # Default values
│   │   ├── PlayerConfig.ts   # DynamicProperty-based per-player config
│   │   └── blocks/           # Ore, Log, Leaf, Blacklist block ID lists
│   └── utils/
│       ├── LangHelper.ts     # RawMessage.translate helpers
│       ├── EnchantmentHelper.ts  # Fortune/Silk Touch drop calculation
│       └── ToolHelper.ts     # Durability check
├── behavior_pack/
│   ├── manifest.json
│   ├── texts/
│   └── scripts/main.js       # ← esbuild output (gitignored)
├── .github/workflows/release.yml
├── build.mjs
├── tsconfig.json
└── package.json
```

## Build

```bash
npm install
npm run build
# → upload/VeinMinerTurbo-v0.3.1.mcaddon
```

Set version via environment variable:

```bash
PACK_VERSION=v0.2.1 npm run build
```

## Install

1. Download `VeinMinerTurbo-*.mcaddon` from [Releases](https://github.com/DingdingOvO/VeinMinerTurbo.mcaddon/releases)
2. Open the `.mcaddon` file with Minecraft (or copy to device and open)
3. In world settings, enable **Beta APIs** ("Experiments" → turn on "Beta APIs")
4. Activate the VeinMinerTurbo **Behavior Pack** (a single pack — no resource pack required)

## Usage

1. **Sneak + Mine** any ore, log, or whitelisted block to chain-break all connected blocks
2. **`/vm:menu`** opens the settings menu:
   - Vein mining on/off
   - Max range (1–256 blocks)
   - Max search depth (1–32)
   - Durability guard (stops before the tool breaks)
   - Clear custom whitelist
   - Drop collection (OP only)
   - Auto leaves (OP only)
3. **`/vm:toggle`** toggles vein mining
4. **`/vm:add`** adds the block you're looking at to your whitelist

## Requirements

- Minecraft Bedrock **1.21.90+**
- `@minecraft/server` **2.8.0**
- `@minecraft/server-ui` **2.1.0**
- World setting: **Beta APIs** enabled

## Tech Stack

- **TypeScript** + **esbuild** (ESM bundle)
- **Bedrock Script API** — `world.beforeEvents.playerBreakBlock`, `system.afterEvents.scriptEventReceive`
- **ModalFormData** for the settings menu
- **Embedded i18n tables** selected by `player.clientSystemInfo.locale`
- **DynamicProperties** for per-player persistent config

## License

MIT
