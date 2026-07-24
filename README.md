# VeinMinerTurbo

A high-performance vein mining addon for Minecraft Bedrock Edition. Sneak + mine to chain-break connected ores, logs, and whitelisted blocks.

## Features

- **Sneak + Mine** — Hold sneak and break a block to chain-mine all connected same-type blocks
- **BFS Scanner** — Flood-fill with configurable max range, depth limit, and 100ms timeout to prevent server lag
- **Per-Tick Queue** — Breaks blocks in batches of 20/tick across ticks, zero server freeze
- **Enchantment Support** — Silk Touch and Fortune are correctly applied to ore drops
- **Auto Leaves** — When chopping trees, optionally break nearby leaves too
- **Drop Collection** — Teleport all drops to the break origin for easy pickup
- **HUD Indicator** — Top-right HUD shows on/off state via JSON UI
- **Whitelist** — Add any block to your personal mining whitelist
- **i18n** — English, 简体中文, 繁體中文
- **Settings UI** — ModalFormData with sliders and toggles

## Project Structure

```
VeinMiner-Package/
├── src/
│   ├── main.ts              # Entry point, scriptEvent listeners, HUD sync
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
│       ├── LangHelper.ts     # RawMessage.translate helpers (t, tf1, tf2, tagged)
│       ├── EnchantmentHelper.ts  # Fortune/Silk Touch drop calculation
│       └── ToolHelper.ts     # Durability check
├── behavior_pack/
│   ├── manifest.json
│   ├── texts/                # en_US.lang, zh_CN.lang, zh_TW.lang
│   └── scripts/main.js       # ← esbuild output (gitignored)
├── resource_pack/
│   ├── manifest.json
│   ├── _ui_defs.json         # UI definitions entry (must be at RP root)
│   ├── ui/
│   │   ├── vm_hud_def.json   # HUD element type definitions
│   │   └── hud_screen.json   # HUD screen modification
│   ├── texts/                # Pack name/description lang files
│   └── pack_icon.png
├── .github/workflows/release.yml
├── build.mjs
├── tsconfig.json
└── package.json
```

## Commands

All commands use `/scriptevent`:

| Command | Description |
|---|---|
| `/scriptevent vm:s` | Open settings UI |
| `/scriptevent vm:t` | Toggle vein mining on/off |
| `/scriptevent vm:a` | Add looked-at block to whitelist |

## Build

```bash
npm install
npm run build
# → upload/VeinMinerTurbo-v0.0.3.mcaddon
```

Set version via environment variable:

```bash
PACK_VERSION=v0.1.0 npm run build
```

## Install

1. Download `VeinMinerTurbo-*.mcaddon` from [Releases](https://github.com/DingdingOvO/VeinMinerTurbo.mcaddon/releases)
2. Open the `.mcaddon` file with Minecraft (or copy to device and open)
3. In world settings, enable **Beta APIs** ("Experiments" → turn on "Beta APIs")
4. Activate both VeinMinerTurbo **Behavior Pack** and **Resource Pack**

## Usage

1. **Sneak + Mine** any ore or log block to chain-break all connected same-type blocks
2. **`/scriptevent vm:s`** to open the settings form and configure:
   - Vein mining on/off
   - Max range (1–256 blocks)
   - Max search depth (1–32)
   - Durability guard
   - Auto replant
   - Drop collection (OP only)
   - Auto leaves (OP only)
   - Custom block whitelist
3. **`/scriptevent vm:t`** to quickly toggle on/off
4. **`/scriptevent vm:a`** to add the block you're looking at to your whitelist

## Requirements

- Minecraft Bedrock **1.21.0+**
- `@minecraft/server` **2.8.0**
- `@minecraft/server-ui` **2.1.0** (experimental)

## Tech Stack

- **TypeScript** + **esbuild** (ESM bundle)
- **Bedrock Script API** — `world.beforeEvents.playerBreakBlock`, `system.afterEvents.scriptEventReceive`
- **ModalFormData** for settings UI
- **JSON UI** (modifications) for HUD overlay
- **`_ui_defs.json`** at resource pack root for type definition loading order
- **`.lang` files** with `RawMessage.translate` for i18n
- **DynamicProperties** for per-player persistent config

## License

MIT
