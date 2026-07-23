const { log } = require('../logger');

let isSorting = false;
let currentSortTask = null;

// Default categorization rules (can be customized via config)
const defaultCategories = {
    'building': ['cobblestone', 'stone', 'dirt', 'sand', 'gravel', 'planks', 'log', 'brick', 'glass', 'terracotta', 'concrete', 'diorite', 'andesite', 'granite', 'deepslate', 'slab', 'stairs', 'wall'],
    'ores': ['diamond', 'emerald', 'iron', 'gold', 'copper', 'coal', 'lapis', 'redstone', 'raw_', 'ingot', 'nugget', 'quartz', 'netherite', 'amethyst'],
    'food': ['wheat', 'seed', 'carrot', 'potato', 'beetroot', 'apple', 'bread', 'beef', 'chicken', 'porkchop', 'mutton', 'fish', 'cod', 'salmon', 'golden_apple', 'melon', 'cookie', 'stew', 'soup', 'sweet_berries'],
    'gear': ['sword', 'pickaxe', 'axe', 'shovel', 'hoe', 'helmet', 'chestplate', 'leggings', 'boots', 'bow', 'arrow', 'shield', 'totem', 'elytra', 'mace', 'trident'],
    'redstone_misc': ['repeater', 'comparator', 'dust', 'repeater', 'observer', 'piston', 'dispenser', 'dropper', 'hopper', 'potion', 'gunpowder', 'book', 'string', 'feather', 'bone', 'paper', 'leather']
};

function getItemCategory(itemName, customRules) {
    const lower = itemName.toLowerCase();
    const categories = customRules || defaultCategories;

    for (const [cat, keywords] of Object.entries(categories)) {
        if (keywords.some(k => lower.includes(k))) {
            return cat;
        }
    }
    return 'misc';
}

// Reliable pathfinding helper with timeout
async function walkToBlockReliable(bot, blockPos, pathfinderPkg, timeoutMs = 8000) {
    if (!bot || !bot.pathfinder || !blockPos) return false;

    return new Promise((resolve) => {
        let isDone = false;

        const timer = setTimeout(() => {
            if (!isDone) {
                isDone = true;
                if (bot.pathfinder) bot.pathfinder.setGoal(null);
                resolve(false); // Timeout failed
            }
        }, timeoutMs);

        try {
            const { goals, Movements } = pathfinderPkg;
            bot.pathfinder.setMovements(new Movements(bot));
            bot.pathfinder.setGoal(new goals.GoalBlock(blockPos.x, blockPos.y, blockPos.z));

            const checkArrival = setInterval(() => {
                if (isDone || !bot || !bot.entity) {
                    clearInterval(checkArrival);
                    return;
                }
                const dist = bot.entity.position.distanceTo(blockPos);
                if (dist < 3.5) {
                    clearInterval(checkArrival);
                    clearTimeout(timer);
                    isDone = true;
                    resolve(true);
                }
            }, 300);
        } catch (e) {
            clearTimeout(timer);
            isDone = true;
            resolve(false);
        }
    });
}

// Reliable container opener with retries
async function openContainerReliable(bot, block, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const container = await bot.openContainer(block);
            return container;
        } catch (err) {
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, 600)); // Wait before retry
        }
    }
    return null;
}

async function startChestSorting(bot, pathfinderPkg, io, customConfig = {}) {
    if (isSorting || !bot) return false;

    isSorting = true;
    const searchRadius = customConfig.searchRadius || 16;
    const categoryRules = customConfig.categoryRules || defaultCategories;

    if (io) io.emit('log', `🗃 Запуск надежной сортировки сундуков (Радиус: ${searchRadius}м)...`);

    try {
        // 1. Find all nearby chests safely
        const chestBlocks = bot.findBlocks({
            matching: (b) => b && (b.name === 'chest' || b.name === 'trapped_chest' || b.name === 'barrel'),
            maxDistance: searchRadius,
            count: 30
        });

        if (!chestBlocks || chestBlocks.length < 2) {
            if (io) io.emit('log', `⚠️ Найдено менее 2 сундуков в радиусе ${searchRadius}м.`);
            isSorting = false;
            return false;
        }

        if (io) io.emit('log', `📦 Обнаружено ${chestBlocks.length} сундуков. Сбор и распределение ресурсов...`);

        // Phase 1: Withdraw items from unsorted chests into inventory with overflow protection
        for (let i = 0; i < chestBlocks.length; i++) {
            if (!isSorting) break;
            const chestPos = chestBlocks[i];

            const walked = await walkToBlockReliable(bot, chestPos, pathfinderPkg);
            if (!walked) {
                if (io) io.emit('log', `⚠️ Не удалось подойти к сундуку #${i + 1}, пропуск.`);
                continue;
            }

            const block = bot.blockAt(chestPos);
            if (!block) continue;

            try {
                const container = await openContainerReliable(bot, block);
                if (container) {
                    const items = container.containerItems();
                    if (items && items.length > 0) {
                        for (const item of items) {
                            if (bot.inventory.emptySlotCount() === 0) {
                                if (io) io.emit('log', '🎒 Инвентарь полон! Переходим к распределению.');
                                break;
                            }
                            await container.withdraw(item.type, null, item.count);
                        }
                    }
                    container.close();
                }
            } catch (err) {
                if (io) io.emit('log', `⚠️ Ошибка доступа к сундуку #${i + 1}: ${err.message}`);
            }
        }

        if (!isSorting) return false;

        // Phase 2: Assign chests to categories
        const categoriesList = Object.keys(categoryRules);
        const assignedChests = {};

        categoriesList.forEach((cat, index) => {
            const chestIndex = index % chestBlocks.length;
            assignedChests[cat] = chestBlocks[chestIndex];
        });

        // Phase 3: Deposit items into designated category chests
        for (const [category, chestPos] of Object.entries(assignedChests)) {
            if (!isSorting) break;

            const itemsToDeposit = bot.inventory.items().filter(item => getItemCategory(item.name, categoryRules) === category);
            if (itemsToDeposit.length === 0) continue;

            const walked = await walkToBlockReliable(bot, chestPos, pathfinderPkg);
            if (!walked) continue;

            const block = bot.blockAt(chestPos);
            if (!block) continue;

            try {
                const container = await openContainerReliable(bot, block);
                if (container) {
                    if (io) io.emit('log', `🗃 Категория [${category.toUpperCase()}]: Складываем ${itemsToDeposit.length} видов предметов...`);
                    for (const item of itemsToDeposit) {
                        await container.deposit(item.type, null, item.count);
                    }
                    container.close();
                }
            } catch (err) {
                if (io) io.emit('log', `⚠️ Ошибка разгрузки категории ${category}: ${err.message}`);
            }
        }

        if (io) io.emit('log', '✅ Сортировка сундуков успешно и надежно завершена!');
    } catch (err) {
        if (io) io.emit('log', `⚠️ Критическая ошибка сортировки: ${err.message}`);
    } finally {
        isSorting = false;
        if (bot && bot.pathfinder) bot.pathfinder.setGoal(null);
    }
}

function stopChestSorting(bot) {
    isSorting = false;
    if (bot && bot.pathfinder) {
        bot.pathfinder.setGoal(null);
    }
}

function isChestSortingActive() {
    return isSorting;
}

module.exports = { startChestSorting, stopChestSorting, isChestSortingActive };
