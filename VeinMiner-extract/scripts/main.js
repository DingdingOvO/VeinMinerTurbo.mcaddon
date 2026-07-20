// src/main.ts
import { world as world4, system as system4, Player as Player4, ScriptEventSource } from "@minecraft/server";

// src/core/VeinMiner.ts
import { world as world2, system as system2 } from "@minecraft/server";

// src/core/Scanner.ts
var DIR_6 = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 }
];
var DIR_26 = [];
for (let dx = -1; dx <= 1; dx++)
  for (let dy = -1; dy <= 1; dy++)
    for (let dz = -1; dz <= 1; dz++)
      if (dx || dy || dz) DIR_26.push({ x: dx, y: dy, z: dz });
function posKey(x, y, z) {
  return BigInt(x) << 64n ^ BigInt(y) << 32n ^ BigInt(z);
}
var MAX_BFS_ITERATIONS = 1e3;
function bfsScan(dim, start, targetId, maxBlocks, timeoutMs, use26Dir) {
  const dirs = use26Dir ? DIR_26 : DIR_6;
  const sx = Math.floor(start.x);
  const sy = Math.floor(start.y);
  const sz = Math.floor(start.z);
  const result = [{ x: sx, y: sy, z: sz }];
  const visited = /* @__PURE__ */ new Set([posKey(sx, sy, sz)]);
  const queue = [{ x: sx, y: sy, z: sz }];
  const t0 = Date.now();
  let iterations = 0;
  while (queue.length > 0) {
    if (++iterations > MAX_BFS_ITERATIONS) {
      console.warn(`[VM] BFS \u8FBE\u5230\u8FED\u4EE3\u4E0A\u9650 (${MAX_BFS_ITERATIONS})\uFF0C\u5DF2\u6536\u96C6 ${result.length} \u4E2A\u65B9\u5757`);
      return { blocks: result, timedOut: false };
    }
    if (Date.now() - t0 > timeoutMs) return { blocks: result, timedOut: true };
    if (result.length >= maxBlocks) return { blocks: result, timedOut: false };
    const cur = queue.shift();
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
      const pos = { x: nx, y: ny, z: nz };
      result.push(pos);
      queue.push(pos);
      if (result.length >= maxBlocks) return { blocks: result, timedOut: false };
    }
  }
  return { blocks: result, timedOut: false };
}
function sortByDistance(blocks, origin) {
  return [...blocks].sort((a, b) => {
    const da = Math.abs(a.x - origin.x) + Math.abs(a.y - origin.y) + Math.abs(a.z - origin.z);
    const db = Math.abs(b.x - origin.x) + Math.abs(b.y - origin.y) + Math.abs(b.z - origin.z);
    return da - db;
  });
}

// src/config/blocks/Ores.ts
var ORE_IDS = [
  "minecraft:coal_ore",
  "minecraft:deepslate_coal_ore",
  "minecraft:iron_ore",
  "minecraft:deepslate_iron_ore",
  "minecraft:copper_ore",
  "minecraft:deepslate_copper_ore",
  "minecraft:gold_ore",
  "minecraft:deepslate_gold_ore",
  "minecraft:redstone_ore",
  "minecraft:deepslate_redstone_ore",
  "minecraft:emerald_ore",
  "minecraft:deepslate_emerald_ore",
  "minecraft:lapis_ore",
  "minecraft:deepslate_lapis_ore",
  "minecraft:diamond_ore",
  "minecraft:deepslate_diamond_ore",
  "minecraft:nether_gold_ore",
  "minecraft:quartz_ore",
  "minecraft:ancient_debris"
];

// src/config/blocks/Logs.ts
var LOG_IDS = [
  "minecraft:oak_log",
  "minecraft:spruce_log",
  "minecraft:birch_log",
  "minecraft:jungle_log",
  "minecraft:acacia_log",
  "minecraft:dark_oak_log",
  "minecraft:mangrove_log",
  "minecraft:cherry_log",
  "minecraft:crimson_stem",
  "minecraft:warped_stem"
];

// src/config/blocks/Leaves.ts
var LEAF_IDS = [
  "minecraft:oak_leaves",
  "minecraft:spruce_leaves",
  "minecraft:birch_leaves",
  "minecraft:jungle_leaves",
  "minecraft:acacia_leaves",
  "minecraft:dark_oak_leaves",
  "minecraft:mangrove_leaves",
  "minecraft:cherry_leaves",
  "minecraft:azalea_leaves",
  "minecraft:azalea_leaves_flowered"
];

// src/config/blocks/Blacklist.ts
var BLACKLIST_IDS = [
  "minecraft:bedrock",
  "minecraft:barrier",
  "minecraft:command_block",
  "minecraft:repeating_command_block",
  "minecraft:chain_command_block",
  "minecraft:structure_void",
  "minecraft:end_portal_frame",
  "minecraft:reinforced_deepslate",
  "minecraft:light_block"
];

// src/config/blocks/index.ts
var WHITELIST_SET = /* @__PURE__ */ new Set([...ORE_IDS, ...LOG_IDS]);
var LOG_SET = new Set(LOG_IDS);
var LEAF_SET = new Set(LEAF_IDS);
var BLACKLIST_SET = new Set(BLACKLIST_IDS);
function isWhitelisted(blockId) {
  return WHITELIST_SET.has(blockId);
}
function isBlacklisted(blockId) {
  return BLACKLIST_SET.has(blockId);
}
function isLogType(blockId) {
  return LOG_SET.has(blockId);
}
function getLeafIdSet() {
  return LEAF_SET;
}

// src/config/Constants.ts
var DEFAULT_MAX_VEIN = 64;
var SLIDER_MIN = 1;
var SLIDER_MAX = 256;
var SCAN_TIMEOUT_MS = 100;
var LEAF_SCAN_RADIUS = 4;
var LEAF_MAX_COUNT = 64;
var CHAT_PREFIX = "#vm";

// src/config/PlayerConfig.ts
var KEY_TOGGLE = "vm:toggle";
var KEY_MAX_VEIN = "vm:max_vein";
var KEY_AUTO_LEAVES = "vm:auto_leaves";
var KEY_COLLECT_DROPS = "vm:collect_drops";
function getPlayerToggle(p) {
  const v = p.getDynamicProperty(KEY_TOGGLE);
  return v !== false;
}
function setPlayerToggle(p, v) {
  p.setDynamicProperty(KEY_TOGGLE, v);
}
function getPlayerMaxVein(p) {
  const v = p.getDynamicProperty(KEY_MAX_VEIN);
  return typeof v === "number" ? v : DEFAULT_MAX_VEIN;
}
function setPlayerMaxVein(p, v) {
  p.setDynamicProperty(KEY_MAX_VEIN, v);
}
function getPlayerAutoLeaves(p) {
  const v = p.getDynamicProperty(KEY_AUTO_LEAVES);
  return v === true;
}
function setPlayerAutoLeaves(p, v) {
  p.setDynamicProperty(KEY_AUTO_LEAVES, v);
}
function getPlayerCollectDrops(p) {
  const v = p.getDynamicProperty(KEY_COLLECT_DROPS);
  return v !== false;
}
function setPlayerCollectDrops(p, v) {
  p.setDynamicProperty(KEY_COLLECT_DROPS, v);
}

// src/core/TreeDetector.ts
function scanLeaves(dim, logPositions, leafTypeIds, maxRadius = LEAF_SCAN_RADIUS, maxCount = LEAF_MAX_COUNT) {
  const leaves = [];
  const visited = /* @__PURE__ */ new Set();
  for (const log of logPositions) {
    if (leaves.length >= maxCount) break;
    for (let dx = -maxRadius; dx <= maxRadius; dx++) {
      if (leaves.length >= maxCount) break;
      for (let dy = -maxRadius; dy <= maxRadius; dy++) {
        if (leaves.length >= maxCount) break;
        for (let dz = -maxRadius; dz <= maxRadius; dz++) {
          if (leaves.length >= maxCount) break;
          const dist = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
          if (dist > maxRadius || dist === 0) continue;
          const nx = log.x + dx;
          const ny = log.y + dy;
          const nz = log.z + dz;
          const k = `${nx},${ny},${nz}`;
          if (visited.has(k)) continue;
          visited.add(k);
          try {
            const block = dim.getBlock({ x: nx, y: ny, z: nz });
            if (block && leafTypeIds.has(block.typeId)) {
              leaves.push({ x: nx, y: ny, z: nz });
            }
          } catch {
          }
        }
      }
    }
  }
  return leaves;
}

// src/core/BreakExecutor.ts
import { world, system } from "@minecraft/server";

// src/utils/EnchantmentHelper.ts
import { ItemStack } from "@minecraft/server";
var BLOCK_DROP_MAP = {
  // 普通矿石
  "minecraft:coal_ore": { itemId: "minecraft:coal", count: 1, fortuneScale: true },
  "minecraft:iron_ore": { itemId: "minecraft:raw_iron", count: 1, fortuneScale: false },
  "minecraft:gold_ore": { itemId: "minecraft:raw_gold", count: 1, fortuneScale: false },
  "minecraft:diamond_ore": { itemId: "minecraft:diamond", count: 1, fortuneScale: true },
  "minecraft:emerald_ore": { itemId: "minecraft:emerald", count: 1, fortuneScale: true },
  "minecraft:lapis_ore": { itemId: "minecraft:lapis_lazuli", count: 4, fortuneScale: true },
  "minecraft:redstone_ore": { itemId: "minecraft:redstone", count: 4, fortuneScale: true },
  "minecraft:quartz_ore": { itemId: "minecraft:quartz", count: 1, fortuneScale: true },
  "minecraft:nether_gold_ore": { itemId: "minecraft:gold_nugget", count: 1, fortuneScale: true },
  "minecraft:ancient_debris": { itemId: "minecraft:netherite_scrap", count: 1, fortuneScale: false },
  "minecraft:copper_ore": { itemId: "minecraft:raw_copper", count: 1, fortuneScale: false },
  // 深板岩矿石
  "minecraft:deepslate_coal_ore": { itemId: "minecraft:coal", count: 1, fortuneScale: true },
  "minecraft:deepslate_iron_ore": { itemId: "minecraft:raw_iron", count: 1, fortuneScale: false },
  "minecraft:deepslate_gold_ore": { itemId: "minecraft:raw_gold", count: 1, fortuneScale: false },
  "minecraft:deepslate_diamond_ore": { itemId: "minecraft:diamond", count: 1, fortuneScale: true },
  "minecraft:deepslate_emerald_ore": { itemId: "minecraft:emerald", count: 1, fortuneScale: true },
  "minecraft:deepslate_lapis_ore": { itemId: "minecraft:lapis_lazuli", count: 4, fortuneScale: true },
  "minecraft:deepslate_redstone_ore": { itemId: "minecraft:redstone", count: 4, fortuneScale: true },
  "minecraft:deepslate_copper_ore": { itemId: "minecraft:raw_copper", count: 1, fortuneScale: false }
};
var EXP_MAP = {
  "minecraft:coal_ore": 0,
  "minecraft:deepslate_coal_ore": 0,
  "minecraft:iron_ore": 0,
  "minecraft:deepslate_iron_ore": 0,
  "minecraft:gold_ore": 0,
  "minecraft:deepslate_gold_ore": 0,
  "minecraft:copper_ore": 0,
  "minecraft:deepslate_copper_ore": 0,
  "minecraft:diamond_ore": 7,
  "minecraft:deepslate_diamond_ore": 7,
  "minecraft:emerald_ore": 7,
  "minecraft:deepslate_emerald_ore": 7,
  "minecraft:lapis_ore": 2,
  "minecraft:deepslate_lapis_ore": 2,
  "minecraft:redstone_ore": 1,
  "minecraft:deepslate_redstone_ore": 1,
  "minecraft:quartz_ore": 2,
  "minecraft:nether_gold_ore": 0,
  "minecraft:ancient_debris": 0
};
function getEnchantLevel(player, enchantId) {
  try {
    const inventory = player.getComponent("inventory");
    if (!inventory || !inventory.container) return 0;
    const item = inventory.container.getItem(player.selectedSlotIndex);
    if (!item) return 0;
    const enchantable = item.getComponent("minecraft:enchantable");
    if (!enchantable) return 0;
    const ench = enchantable.getEnchantment(enchantId);
    return ench?.level ?? 0;
  } catch {
    return 0;
  }
}
function getDrops(blockId, player) {
  const entry = BLOCK_DROP_MAP[blockId];
  if (!entry) return null;
  const silkTouch = getEnchantLevel(player, "silk_touch") > 0;
  if (silkTouch) {
    return [{ itemId: blockId, count: 1 }];
  }
  const fortuneLevel = getEnchantLevel(player, "fortune");
  let finalCount = entry.count;
  if (entry.fortuneScale && fortuneLevel > 0) {
    const bonus = Math.floor(Math.random() * (fortuneLevel + 1));
    finalCount = entry.count * (1 + bonus);
  }
  return [{ itemId: entry.itemId, count: finalCount }];
}
function spawnDrops(dimension, pos, drops, exp) {
  const entities = [];
  for (const drop of drops) {
    try {
      const item = new ItemStack(drop.itemId, drop.count);
      const entity = dimension.spawnItem(item, pos);
      entities.push(entity);
    } catch {
    }
  }
  if (exp > 0) {
    try {
      dimension.spawnEntity("xp_orb", pos);
    } catch {
    }
  }
  return entities;
}
function getExperience(blockId) {
  return EXP_MAP[blockId] ?? 0;
}

// src/core/BreakExecutor.ts
var TAG = "\xA78[VM]\xA7r";
var BATCH_SIZE = 20;
var playerQueues = /* @__PURE__ */ new Map();
function executeBreak(player, _dimension, blocks, leafBlocks, origin, collectDrops) {
  const pid = player.id;
  const sorted = sortByDistance(blocks, origin);
  const sortedLeaves = sortByDistance(leafBlocks, origin);
  const allPos = [...sorted, ...sortedLeaves];
  playerQueues.set(pid, {
    blocks: allPos,
    running: false,
    broken: 0,
    origin,
    collectDrops,
    droppedItems: []
  });
  const state = playerQueues.get(pid);
  if (!state.running) {
    state.running = true;
    processTick(pid);
  }
}
function processTick(pid) {
  const state = playerQueues.get(pid);
  if (!state || state.blocks.length === 0) {
    finishPlayer(pid, state);
    return;
  }
  const player = world.getPlayers().find((p) => p.id === pid);
  if (!player) {
    playerQueues.delete(pid);
    return;
  }
  const dimension = player.dimension;
  const batch = state.blocks.splice(0, BATCH_SIZE);
  for (const pos of batch) {
    try {
      const block = dimension.getBlock(pos);
      if (!block) continue;
      const blockId = block.typeId;
      const drops = getDrops(blockId, player);
      if (drops) {
        const exp = getExperience(blockId);
        const entities = spawnDrops(dimension, block.location, drops, exp);
        if (state.collectDrops && entities.length > 0) {
          state.droppedItems.push(...entities);
        }
        player.runCommand(`setblock ${pos.x} ${pos.y} ${pos.z} air`);
      } else {
        player.runCommand(`setblock ${pos.x} ${pos.y} ${pos.z} air destroy`);
      }
      state.broken++;
    } catch (error) {
      console.warn(`[VM] \u65B9\u5757\u64CD\u4F5C\u5931\u8D25 (${pos.x},${pos.y},${pos.z}): ${error}`);
      state.blocks = [];
      break;
    }
  }
  if (state.blocks.length > 0) {
    system.run(() => processTick(pid));
  } else {
    finishPlayer(pid, state);
  }
}
function finishPlayer(pid, state) {
  playerQueues.delete(pid);
  if (state && state.broken > 0) {
    try {
      const player = world.getPlayers().find((p) => p.id === pid);
      if (player) {
        player.onScreenDisplay.setActionBar(`${TAG} \xA7a+${state.broken} \u65B9\u5757`);
        if (state.collectDrops && state.droppedItems.length > 0) {
          collectDropsToOrigin(state.origin, state.droppedItems);
        }
      }
    } catch (error) {
      console.warn(`[VM] \u4EFB\u52A1\u5B8C\u6210\u56DE\u8C03\u5931\u8D25: ${error}`);
    }
  }
}
function collectDropsToOrigin(target, items) {
  system.run(() => {
    for (const item of items) {
      try {
        if (item.isValid) {
          item.teleport(target, { keepVelocity: false });
        }
      } catch (error) {
        console.warn(`[VM] \u6389\u843D\u7269\u4F20\u9001\u5931\u8D25: ${error}`);
      }
    }
  });
}

// src/core/VeinMiner.ts
var TAG2 = "\xA78[VM]\xA7r";
function registerVeinMiner() {
  world2.beforeEvents.playerBreakBlock.subscribe(onBreak);
}
function onBreak(event) {
  try {
    onBreakInner(event);
  } catch (error) {
    console.warn(`[VM] \u65B9\u5757\u7834\u574F\u4E8B\u4EF6\u5904\u7406\u5931\u8D25: ${error}`);
  }
}
function onBreakInner(event) {
  const player = event.player;
  if (!player.isSneaking) return;
  const block = event.block;
  const typeId = block.typeId;
  if (!isWhitelisted(typeId) || isBlacklisted(typeId)) return;
  if (!getPlayerToggle(player)) return;
  const startLoc = {
    x: Math.floor(block.location.x),
    y: Math.floor(block.location.y),
    z: Math.floor(block.location.z)
  };
  const dimension = block.dimension;
  const maxVein = getPlayerMaxVein(player);
  const isLog = isLogType(typeId);
  const autoLeaves = isLog && getPlayerAutoLeaves(player);
  const result = bfsScan(dimension, startLoc, typeId, maxVein, SCAN_TIMEOUT_MS, isLog);
  if (result.timedOut) {
    player.onScreenDisplay.setActionBar(`${TAG2} \xA7e\u626B\u63CF\u8D85\u65F6`);
    return;
  }
  const extraBlocks = result.blocks.length > 1 ? result.blocks.slice(1) : [];
  let leafBlocks = [];
  if (autoLeaves) {
    leafBlocks = scanLeaves(dimension, result.blocks, getLeafIdSet());
  }
  if (extraBlocks.length === 0 && leafBlocks.length === 0) return;
  const collectDrops = getPlayerCollectDrops(player);
  system2.run(() => {
    executeBreak(player, dimension, extraBlocks, leafBlocks, startLoc, collectDrops);
  });
}

// src/ui/ChatHandler.ts
import { world as world3 } from "@minecraft/server";

// src/ui/VeinMinerUI.ts
import { system as system3 } from "@minecraft/server";
import {
  CustomForm,
  ObservableBoolean,
  ObservableNumber,
  ObservableString
} from "@minecraft/server-ui";

// src/ui/WhiteListManager.ts
var WHITELIST_KEY = "veinminer_whitelist";
var MAX_SIZE = 64;
function getWhitelist(player) {
  const raw = player.getDynamicProperty(WHITELIST_KEY);
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}
function setWhitelist(player, list) {
  player.setDynamicProperty(WHITELIST_KEY, JSON.stringify(list));
}
function addToWhitelist(player, blockTypeId) {
  const list = getWhitelist(player);
  if (list.includes(blockTypeId)) return false;
  if (list.length >= MAX_SIZE) return false;
  list.push(blockTypeId);
  setWhitelist(player, list);
  return true;
}
function clearWhitelist(player) {
  player.setDynamicProperty(WHITELIST_KEY, "[]");
}
function formatWhitelist(items) {
  if (items.length === 0) return "(\u7A7A)";
  return items.map((id) => id.replace(/^minecraft:/, "")).join(", ");
}

// src/ui/VeinMinerUI.ts
var KEY_MAX_DEPTH = "veinminer_max_depth";
var KEY_DURABILITY = "veinminer_durability";
var KEY_REPLANT = "veinminer_replant";
var DEPTH_MIN = 1;
var DEPTH_MAX = 32;
var DEFAULT_MAX_DEPTH = 8;
function getMaxDepth(p) {
  const v = p.getDynamicProperty(KEY_MAX_DEPTH);
  return typeof v === "number" ? v : DEFAULT_MAX_DEPTH;
}
function getDurability(p) {
  return p.getDynamicProperty(KEY_DURABILITY) !== false;
}
function getReplant(p) {
  return p.getDynamicProperty(KEY_REPLANT) === true;
}
async function showSettings(player) {
  try {
    const mainToggle = new ObservableBoolean(
      getPlayerToggle(player),
      { clientWritable: true }
    );
    const isDisabled = new ObservableBoolean(!mainToggle.getData());
    mainToggle.subscribe((val) => isDisabled.setData(!val));
    const activeTab = new ObservableNumber(0);
    const visBasic = new ObservableBoolean(true);
    const visWhitelist = new ObservableBoolean(false);
    const visAdvanced = new ObservableBoolean(false);
    activeTab.subscribe((tab) => {
      visBasic.setData(tab === 0);
      visWhitelist.setData(tab === 1);
      visAdvanced.setData(tab === 2);
    });
    const maxVein = new ObservableNumber(
      getPlayerMaxVein(player),
      { clientWritable: true }
    );
    const maxDepth = new ObservableNumber(
      getMaxDepth(player),
      { clientWritable: true }
    );
    const durability = new ObservableBoolean(
      getDurability(player),
      { clientWritable: true }
    );
    const replant = new ObservableBoolean(
      getReplant(player),
      { clientWritable: true }
    );
    const maxVeinLabel = new ObservableString(
      `Max Range: ${maxVein.getData()}`
    );
    const maxDepthLabel = new ObservableString(
      `Max Depth: ${maxDepth.getData()}`
    );
    maxVein.subscribe((v) => maxVeinLabel.setData(`Max Range: ${v}`));
    maxDepth.subscribe((v) => maxDepthLabel.setData(`Max Depth: ${v}`));
    const wlLabel = new ObservableString(
      formatWhitelist(getWhitelist(player))
    );
    let pendingAddBlock = false;
    const autoLeaves = new ObservableBoolean(
      getPlayerAutoLeaves(player),
      { clientWritable: true }
    );
    const collectDrops = new ObservableBoolean(
      getPlayerCollectDrops(player),
      { clientWritable: true }
    );
    let isOp = false;
    try {
      isOp = player.isOp();
    } catch {
    }
    let form = new CustomForm(player, "VeinMiner");
    form = form.toggle("Vein Mining", mainToggle);
    form = form.divider();
    form = form.button("Basic", () => activeTab.setData(0), { disabled: isDisabled });
    form = form.button("Whitelist", () => activeTab.setData(1), { disabled: isDisabled });
    if (isOp) {
      form = form.button("Advanced", () => activeTab.setData(2), { disabled: isDisabled });
    }
    form = form.divider();
    form = form.toggle("Durability Guard", durability, { visible: visBasic, disabled: isDisabled });
    form = form.slider(maxVeinLabel, maxVein, SLIDER_MIN, SLIDER_MAX, {
      step: 1,
      visible: visBasic,
      disabled: isDisabled
    });
    form = form.slider(maxDepthLabel, maxDepth, DEPTH_MIN, DEPTH_MAX, {
      step: 1,
      visible: visBasic,
      disabled: isDisabled
    });
    form = form.toggle("Auto Replant", replant, { visible: visBasic, disabled: isDisabled });
    form = form.header("Custom Whitelist", { visible: visWhitelist });
    form = form.label(wlLabel, { visible: visWhitelist });
    form = form.button("Add Block", () => {
      pendingAddBlock = true;
      form.close();
    }, { visible: visWhitelist, disabled: isDisabled });
    form = form.button("Clear Whitelist", () => {
      clearWhitelist(player);
      wlLabel.setData("(empty)");
    }, { visible: visWhitelist, disabled: isDisabled });
    if (isOp) {
      form = form.toggle("Collect Drops", collectDrops, { visible: visAdvanced, disabled: isDisabled });
      form = form.toggle("Auto Leaves", autoLeaves, { visible: visAdvanced, disabled: isDisabled });
    }
    form = form.closeButton();
    await form.show();
    setPlayerToggle(player, mainToggle.getData());
    setPlayerMaxVein(player, maxVein.getData());
    player.setDynamicProperty(KEY_MAX_DEPTH, maxDepth.getData());
    player.setDynamicProperty(KEY_DURABILITY, durability.getData());
    player.setDynamicProperty(KEY_REPLANT, replant.getData());
    if (isOp) {
      setPlayerAutoLeaves(player, autoLeaves.getData());
      setPlayerCollectDrops(player, collectDrops.getData());
    }
    if (pendingAddBlock) {
      system3.run(() => {
        const hit = player.getBlockFromViewDirection({ maxDistance: 6 });
        if (hit && hit.block) {
          const added = addToWhitelist(player, hit.block.typeId);
          if (added) {
            player.onScreenDisplay.setActionBar(`[VM] Added ${hit.block.typeId}`);
          } else {
            player.onScreenDisplay.setActionBar(`[VM] ${hit.block.typeId} already in whitelist`);
          }
        } else {
          player.onScreenDisplay.setActionBar("[VM] Not looking at any block");
        }
        showSettings(player);
      });
    } else {
      player.onScreenDisplay.setActionBar("[VM] Settings saved");
    }
  } catch (error) {
    console.warn("[VM] Settings form failed", error);
  }
}

// src/ui/ChatHandler.ts
var TAG3 = "\xA78[VM]\xA7r";
function registerChatHandler() {
  const afterEvents = world3.afterEvents;
  const chatSend = afterEvents["chatSend"];
  if (!chatSend) {
    console.warn("[VM] chatSend event not available. Use /scriptevent veinminer:settings");
    return;
  }
  chatSend.subscribe((event) => {
    try {
      handleChatCommand(event);
    } catch (error) {
      console.warn(`[VM] Chat command error: ${error}`);
    }
  });
}
function handleChatCommand(event) {
  const message = event.message.trim();
  if (!message.startsWith(CHAT_PREFIX)) return;
  const sender = event.sender;
  const args = message.slice(CHAT_PREFIX.length).trim();
  if (args === "" || args === "set" || args === "settings") {
    showSettings(sender);
  } else if (args === "on") {
    setPlayerToggle(sender, true);
    sender.onScreenDisplay.setActionBar(`${TAG3} \xA7aVein Mining ON`);
  } else if (args === "off") {
    setPlayerToggle(sender, false);
    sender.onScreenDisplay.setActionBar(`${TAG3} \xA7cVein Mining OFF`);
  } else if (args === "reload") {
    console.warn("[VM] Config reload requested (chat)");
    sender.onScreenDisplay.setActionBar(`${TAG3} \xA7aConfig reloaded`);
  } else {
    sender.onScreenDisplay.setActionBar(
      `${TAG3} \xA77#vm \xA7fsettings \xA77| \xA7f#vm on \xA77| \xA7f#vm off \xA77| \xA7f#vm reload`
    );
  }
}

// src/main.ts
console.warn("[VM] VeinMiner v0.3.2 starting...");
registerVeinMiner();
registerChatHandler();
system4.afterEvents.scriptEventReceive.subscribe(
  (event) => {
    try {
      if (event.sourceType !== ScriptEventSource.Entity) return;
      const entity = event.sourceEntity;
      if (!entity || !(entity instanceof Player4)) return;
      const id = event.id;
      if (id === "veinminer:toggle") {
        const next = !getPlayerToggle(entity);
        setPlayerToggle(entity, next);
        entity.onScreenDisplay.setActionBar(
          `[VM] ${next ? "Vein Mining ON" : "Vein Mining OFF"}`
        );
      } else if (id === "veinminer:settings") {
        showSettings(entity);
      } else if (id === "veinminer:reload") {
        console.warn("[VM] Config reload requested (player)");
        entity.onScreenDisplay.setActionBar("[VM] Config reloaded");
      }
    } catch (error) {
      console.warn(`[VM] scriptEvent error: ${error}`);
    }
  },
  { namespaces: ["veinminer"] }
);
console.warn("[VM] Started");
system4.run(() => {
  for (const player of world4.getAllPlayers()) {
    player.onScreenDisplay.setActionBar(
      `[VM] Loaded | Sneak+Mine | ${CHAT_PREFIX} settings`
    );
  }
});
