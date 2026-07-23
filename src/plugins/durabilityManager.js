// Durability & Auto-Swap Manager Plugin for Tools & Armor
let autoSwapInterval = null;
let lastWarningTime = 0;

const toolTypes = ['pickaxe', 'sword', 'axe', 'shovel', 'hoe'];
const armorTypes = ['helmet', 'chestplate', 'leggings', 'boots'];

function getToolType(itemName) {
    if (!itemName) return null;
    for (const t of toolTypes) {
        if (itemName.includes(t)) return t;
    }
    return null;
}

function getArmorType(itemName) {
    if (!itemName) return null;
    for (const a of armorTypes) {
        if (itemName.includes(a)) return a;
    }
    return null;
}

function getDurabilityPct(item) {
    if (!item || !item.maxDurability || item.maxDurability <= 0) return 100;
    const durUsed = item.durabilityUsed !== undefined ? item.durabilityUsed : 0;
    const remaining = Math.max(0, item.maxDurability - durUsed);
    return Math.round((remaining / item.maxDurability) * 100);
}

function startDurabilityManager(bot, botState, io) {
    stopDurabilityManager();

    autoSwapInterval = setInterval(async () => {
        if (!bot || !bot.inventory) return;

        // 1. Check Held Item / Active Tool Durability
        try {
            const heldSlotIndex = 36 + (bot.quickBarSlot !== undefined ? bot.quickBarSlot : 0);
            const heldItem = bot.inventory.slots[heldSlotIndex];
            if (heldItem && heldItem.maxDurability > 0) {
                const pct = getDurabilityPct(heldItem);
                const toolType = getToolType(heldItem.name);

                if (pct <= 5 && toolType) {
                    const candidate = bot.inventory.items().find(i => 
                        i.slot !== heldItem.slot &&
                        getToolType(i.name) === toolType &&
                        getDurabilityPct(i) > 10
                    );

                    if (candidate) {
                        await bot.equip(candidate, 'hand');
                        if (io) {
                            io.emit('log', `🛡️ [Авто-Свап] Инструмент "${heldItem.displayName || heldItem.name}" почти сломан (${pct}%). Заменен на ${candidate.displayName || candidate.name}!`);
                            io.emit('playSound', 'warning');
                        }
                    } else if (Date.now() - lastWarningTime > 10000) {
                        lastWarningTime = Date.now();
                        if (io) {
                            io.emit('log', `⚠️ [Внимание] Инструмент "${heldItem.displayName || heldItem.name}" изношен (${pct}%)! Извлеките инструмент для защиты.`);
                            io.emit('playSound', 'danger');
                        }
                    }
                }
            }
        } catch (e) {}

        // 2. Check Equipped Armor Durability (Slots 5..8)
        if (botState.autoArmor !== false) {
            for (let slot = 5; slot <= 8; slot++) {
                try {
                    const item = bot.inventory.slots[slot];
                    if (item && item.maxDurability > 0) {
                        const pct = getDurabilityPct(item);
                        const type = getArmorType(item.name);

                        if (pct <= 5 && type) {
                            const candidate = bot.inventory.items().find(i =>
                                i.slot !== item.slot &&
                                getArmorType(i.name) === type &&
                                getDurabilityPct(i) > 10
                            );

                            if (candidate) {
                                await bot.equip(candidate, type);
                                if (io) {
                                    io.emit('log', `🛡️ [Авто-Свап] Броня "${item.displayName || item.name}" почти сломана (${pct}%). Заменена на ${candidate.displayName || candidate.name}!`);
                                    io.emit('playSound', 'warning');
                                }
                            } else {
                                await bot.unequip(type);
                                if (io) {
                                    io.emit('log', `🛡️ [Авто-Защита] Снята броня "${item.displayName || item.name}" (${pct}%) во избежание поломки!`);
                                    io.emit('playSound', 'warning');
                                }
                            }
                        }
                    }
                } catch (e) {}
            }
        }
    }, 2000);
}

function stopDurabilityManager() {
    if (autoSwapInterval) {
        clearInterval(autoSwapInterval);
        autoSwapInterval = null;
    }
}

module.exports = { startDurabilityManager, stopDurabilityManager, getDurabilityPct };
