let patrolInterval = null;
let currentPatrolIndex = 0;
let isPatrolling = false;

function startPatrol(bot, waypoints, mode = 'loop', delaySec = 3, pathfinderPkg, io) {
    stopPatrol(bot);

    if (!waypoints || waypoints.length === 0 || !bot) return false;

    isPatrolling = true;
    currentPatrolIndex = 0;

    if (io) io.emit('log', `🔄 Патруль запущен: ${waypoints.length} точек (${mode})`);

    const moveToNextPoint = () => {
        if (!isPatrolling || !bot || !bot.pathfinder) return;

        if (currentPatrolIndex >= waypoints.length) {
            if (mode === 'loop') {
                currentPatrolIndex = 0;
            } else {
                stopPatrol(bot);
                if (io) io.emit('log', `✅ Патруль завершен.`);
                return;
            }
        }

        const wp = waypoints[currentPatrolIndex];
        if (io) io.emit('log', `📍 Патруль [${currentPatrolIndex + 1}/${waypoints.length}]: ${wp.name} (${wp.x}, ${wp.y}, ${wp.z})`);

        const { goals, Movements } = pathfinderPkg;
        bot.pathfinder.setMovements(new Movements(bot));
        bot.pathfinder.setGoal(new goals.GoalBlock(wp.x, wp.y, wp.z));

        // Check arrival
        const checkArrival = setInterval(() => {
            if (!isPatrolling || !bot || !bot.entity) {
                clearInterval(checkArrival);
                return;
            }

            const dist = bot.entity.position.distanceTo({ x: wp.x, y: wp.y, z: wp.z });
            if (dist < 2.0) {
                clearInterval(checkArrival);
                if (io) io.emit('log', `⏳ Точка ${wp.name} достигнута. Пауза ${delaySec} сек...`);

                currentPatrolIndex++;
                patrolInterval = setTimeout(moveToNextPoint, delaySec * 1000);
            }
        }, 1000);
    };

    moveToNextPoint();
    return true;
}

function stopPatrol(bot) {
    isPatrolling = false;
    if (patrolInterval) {
        clearTimeout(patrolInterval);
        patrolInterval = null;
    }
    if (bot && bot.pathfinder) {
        bot.pathfinder.setGoal(null);
    }
}

function getPatrolState() {
    return { isPatrolling, currentPatrolIndex };
}

module.exports = { startPatrol, stopPatrol, getPatrolState };
