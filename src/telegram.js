const TelegramBot = require('node-telegram-bot-api');
const { log } = require('./logger');

class TelegramManager {
    constructor() {
        this.bot = null;
        this.tgBot = null;
        this.io = null;
        this.config = null;
    }

    init(config, mineflayerBot, io) {
        this.config = config;
        this.bot = mineflayerBot;
        this.io = io;

        const { enabled, token, chatId } = config.telegram;

        if (!enabled || !token) {
            log('Telegram бот выключен или не указан токен.', 'tg');
            this.stop();
            return;
        }

        try {
            if (this.tgBot) this.stop();

            this.tgBot = new TelegramBot(token, { polling: true });
            log('Telegram бот успешно запущен!', 'tg');

            this.setupHandlers(chatId);
        } catch (err) {
            log(`Ошибка запуска Telegram бота: ${err.message}`, 'error');
        }
    }

    stop() {
        if (this.tgBot) {
            try {
                this.tgBot.stopPolling();
            } catch (e) {}
            this.tgBot = null;
        }
    }

    updateBotInstance(mineflayerBot) {
        this.bot = mineflayerBot;
    }

    sendNotification(msg) {
        if (!this.tgBot || !this.config?.telegram?.chatId) return;
        try {
            this.tgBot.sendMessage(this.config.telegram.chatId, msg, { parse_mode: 'HTML' });
        } catch (err) {
            log(`TG Send Error: ${err.message}`, 'error');
        }
    }

    setupHandlers(defaultChatId) {
        if (!this.tgBot) return;

        // Команды
        this.tgBot.onText(/\/start|\/help/, (msg) => {
            if (!this.isAllowed(msg)) return;
            const text = `🎮 <b>Minecraft Bot Telegram Controller</b>\n\n` +
                `<b>Доступные команды:</b>\n` +
                `• /status - Полный статус бота\n` +
                `• /health - Здоровье и сытость\n` +
                `• /coords - Текущие координаты\n` +
                `• /players - Игроки онлайн\n` +
                `• /inventory - Предметы в инвентаре\n` +
                `• /say &lt;сообщение&gt; - Отправить в MC чат\n` +
                `• /attack &lt;on/off&gt; - Авто-атака\n` +
                `• /antiafk &lt;on/off&gt; - Анти-АФК\n` +
                `• /looker &lt;on/off&gt; - Слежение глазами\n` +
                `• /antispam &lt;on/off&gt; - Анти-спам\n` +
                `• /reconnect - Рестарт бота\n` +
                `• /setview &lt;1st/3rd&gt; - Вид камеры\n` +
                `• /stop - Остановить движение\n` +
                `• /config - Настройки`;
            this.tgBot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
        });

        this.tgBot.onText(/\/status/, (msg) => {
            if (!this.isAllowed(msg)) return;
            if (!this.bot || !this.bot.entity) {
                return this.tgBot.sendMessage(msg.chat.id, '🔴 Бот сейчас <b>оффлайн</b>.', { parse_mode: 'HTML' });
            }
            const pos = this.bot.entity.position;
            const hp = Math.round(this.bot.health || 0);
            const food = Math.round(this.bot.food || 0);
            const text = `🟢 <b>Статус бота:</b> ONLINE\n` +
                `❤️ HP: <b>${hp}/20</b> | 🍗 Еда: <b>${food}/20</b>\n` +
                `📍 Позиция: <code>X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}, Z: ${Math.round(pos.z)}</code>\n` +
                `👤 Ник: <code>${this.bot.username}</code>`;
            this.tgBot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
        });

        this.tgBot.onText(/\/health/, (msg) => {
            if (!this.isAllowed(msg)) return;
            if (!this.bot) return this.tgBot.sendMessage(msg.chat.id, '🔴 Бот оффлайн');
            this.tgBot.sendMessage(msg.chat.id, `❤️ HP: ${Math.round(this.bot.health || 0)} | 🍗 Food: ${Math.round(this.bot.food || 0)}`);
        });

        this.tgBot.onText(/\/coords/, (msg) => {
            if (!this.isAllowed(msg)) return;
            if (!this.bot || !this.bot.entity) return this.tgBot.sendMessage(msg.chat.id, '🔴 Бот оффлайн');
            const pos = this.bot.entity.position;
            this.tgBot.sendMessage(msg.chat.id, `📍 X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}, Z: ${Math.round(pos.z)}`);
        });

        this.tgBot.onText(/\/players/, (msg) => {
            if (!this.isAllowed(msg)) return;
            if (!this.bot || !this.bot.players) return this.tgBot.sendMessage(msg.chat.id, '🔴 Бот оффлайн');
            const players = Object.values(this.bot.players).map(p => `${p.username} (${p.ping}ms)`).join('\n');
            const count = Object.keys(this.bot.players).length;
            this.tgBot.sendMessage(msg.chat.id, `👥 <b>Онлайн (${count}):</b>\n${players.slice(0, 3000)}`, { parse_mode: 'HTML' });
        });

        this.tgBot.onText(/\/inventory/, (msg) => {
            if (!this.isAllowed(msg)) return;
            if (!this.bot || !this.bot.inventory) return this.tgBot.sendMessage(msg.chat.id, '🔴 Бот оффлайн');
            const items = this.bot.inventory.items().map(i => `• ${i.displayName || i.name} x${i.count}`).join('\n');
            this.tgBot.sendMessage(msg.chat.id, `🎒 <b>Инвентарь:</b>\n${items || 'Пусто'}`, { parse_mode: 'HTML' });
        });

        this.tgBot.onText(/\/say (.+)/, (msg, match) => {
            if (!this.isAllowed(msg)) return;
            if (!this.bot) return this.tgBot.sendMessage(msg.chat.id, '🔴 Бот оффлайн');
            const chatMsg = match[1];
            this.bot.chat(chatMsg);
            this.tgBot.sendMessage(msg.chat.id, `💬 Отправлено в MC: <i>${chatMsg}</i>`, { parse_mode: 'HTML' });
        });

        this.tgBot.onText(/\/reconnect/, (msg) => {
            if (!this.isAllowed(msg)) return;
            this.tgBot.sendMessage(msg.chat.id, '🔄 Перезапуск бота...');
            if (this.bot) this.bot.quit();
        });

        this.tgBot.onText(/\/attack (on|off)/i, (msg, match) => {
            if (!this.isAllowed(msg)) return;
            const state = match[1].toLowerCase() === 'on';
            if (this.config) this.config.botState.isAttacking = state;
            if (this.io) this.io.emit('stateUpdate', this.config.botState);
            this.tgBot.sendMessage(msg.chat.id, `⚔️ Auto-Attack: <b>${state ? 'ON' : 'OFF'}</b>`, { parse_mode: 'HTML' });
        });

        this.tgBot.onText(/\/antiafk (on|off)/i, (msg, match) => {
            if (!this.isAllowed(msg)) return;
            const state = match[1].toLowerCase() === 'on';
            if (this.config) this.config.botState.isAntiAfk = state;
            if (this.io) this.io.emit('stateUpdate', this.config.botState);
            this.tgBot.sendMessage(msg.chat.id, `🏃 Anti-AFK: <b>${state ? 'ON' : 'OFF'}</b>`, { parse_mode: 'HTML' });
        });

        this.tgBot.onText(/\/stop/, (msg) => {
            if (!this.isAllowed(msg)) return;
            if (this.bot) {
                this.bot.clearControlStates();
                if (this.bot.pathfinder) this.bot.pathfinder.setGoal(null);
            }
            this.tgBot.sendMessage(msg.chat.id, '🛑 Все действия бота остановлены.');
        });

        // Пересылка обычных сообщений из TG в MC чат (если разрешено)
        this.tgBot.on('message', (msg) => {
            if (msg.text && msg.text.startsWith('/')) return; // Игнорируем команды
            if (!this.isAllowed(msg)) return;
            if (!this.config?.telegram?.forwardTgToMc) return;

            if (this.bot) {
                const name = msg.from.first_name || msg.from.username || 'TG';
                this.bot.chat(`[TG] ${name}: ${msg.text}`);
            }
        });
    }

    isAllowed(msg) {
        if (!this.config?.telegram?.allowedUsers?.length) return true;
        const userId = String(msg.from.id);
        const username = msg.from.username;
        return this.config.telegram.allowedUsers.includes(userId) ||
               (username && this.config.telegram.allowedUsers.includes(username));
    }
}

module.exports = new TelegramManager();
