// MC Bot Dashboard — Server Entry Point
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const { log } = require('./logger');
const { getConfig, updateConfig, loadConfig } = require('./config');
const { createBot, getBotInstance, closeViewer } = require('./bot');
const telegramManager = require('./telegram');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// текстуры вьювера
const texturesPath = path.join(__dirname, '..', 'node_modules', 'prismarine-viewer', 'public', 'textures', '1.21.4');
app.use('/textures', express.static(texturesPath));
app.use('/mc_assets', express.static(path.join(__dirname, '..', 'public', 'mc_assets')));

// эндпоинты api
app.get('/api/config', (req, res) => {
    res.json(getConfig());
});

app.post('/api/config', (req, res) => {
    const updated = updateConfig(req.body);
    const bot = getBotInstance();

    // перезапуск телеграма при обновлении конфига
    telegramManager.init(updated, bot, io);

    res.json({ success: true, config: updated });
});

app.get('/api/status', (req, res) => {
    const bot = getBotInstance();
    if (!bot || !bot.entity) {
        return res.json({ online: false });
    }
    res.json({
        online: true,
        username: bot.username,
        health: bot.health,
        food: bot.food,
        position: bot.entity.position,
        playersCount: bot.players ? Object.keys(bot.players).length : 0
    });
});

process.on('uncaughtException', (err) => {
    log(`Критическая ошибка: ${err.stack}`, 'error');
    if (err.code === 'EADDRINUSE') {
        log('Порт занят, освобождаем viewer...', 'warn');
        closeViewer();
    }
});

process.on('unhandledRejection', (reason) => {
    log(`Необработанный промис: ${reason}`, 'error');
});

const config = loadConfig();
const PORT = config.server.port || 3000;

server.listen(PORT, () => {
    log(`САЙТ ЗАПУЩЕН: http://localhost:${PORT}`, 'success');
    telegramManager.init(config, null, io);
    createBot(io);
});
