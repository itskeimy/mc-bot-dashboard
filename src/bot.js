const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const minecraftData = require('minecraft-data');

const { log } = require('./logger');
const { getConfig, saveConfig } = require('./config');
const antiSpam = require('./plugins/antiSpam');
const { startAntiAfk, stopAntiAfk, notifyManualControl } = require('./plugins/antiAfk');
const { startAutoAttack, stopAutoAttack } = require('./plugins/autoAttack');
const { startAutoTotem, stopAutoTotem } = require('./plugins/autoTotem');
const { startAutoArmor, stopAutoArmor } = require('./plugins/autoArmor');
const { startPatrol, stopPatrol, getPatrolState } = require('./plugins/patrol');
const { startAutoFarm, stopAutoFarm, startAutoShear, stopAutoShear, depositToChest } = require('./plugins/autoFarm');
const { startChestSorting, stopChestSorting, isChestSortingActive } = require('./plugins/chestSorter');
const waypointsPlugin = require('./plugins/waypoints');
const statsManager = require('./plugins/stats');
const telegramManager = require('./telegram');
const { startDurabilityManager, stopDurabilityManager } = require('./plugins/durabilityManager');

let autoeatImport = require('mineflayer-auto-eat');
let autoeat = autoeatImport.plugin || autoeatImport.default || autoeatImport;
let pathfinderPkg = require('mineflayer-pathfinder');
let pathfinder = pathfinderPkg.pathfinder || pathfinderPkg.default.pathfinder;

let bot = null;
let io = null;
let updateInterval = null;
let mcData = null;

function closeViewer() {
    if (bot && bot.viewer) {
        try {
            log('Закрытие камеры viewer...', 'viewer');
            bot.viewer.close();
            bot.viewer = null;
        } catch (err) {
            log(`Ошибка закрытия viewer: ${err.message}`, 'error');
        }
    }
}

function initViewer(config) {
    if (!bot) return;
    if (bot.viewer) return;

    closeViewer();

    setTimeout(() => {
        try {
            const viewerPort = config.server.viewerPort || 3007;
            mineflayerViewer(bot, {
                port: viewerPort,
                firstPerson: config.viewer.firstPerson,
                viewDistance: config.viewer.viewDistance
            });

            const mode = config.viewer.firstPerson ? '1-е лицо' : '3-е лицо';
            log(`Камера запущена на порту ${viewerPort} (${mode})`, 'viewer');
            if (io) {
                io.emit('log', `🎥 Режим камеры: ${mode}`);
                io.emit('reloadViewer');
                io.emit('viewMode', config.viewer.firstPerson ? '1st' : '3rd');
            }
        } catch (err) {
            log(`Ошибка запуска камеры: ${err.message}`, 'error');
            if (io) io.emit('log', '⚠️ Ошибка запуска камеры.');
        }
    }, 1500);
}

function sendInventory() {
    if (!bot || !bot.inventory) return;

    const items = new Array(46).fill(null);
    bot.inventory.slots.forEach((item, index) => {
        if (index >= 46) return;
        if (item) {
            let isBlock = false;
            if (mcData) {
                isBlock = !!mcData.blocksByName[item.name];
            } else {
                isBlock = !['sword', 'pickaxe', 'axe', 'shovel', 'hoe', 'apple', 'bottle', 'rocket', 'totem', 'crystal', 'flint', 'steel', 'book', 'helmet', 'chestplate', 'leggings', 'boots', 'feather', 'string', 'gunpowder', 'quartz', 'potion', 'ingot', 'diamond', 'emerald', 'coal', 'stick', 'raw_iron', 'raw_gold', 'raw_copper'].some(k => item.name.includes(k));
            }

            let maxDur = item.maxDurability || 0;
            let durUsed = item.durabilityUsed !== undefined ? item.durabilityUsed : 0;
            let durPct = null;
            if (maxDur > 0) {
                const remaining = Math.max(0, maxDur - durUsed);
                durPct = Math.round((remaining / maxDur) * 100);
            }

            items[index] = {
                name: item.name,
                count: item.count,
                displayName: item.displayName,
                isBlock: isBlock,
                maxDurability: maxDur,
                durabilityUsed: durUsed,
                durabilityPct: durPct
            };
        }
    });

    const activeSlot = 36 + (bot.quickBarSlot !== undefined ? bot.quickBarSlot : 0);

    if (io) {
        io.emit('inventory', {
            slots: items,
            activeSlot: activeSlot
        });
    }
}

function sendPlayerList() {
    if (!bot || !bot.players) return;
    const players = Object.values(bot.players).map(p => ({
        username: p.username,
        ping: p.ping
    }));
    players.sort((a, b) => a.username.localeCompare(b.username));
    if (io) io.emit('playerList', players);
}

function sendRadarData() {
    if (!bot || !bot.entity) return;

    const entities = [];
    const botPos = bot.entity.position;

    for (const id in bot.entities) {
        const e = bot.entities[id];
        if (e === bot.entity) continue;
        if (!e.position) continue;
        
        const dist = botPos.distanceTo(e.position);
        if (dist > 64) continue;

        entities.push({
            id: e.id,
            type: e.type,
            kind: e.kind,
            name: e.username || e.name || 'Unknown',
            dx: Math.round(e.position.x - botPos.x),
            dz: Math.round(e.position.z - botPos.z),
            dy: Math.round(e.position.y - botPos.y),
            x: e.position.x,
            y: e.position.y,
            z: e.position.z,
            dist: Math.round(dist)
        });
    }

    if (io) {
        io.emit('radar', {
            botYaw: bot.entity.yaw,
            entities
        });
    }
}

function startAutoEat(botInstance, botState) {
    if (!botInstance || !botInstance.autoEat) return;
    if (botState && botState.autoEat) {
        botInstance.autoEat.enable();
        botInstance.autoEat.options = { priority: 'foodPoints', startAt: 19, bannedFood: [] };
    } else {
        botInstance.autoEat.disable();
    }
}

const vec3 = require('vec3');

function sendWorldMapData() {
    if (!bot || !bot.entity || !bot.world) return;

    const botPos = bot.entity.position;
    const radius = 64;
    const blocks = [];
    const paletteMap = new Map();
    const palette = [];

    const getPaletteIndex = (name) => {
        let idx = paletteMap.get(name);
        if (idx === undefined) {
            idx = palette.length;
            paletteMap.set(name, idx);
            palette.push(name);
        }
        return idx;
    };

    const botX = Math.floor(botPos.x);
    const botY = Math.floor(botPos.y);
    const botZ = Math.floor(botPos.z);

    const minY = Math.max(-64, botY - 35);
    const maxY = Math.min(319, botY + 35);

    const pos = vec3(0, 0, 0);

    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            pos.x = botX + dx;
            pos.z = botZ + dz;
            try {
                for (let y = maxY; y >= minY; y--) {
                    pos.y = y;
                    const block = bot.blockAt(pos);
                    if (block && block.name && block.name !== 'air' && block.name !== 'cave_air' && block.name !== 'void_air') {
                        blocks.push([dx, dz, y, getPaletteIndex(block.name)]);
                        break;
                    }
                }
            } catch (e) {}
        }
    }

    if (blocks.length > 0 && io) {
        io.emit('worldMap', {
            botPos: { x: botX, y: botY, z: botZ },
            botYaw: bot.entity.yaw,
            radius,
            palette,
            blocks
        });
    }
}


function updateStatus(config) {
    if (!bot || !bot.entity) return;

    statsManager.updatePosition(bot.entity.position);
    const stats = statsManager.getStats(bot);

    if (io) {
        io.emit('status', {
            username: bot.username || config.minecraft.username,
            health: bot.health || 0,
            food: bot.food || 0,
            pos: bot.entity.position || { x: 0, y: 0, z: 0 },
            level: bot.experience ? bot.experience.level : 0,
            progress: bot.experience ? bot.experience.progress : 0,
            botState: config.botState,
            patrolState: getPatrolState(),
            isSortingChests: isChestSortingActive(),
            stats
        });
    }
}

function createBot(socketIo) {
    if (socketIo) io = socketIo;
    const config = getConfig();

    log('Запуск процесса создания бота...', 'bot');

    bot = mineflayer.createBot({
        host: config.minecraft.host,
        port: config.minecraft.port || 25565,
        username: config.minecraft.username,
        auth: config.minecraft.auth,
        profilesFolder: config.minecraft.profilesFolder,
        version: config.minecraft.version,
        hideErrors: true
    });

    try {
        mcData = minecraftData(config.minecraft.version);
    } catch (e) {
        mcData = null;
    }

    if (typeof pathfinder === 'function') bot.loadPlugin(pathfinder);
    if (typeof autoeat === 'function') bot.loadPlugin(autoeat);

    telegramManager.updateBotInstance(bot);

    bot.once('spawn', () => {
        log(`Бот ${bot.username} успешно заспавнился!`, 'success');
        statsManager.reset();
        if (io) io.emit('log', '✅ Бот зашел на сервер!');

        telegramManager.sendNotification(`✅ <b>${bot.username}</b> успешно зашел на сервер <code>${config.minecraft.host}</code>!`);

        setTimeout(() => {
            initViewer(config);
        }, 3000);

        if (bot.autoEat) {
            bot.autoEat.options = { priority: 'foodPoints', startAt: 19, bannedFood: [] };
        }

        startAntiAfk(bot, config.botState);
        startAutoAttack(bot, config.botState);
        startAutoTotem(bot, config.botState);
        startAutoArmor(bot, config.botState);
        startAutoEat(bot, config.botState);
        startDurabilityManager(bot, config.botState, io);
        startAutoFarm(bot, config.botState, pathfinderPkg, io);
        startAutoShear(bot, config.botState, io);

        bot.on('heldItemChanged', sendInventory);

        let lastHealth = bot.health;
        bot.on('health', () => {
            if (bot.health < lastHealth && io) {
                io.emit('playSound', 'hurt');
            }
            lastHealth = bot.health;
        });

        bot.on('experience', () => {
            if (io) io.emit('playSound', 'xp');
        });

        bot.on('windowOpen', () => {
            if (io) io.emit('playSound', 'chest');
        });

        let tickCounter = 0;
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(() => {
            try {
                tickCounter++;
                updateStatus(config);
                sendInventory();
                sendPlayerList();
                sendRadarData();

                if (tickCounter % 3 === 0) {
                    sendWorldMapData();
                }
            } catch (e) {
                // Never let one function's error kill the entire update loop
                console.error('[updateInterval] Error in tick:', e.message);
            }
        }, 1000);
    });

    bot.on('messagestr', (msg) => {
        if (antiSpam.isSpam(msg, config.botState.isAntiSpam)) return;
        statsManager.incrementMessages();
        if (io) io.emit('chat', msg);

        if (config.telegram.forwardMcToTg) {
            telegramManager.sendNotification(`💬 ${msg.replace(/§./g, '')}`);
        }
    });

    bot.on('entityDead', (entity) => {
        if (entity.type === 'mob' || entity.type === 'hostile') {
            statsManager.incrementKills();
        }
    });

    bot.on('kicked', (reason) => {
        log(`Бот был кикнут: ${JSON.stringify(reason)}`, 'warn');
        if (io) io.emit('log', `❌ Кикнут: ${JSON.stringify(reason)}`);
        telegramManager.sendNotification(`❌ Бот кикнут: ${JSON.stringify(reason)}`);
    });

    bot.on('error', (err) => {
        log(`Ошибка бота: ${err.message}`, 'error');
        if (io) io.emit('log', `⚠️ Ошибка: ${err.message}`);
    });

    bot.on('end', () => {
        log('Соединение разорвано. Очистка ресурсов...', 'warn');
        if (io) io.emit('log', '⚠️ Соединение разорвано.');

        stopAntiAfk();
        stopAutoAttack();
        stopAutoTotem();
        stopAutoArmor();
        stopDurabilityManager();
        stopAutoFarm();
        stopAutoShear();
        stopPatrol(bot);
        stopChestSorting(bot);

        if (updateInterval) clearInterval(updateInterval);
        closeViewer();

        if (config.minecraft.autoReconnect) {
            const delay = config.minecraft.reconnectDelay || 30000;
            if (io) io.emit('log', `⏳ Рестарт через ${delay / 1000} сек...`);
            setTimeout(() => createBot(io), delay);
        }
    });

    setupSocketEvents(io);
}

function setupSocketEvents(socketIo) {
    if (!socketIo) return;

    socketIo.removeAllListeners('connection');
    socketIo.on('connection', (socket) => {
        const config = getConfig();
        socket.emit('log', 'Веб-интерфейс подключен.');
        socket.emit('stateUpdate', config.botState);
        socket.emit('viewMode', config.viewer.viewMode || (config.viewer.firstPerson ? '1st' : '3rd'));
        socket.emit('waypoints', waypointsPlugin.getWaypoints());

        socket.on('chat', (msg) => { if (bot) bot.chat(msg); });
        socket.on('sendChat', (msg) => { if (bot) bot.chat(msg); });
        socket.on('requestWorldMap', () => { sendWorldMapData(); });

        socket.on('toggleState', (key) => {
            if (config.botState.hasOwnProperty(key)) {
                config.botState[key] = !config.botState[key];
                saveConfig();
                socketIo.emit('stateUpdate', config.botState);

                if (key === 'isAntiAfk') startAntiAfk(bot, config.botState);
                if (key === 'isAttacking') startAutoAttack(bot, config.botState);
                if (key === 'autoTotem') startAutoTotem(bot, config.botState);
                if (key === 'autoArmor') startAutoArmor(bot, config.botState);
                if (key === 'autoEat') startAutoEat(bot, config.botState);
                if (key === 'autoFarm') startAutoFarm(bot, config.botState, pathfinderPkg, io);
                if (key === 'autoShear') startAutoShear(bot, config.botState, io);
            }
        });

        socket.on('move', (data) => {
            if (!bot) return;
            notifyManualControl();
            const { control, state } = data;
            if (control && typeof state === 'boolean') {
                bot.setControlState(control, state);
            }
        });

        socket.on('action', (actionType) => {
            if (!bot) return;
            notifyManualControl();
            if (actionType === 'attack') {
                const target = bot.nearestEntity();
                if (target) bot.attack(target);
            } else if (actionType === 'use') {
                bot.activateItem();
            } else if (actionType === 'jump') {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 300);
            } else if (actionType === 'drop') {
                const held = bot.inventory.slots[bot.quickBarSlot + 36];
                if (held) bot.tossStack(held);
            }
        });

        // сортировка сундуков
        socket.on('startChestSort', () => {
            if (bot) {
                startChestSorting(bot, pathfinderPkg, io);
            }
        });

        socket.on('stopChestSort', () => {
            if (bot) {
                stopChestSorting(bot);
                if (io) io.emit('log', '🛑 Сортировка сундуков остановлена.');
            }
        });

        socket.on('depositChest', async () => {
            if (bot) {
                await depositToChest(bot, io);
            }
        });

        socket.on('startPatrol', (params) => {
            if (bot) {
                const { mode, delay } = params || {};
                const wps = waypointsPlugin.getWaypoints();
                startPatrol(bot, wps, mode || 'loop', delay || 3, pathfinderPkg, io);
            }
        });

        socket.on('stopPatrol', () => {
            if (bot) {
                stopPatrol(bot);
                if (io) io.emit('log', '🛑 Патруль остановлен.');
            }
        });

        socket.on('mapWalkTo', (coords) => {
            if (!bot || !bot.pathfinder || !coords) return;
            const { x, z } = coords;
            const y = bot.entity ? Math.floor(bot.entity.position.y) : 64;

            const { goals, Movements } = pathfinderPkg;
            bot.pathfinder.setMovements(new Movements(bot));
            bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z));
            if (io) io.emit('log', `🗺 Карта: Идем в точку (X: ${x}, Z: ${z})`);
        });

        socket.on('equipSlot', async (slotIndex) => {
            if (!bot || !bot.inventory) return;
            const item = bot.inventory.slots[slotIndex];
            if (item) {
                try {
                    await bot.equip(item, 'hand');
                    if (io) io.emit('log', `🗡 Экипировано: ${item.displayName || item.name}`);
                } catch (e) {
                    if (io) io.emit('log', `⚠️ Ошибка экипировки: ${e.message}`);
                }
            }
        });

        socket.on('tossSlot', async (slotIndex) => {
            if (!bot || !bot.inventory) return;
            const item = bot.inventory.slots[slotIndex];
            if (item) {
                try {
                    await bot.tossStack(item);
                    if (io) io.emit('log', `🗑 Выброшено: ${item.displayName || item.name}`);
                } catch (e) {
                    if (io) io.emit('log', `⚠️ Ошибка выброса: ${e.message}`);
                }
            }
        });

        socket.on('swapSlots', async (data) => {
            if (!bot || !bot.inventory) return;
            const fromSlot = parseInt(data.fromSlot);
            const toSlot = parseInt(data.toSlot);
            if (isNaN(fromSlot) || isNaN(toSlot) || fromSlot === toSlot) return;
            if (fromSlot < 0 || fromSlot > 45 || toSlot < 0 || toSlot > 45) return;

            try {
                // взятие предмета из исходного слота
                await bot.clickWindow(fromSlot, 0, 0);
                // перемещение предмета в целевой слот
                await bot.clickWindow(toSlot, 0, 0);
                // возврат обмененного предмета при наличии в курсоре
                if (bot.inventory.selectedItem) {
                    await bot.clickWindow(fromSlot, 0, 0);
                }

                if (io) {
                    const fromItem = bot.inventory.slots[fromSlot];
                    const toItem = bot.inventory.slots[toSlot];
                    const fromName = fromItem ? (fromItem.displayName || fromItem.name) : 'Пусто';
                    const toName = toItem ? (toItem.displayName || toItem.name) : 'Пусто';
                    io.emit('log', `📦 Смена слотов: #${fromSlot} (${fromName}) ⇄ #${toSlot} (${toName})`);
                }

                sendInventory();
            } catch (err) {
                if (io) io.emit('log', `⚠️ Ошибка перестановки: ${err.message}`);
                sendInventory();
            }
        });

        socket.on('addWaypoint', (name) => {
            if (!bot || !bot.entity) return;
            const pos = bot.entity.position;
            const wp = waypointsPlugin.addWaypoint(name, pos.x, pos.y, pos.z);
            socketIo.emit('waypoints', waypointsPlugin.getWaypoints());
            if (io) io.emit('log', `📍 Добавлена точка: ${wp.name} (${wp.x}, ${wp.y}, ${wp.z})`);
        });

        socket.on('removeWaypoint', (id) => {
            waypointsPlugin.removeWaypoint(id);
            socketIo.emit('waypoints', waypointsPlugin.getWaypoints());
        });

        socket.on('gotoWaypoint', (wp) => {
            if (bot) {
                const ok = waypointsPlugin.navigateToWaypoint(bot, wp, pathfinderPkg);
                if (ok && io) io.emit('log', `🏃 Идём к точке: ${wp.name}`);
            }
        });

        socket.on('stopNavigation', () => {
            if (bot) {
                waypointsPlugin.stopNavigation(bot);
                if (io) io.emit('log', '🛑 Навигация остановлена.');
            }
        });

        socket.on('selectSlot', (slotIndex) => {
            if (!bot) return;
            if (slotIndex >= 0 && slotIndex <= 8) {
                bot.setQuickBarSlot(slotIndex);
            }
        });

        socket.on('changeView', (mode) => {
            config.viewer.viewMode = mode;
            config.viewer.firstPerson = (mode === '1st');
            saveConfig();
            if (bot && bot.emit) {
                bot.emit('viewer_changeView', mode);
            }
        });

        socket.on('reconnect', () => {
            if (bot) {
                if (io) io.emit('log', '🔄 Ручной перезапуск...');
                bot.quit();
            }
        });
    });
}

function getBotInstance() {
    return bot;
}

module.exports = { createBot, getBotInstance, closeViewer };
