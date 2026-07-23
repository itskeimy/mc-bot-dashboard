let physicsInterval = null;
let manualActivityTimeout = null;
let manualControlActive = false;

function startAntiAfk(bot, botState) {
    stopAntiAfk();

    physicsInterval = setInterval(() => {
        if (!bot || !bot.entity || !botState.isAntiAfk || manualControlActive) return;

        bot.look(bot.entity.yaw + 0.5, bot.entity.pitch);
        if (Math.random() < 0.15) {
            bot.setControlState('jump', true);
            setTimeout(() => {
                if (bot && bot.setControlState) bot.setControlState('jump', false);
            }, 400);
        }
    }, 2000);
}

function stopAntiAfk() {
    if (physicsInterval) {
        clearInterval(physicsInterval);
        physicsInterval = null;
    }
}

function notifyManualControl() {
    manualControlActive = true;
    if (manualActivityTimeout) clearTimeout(manualActivityTimeout);
    manualActivityTimeout = setTimeout(() => {
        manualControlActive = false;
    }, 5000); // 5 sec idle reactivates Anti-AFK
}

module.exports = { startAntiAfk, stopAntiAfk, notifyManualControl };
