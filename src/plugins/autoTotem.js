let totemInterval = null;

function startAutoTotem(bot, botState) {
    stopAutoTotem();

    totemInterval = setInterval(async () => {
        if (!bot || !bot.inventory || !botState.autoTotem) return;

        try {
            const offhandSlot = bot.inventory.slots[45];
            if (offhandSlot && offhandSlot.name === 'totem_of_undying') return;

            const totem = bot.inventory.items().find(item => item.name === 'totem_of_undying');
            if (totem) {
                await bot.equip(totem, 'off-hand');
            }
        } catch (err) {
            // Ignore temporary inventory busy errors
        }
    }, 1000);
}

function stopAutoTotem() {
    if (totemInterval) {
        clearInterval(totemInterval);
        totemInterval = null;
    }
}

module.exports = { startAutoTotem, stopAutoTotem };
