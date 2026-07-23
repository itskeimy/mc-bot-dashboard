const fs = require('fs');
const path = require('path');
const { log } = require('../logger');

const configDir = path.join(__dirname, '..', '..', 'config');
const waypointsFile = path.join(configDir, 'waypoints.json');
let waypoints = [];

function loadWaypoints() {
    try {
        if (fs.existsSync(waypointsFile)) {
            const data = fs.readFileSync(waypointsFile, 'utf8');
            waypoints = JSON.parse(data);
        } else {
            waypoints = [];
            saveWaypoints();
        }
    } catch (e) {
        log(`Ошибка загрузки waypoints: ${e.message}`, 'error');
        waypoints = [];
    }
    return waypoints;
}

function saveWaypoints() {
    try {
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(waypointsFile, JSON.stringify(waypoints, null, 2), 'utf8');
    } catch (e) {
        log(`Ошибка сохранения waypoints: ${e.message}`, 'error');
    }
}

function getWaypoints() {
    if (waypoints.length === 0) loadWaypoints();
    return waypoints;
}

function addWaypoint(name, x, y, z) {
    const wp = {
        id: Date.now().toString(),
        name: name || `Waypoint ${waypoints.length + 1}`,
        x: Math.round(x),
        y: Math.round(y),
        z: Math.round(z)
    };
    waypoints.push(wp);
    saveWaypoints();
    return wp;
}

function removeWaypoint(id) {
    waypoints = waypoints.filter(w => w.id !== id);
    saveWaypoints();
    return waypoints;
}

function navigateToWaypoint(bot, waypoint, pathfinderPkg) {
    if (!bot || !bot.pathfinder) return false;

    const { goals, Movements } = pathfinderPkg;
    const defaultMove = new Movements(bot);
    bot.pathfinder.setMovements(defaultMove);

    const goal = new goals.GoalBlock(waypoint.x, waypoint.y, waypoint.z);
    bot.pathfinder.setGoal(goal);
    return true;
}

function stopNavigation(bot) {
    if (bot && bot.pathfinder) {
        bot.pathfinder.setGoal(null);
        return true;
    }
    return false;
}

module.exports = { loadWaypoints, getWaypoints, addWaypoint, removeWaypoint, navigateToWaypoint, stopNavigation };
