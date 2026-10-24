# VeinMinerTurbo

A high-performance vein mining addon for Minecraft Bedrock Edition. Sneak + mine to chain-break connected ores, logs, and whitelisted blocks.

## Features

- **Sneak + Mine** — Hold sneak and break a block to chain-mine all connected same-type blocks
- **BFS Scanner** — Flood-fill with configurable max range, max depth, and 100ms timeout to prevent server lag
- **Per-Tick Queue** — Breaks blocks in batches of 20/tick across ticks, zero server freeze
- **Enchantment Support** — Silk Touch and Fortune are correctly applied to ore drops
- **Auto Leaves** — When chopping trees, optionally break nearby leaves too
- **Drop Collection** — Teleport all drops to the break origin for easy pickup
- **HUD Panel** — Top-center of the right half of the screen: `连锁采集：开/关` (green/red) + a standard gear button
- **Whitelist** — Add any block to your personal mining whitelist (`/scriptevent vm:a`)
- **i18n** — English, 简体中文, 繁體中文
- **Settings UI** — ModalFormData with sliders and toggles

> **Note on the HUD buttons**
> Bedrock's JSON UI is declarative: it can render buttons and bind values, but it has **no callback into scripts**.
> There is no `button_press_handlers` field in the UI schema (0 occurrences in Mojang's vanilla `hud_screen.json`).
> The only API with a real `onClick` is `CustomForm.button()` (`@minecraft/server-ui` 2.1.0), which is a modal form — it cannot be pinned to a HUD position.
> Therefore the HUD panel only shows state; toggling and settings are done with `/scriptevent vm:t` and `/scriptevent vm:s`.

## Project Structure

```
VeinMinerTurbo/
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
│   │   ├── HudSync.ts        # Pushes toggle state into the JSON UI
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
├── resource_pack/
│   ├── manifest.json
│   ├── _ui_defs.json         # UI definitions entry (must be at RP root)
│   ├── ui/
│   │   ├── vm_hud.json       # HUD controls (namespace: vm)
│   │   └── vm_hud_mod.json   # Modifies hud.hud_screen (namespace: hud)
│   ├── texts/
│   └── pack_icon.png
├── .github/workflows/release.yml
├── build.mjs
├── tsconfig.json
└── package.json
```

## Commands

| Command | Description |
|---|---|
| `/scriptevent vm:s` | Open settings UI |
| `/scriptevent vm:t` | Toggle vein mining on/off |
| `/scriptevent vm:a` | Add looked-at block to whitelist |

## Build

```bash
npm install
npm run build
# → upload/VeinMinerTurbo-v0.1.0.mcaddon
```

Set version via environment variable:

```bash
PACK_VERSION=v0.1.1 npm run build
```

## Install

1. Download `VeinMinerTurbo-*.mcaddon` from [Releases](https://github.com/DingdingOvO/VeinMinerTurbo.mcaddon/releases)
2. Open the `.mcaddon` file with Minecraft (or copy to device and open)
3. In world settings, enable **Beta APIs** ("Experiments" → turn on "Beta APIs")
4. Activate both VeinMinerTurbo **Behavior Pack** and **Resource Pack**

## Usage

1. **Sneak + Mine** any ore, log, or whitelisted block to chain-break all connected blocks
2. **`/scriptevent vm:s`** opens the settings form:
   - Vein mining on/off
   - Max range (1–256 blocks)
   - Max search depth (1–32)
   - Durability guard (stops before the tool breaks)
   - Custom block whitelist (clear)
   - Drop collection (OP only)
   - Auto leaves (OP only)
3. **`/scriptevent vm:a`** adds the block you are looking at to your whitelist

## Requirements

- Minecraft Bedrock **1.21.90+**
- `@minecraft/server` **2.8.0**
- `@minecraft/server-ui` **2.1.0**
- World setting: **Beta APIs** enabled

## Tech Stack

- **TypeScript** + **esbuild** (ESM bundle)
- **Bedrock Script API** — `world.beforeEvents.playerBreakBlock`, `system.afterEvents.scriptEventReceive`, `world.afterEvents.itemUse`
- **ModalFormData** for the settings form
- **JSON UI** for the HUD panel
- **`_ui_defs.json`** at resource pack root for type definition loading order
- **`.lang` files** with `RawMessage.translate` for i18n
- **DynamicProperties** for per-player persistent config

## License

MIT
