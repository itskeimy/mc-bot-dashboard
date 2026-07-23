let armorInterval = null;

const armorTiers = {
    netherite: 6,
    diamond: 5,
    iron: 4,
    chainmail: 3,
    golden: 2,
    leather: 1
};

function getArmorTier(itemName) {
    for (const [tierName, tierVal] of Object.entries(armorTiers)) {
        if (itemName.includes(tierName)) return tierVal;
    }
    return 0;
}

function getArmorType(itemName) {
    if (itemName.includes('helmet')) return 'helmet';
    if (itemName.includes('chestplate')) return 'chestplate';
    if (itemName.includes('leggings')) return 'leggings';
    if (itemName.includes('boots')) return 'boots';
    return null;
}

function startAutoArmor(bot, botState) {
    stopAutoArmor();

    armorInterval = setInterval(async () => {
        if (!bot || !bot.inventory || !botState.autoArmor) return;

        const armorTypes = ['helmet', 'chestplate', 'leggings', 'boots'];

        for (const type of armorTypes) {
            try {
                const currentEquipped = bot.inventory.items().find(i => getArmorType(i.name) === type && i.slot >= 5 && i.slot <= 8);
                const currentTier = currentEquipped ? getArmorTier(currentEquipped.name) : 0;

                const candidates = bot.inventory.items().filter(i => getArmorType(i.name) === type);
                let bestItem = null;
                let bestTier = currentTier;

                for (const item of candidates) {
                    const tier = getArmorTier(item.name);
                    if (tier > bestTier) {
                        bestTier = tier;
                        bestItem = item;
                    }
                }

                if (bestItem) {
                    await bot.equip(bestItem, type);
                }
            } catch (e) {
                // Ignore inventory busy
            }
        }
    }, 2000);
}

function stopAutoArmor() {
    if (armorInterval) {
        clearInterval(armorInterval);
        armorInterval = null;
    }
}

module.exports = { startAutoArmor, stopAutoArmor };
