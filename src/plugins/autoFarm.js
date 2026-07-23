const { log } = require('../logger');

let farmInterval = null;
let shearInterval = null;

const cropSeedsMap = {
    'wheat': 'wheat_seeds',
    'carrots': 'carrot',
    'potatoes': 'potato',
    'beetroots': 'beetroot_seeds'
};

function startAutoFarm(bot, botState, pathfinderPkg, io) {
    stopAutoFarm();

    farmInterval = setInterval(async () => {
        if (!bot || !bot.entity || !botState.autoFarm) return;

        try {
            // Find mature crops within 16 blocks radius
            const cropBlocks = bot.findBlocks({
                matching: (block) => {
                    if (!block || !block.name) return false;
                    const isCrop = ['wheat', 'carrots', 'potatoes', 'beetroots'].includes(block.name);
                    if (!isCrop) return false;
                    // Fully grown metadata is age 7 (or 3 for beetroots)
                    const maxAge = block.name === 'beetroots' ? 3 : 7;
                    return block.metadata === maxAge;
                },
                maxDistance: 16,
                count: 10
            });

            if (cropBlocks && cropBlocks.length > 0) {
                const targetPos = cropBlocks[0];
                const block = bot.blockAt(targetPos);

                if (block) {
                    if (io) io.emit('log', `🌾 Сбор урожая ${block.name} (X: ${targetPos.x}, Z: ${targetPos.z})`);

                    // Dig mature crop
                    await bot.dig(block);

                    // Replant if we have seeds
                    const cropType = block.name;
                    const seedName = cropSeedsMap[cropType];
                    const seedItem = bot.inventory.items().find(i => i.name === seedName || i.name === cropType);

                    if (seedItem) {
                        await bot.equip(seedItem, 'hand');
                        const farmland = bot.blockAt(targetPos.offset(0, -1, 0));
                        if (farmland && farmland.name === 'farmland') {
                            await bot.placeBlock(farmland, { x: 0, y: 1, z: 0 });
                        }
                    }
                }
            }
        } catch (err) {
            // Ignore temporary path or dig errors
        }
    }, 3000);
}

function stopAutoFarm() {
    if (farmInterval) {
        clearInterval(farmInterval);
        farmInterval = null;
    }
}

function startAutoShear(bot, botState, io) {
    stopAutoShear();

    shearInterval = setInterval(async () => {
        if (!bot || !bot.entity || !botState.autoShear) return;

        try {
            // Find sheared sheep nearby (< 4 blocks)
            const sheep = bot.nearestEntity(e =>
                e.name === 'sheep' &&
                !e.metadata[16] && // metadata 16 bit indicates sheared
                bot.entity.position.distanceTo(e.position) < 4
            );

            if (sheep) {
                const shears = bot.inventory.items().find(i => i.name === 'shears');
                if (shears) {
                    await bot.equip(shears, 'hand');
                    await bot.activateEntity(sheep);
                    if (io) io.emit('log', `✂️ Стрижка овцы ${sheep.id}`);
                }
            }
        } catch (err) {
            // Ignore temporary errors
        }
    }, 2500);
}

function stopAutoShear() {
    if (shearInterval) {
        clearInterval(shearInterval);
        shearInterval = null;
    }
}

async function depositToChest(bot, io) {
    if (!bot || !bot.inventory) return false;

    try {
        const chestBlock = bot.findBlock({
            matching: (b) => b && (b.name === 'chest' || b.name === 'trapped_chest' || b.name === 'barrel'),
            maxDistance: 6
        });

        if (!chestBlock) {
            if (io) io.emit('log', '⚠️ Ближайший сундук не найден (нужен в радиусе 6 блоков)');
            return false;
        }

        const chest = await bot.openContainer(chestBlock);
        if (io) io.emit('log', '📦 Открыт сундук. Перемещение ресурсов...');

        const itemsToDeposit = bot.inventory.items().filter(item =>
            ['wheat', 'wheat_seeds', 'carrot', 'potato', 'beetroot', 'beetroot_seeds', 'white_wool', 'black_wool', 'red_wool', 'blue_wool'].some(k => item.name.includes(k))
        );

        for (const item of itemsToDeposit) {
            await chest.deposit(item.type, null, item.count);
        }

        chest.close();
        if (io) io.emit('log', '✅ Все добытые ресурсы сложены в сундук!');
        return true;
    } catch (err) {
        if (io) io.emit('log', `⚠️ Ошибка разгрузки сундука: ${err.message}`);
        return false;
    }
}

module.exports = { startAutoFarm, stopAutoFarm, startAutoShear, stopAutoShear, depositToChest };
