let attackInterval = null;
let lookInterval = null;

function startAutoAttack(bot, botState) {
    stopAutoAttack();

    attackInterval = setInterval(() => {
        if (!bot || !bot.entity || !botState.isAttacking) return;

        const entity = bot.nearestEntity(e =>
            (e.type === 'hostile' || e.type === 'mob') &&
            e.position &&
            bot.entity.position.distanceTo(e.position) < 4
        );

        if (entity) {
            bot.lookAt(entity.position.offset(0, 1.6, 0));
            bot.attack(entity);
        }
    }, 800);

    lookInterval = setInterval(() => {
        if (!bot || !bot.entity || !botState.isLooker) return;
        const entity = bot.nearestEntity(e => e.type === 'player' && e.id !== bot.entity.id);
        if (entity) {
            bot.lookAt(entity.position.offset(0, 1.6, 0));
        }
    }, 200);
}

function stopAutoAttack() {
    if (attackInterval) {
        clearInterval(attackInterval);
        attackInterval = null;
    }
    if (lookInterval) {
        clearInterval(lookInterval);
        lookInterval = null;
    }
}

module.exports = { startAutoAttack, stopAutoAttack };
