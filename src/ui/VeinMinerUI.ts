/**
 * VeinMinerUI.ts -- DDUI Settings Form
 *
 * 3 Tabs: Basic / Whitelist / Advanced (OP)
 * Toggle off grays out all other controls
 * Always saves on close (including cancel)
 */

import { Player, system } from '@minecraft/server';
import {
    CustomForm,
    ObservableBoolean,
    ObservableNumber,
    ObservableString,
} from '@minecraft/server-ui';
import {
    getPlayerToggle, setPlayerToggle,
    getPlayerMaxVein, setPlayerMaxVein,
    getPlayerAutoLeaves, setPlayerAutoLeaves,
    getPlayerCollectDrops, setPlayerCollectDrops,
    SLIDER_MIN, SLIDER_MAX,
} from '../config';
import {
    getWhitelist, addToWhitelist, clearWhitelist, formatWhitelist,
} from './WhiteListManager';

// ═══════════════════════════════════════
//  Extra DynamicProperties (veinminer_ prefix)
// ═══════════════════════════════════════

const KEY_MAX_DEPTH = 'veinminer_max_depth';
const KEY_DURABILITY = 'veinminer_durability';
const KEY_REPLANT = 'veinminer_replant';

const DEPTH_MIN = 1;
const DEPTH_MAX = 32;
const DEFAULT_MAX_DEPTH = 8;

function getMaxDepth(p: Player): number {
    const v = p.getDynamicProperty(KEY_MAX_DEPTH);
    return typeof v === 'number' ? v : DEFAULT_MAX_DEPTH;
}

function getDurability(p: Player): boolean {
    return p.getDynamicProperty(KEY_DURABILITY) !== false;
}

function getReplant(p: Player): boolean {
    return p.getDynamicProperty(KEY_REPLANT) === true;
}

// ═══════════════════════════════════════
//  Main
// ═══════════════════════════════════════

export async function showSettings(player: Player): Promise<void> {
    try {
        // -- Observables --

        const mainToggle = new ObservableBoolean(
            getPlayerToggle(player), { clientWritable: true },
        );

        const isDisabled = new ObservableBoolean(!mainToggle.getData());
        mainToggle.subscribe((val) => isDisabled.setData(!val));

        // -- Tab switch --

        const activeTab = new ObservableNumber(0);
        const visBasic = new ObservableBoolean(true);
        const visWhitelist = new ObservableBoolean(false);
        const visAdvanced = new ObservableBoolean(false);

        activeTab.subscribe((tab) => {
            visBasic.setData(tab === 0);
            visWhitelist.setData(tab === 1);
            visAdvanced.setData(tab === 2);
        });

        // -- Basic Tab --

        const maxVein = new ObservableNumber(
            getPlayerMaxVein(player), { clientWritable: true },
        );
        const maxDepth = new ObservableNumber(
            getMaxDepth(player), { clientWritable: true },
        );
        const durability = new ObservableBoolean(
            getDurability(player), { clientWritable: true },
        );
        const replant = new ObservableBoolean(
            getReplant(player), { clientWritable: true },
        );

        const maxVeinLabel = new ObservableString(
            `Max Range: ${maxVein.getData()}`,
        );
        const maxDepthLabel = new ObservableString(
            `Max Depth: ${maxDepth.getData()}`,
        );
        maxVein.subscribe((v) => maxVeinLabel.setData(`Max Range: ${v}`));
        maxDepth.subscribe((v) => maxDepthLabel.setData(`Max Depth: ${v}`));

        // -- Whitelist Tab --

        const wlLabel = new ObservableString(
            formatWhitelist(getWhitelist(player)),
        );
        let pendingAddBlock = false;

        // -- Advanced Tab --

        const autoLeaves = new ObservableBoolean(
            getPlayerAutoLeaves(player), { clientWritable: true },
        );
        const collectDrops = new ObservableBoolean(
            getPlayerCollectDrops(player), { clientWritable: true },
        );

        let isOp = false;
        try { isOp = (player as unknown as { isOp: () => boolean }).isOp(); } catch { /* old version */ }

        // -- Build form --

        let form = new CustomForm(player, 'VeinMiner');

        form = form.toggle('Vein Mining', mainToggle);
        form = form.divider();

        // Tab buttons
        form = form.button('Basic', () => activeTab.setData(0), { disabled: isDisabled });
        form = form.button('Whitelist', () => activeTab.setData(1), { disabled: isDisabled });
        if (isOp) {
            form = form.button('Advanced', () => activeTab.setData(2), { disabled: isDisabled });
        }

        form = form.divider();

        // -- Tab 1: Basic --

        form = form.toggle('Durability Guard', durability, { visible: visBasic, disabled: isDisabled });
        form = form.slider(maxVeinLabel, maxVein, SLIDER_MIN, SLIDER_MAX, {
            step: 1, visible: visBasic, disabled: isDisabled,
        });
        form = form.slider(maxDepthLabel, maxDepth, DEPTH_MIN, DEPTH_MAX, {
            step: 1, visible: visBasic, disabled: isDisabled,
        });
        form = form.toggle('Auto Replant', replant, { visible: visBasic, disabled: isDisabled });

        // -- Tab 2: Whitelist --

        form = form.header('Custom Whitelist', { visible: visWhitelist });
        form = form.label(wlLabel, { visible: visWhitelist });
        form = form.button('Add Block', () => {
            pendingAddBlock = true;
            form.close();
        }, { visible: visWhitelist, disabled: isDisabled });
        form = form.button('Clear Whitelist', () => {
            clearWhitelist(player);
            wlLabel.setData('(empty)');
        }, { visible: visWhitelist, disabled: isDisabled });

        // -- Tab 3: Advanced (OP only) --

        if (isOp) {
            form = form.toggle('Collect Drops', collectDrops, { visible: visAdvanced, disabled: isDisabled });
            form = form.toggle('Auto Leaves', autoLeaves, { visible: visAdvanced, disabled: isDisabled });
        }

        form = form.closeButton();

        // -- Show & save --

        await form.show();

        // Always save (Observable holds latest values)
        setPlayerToggle(player, mainToggle.getData());
        setPlayerMaxVein(player, maxVein.getData());
        player.setDynamicProperty(KEY_MAX_DEPTH, maxDepth.getData());
        player.setDynamicProperty(KEY_DURABILITY, durability.getData());
        player.setDynamicProperty(KEY_REPLANT, replant.getData());

        if (isOp) {
            setPlayerAutoLeaves(player, autoLeaves.getData());
            setPlayerCollectDrops(player, collectDrops.getData());
        }

        // Add block flow: close form -> next tick get block from view -> add -> reopen
        if (pendingAddBlock) {
            system.run(() => {
                const hit = player.getBlockFromViewDirection({ maxDistance: 6 });
                if (hit && hit.block) {
                    const added = addToWhitelist(player, hit.block.typeId);
                    if (added) {
                        player.onScreenDisplay.setActionBar(`[VM] Added ${hit.block.typeId}`);
                    } else {
                        player.onScreenDisplay.setActionBar(`[VM] ${hit.block.typeId} already in whitelist`);
                    }
                } else {
                    player.onScreenDisplay.setActionBar('[VM] Not looking at any block');
                }
                // Reopen settings
                showSettings(player);
            });
        } else {
            player.onScreenDisplay.setActionBar('[VM] Settings saved');
        }
    } catch (error) {
        console.warn('[VM] Settings form failed', error);
    }
}