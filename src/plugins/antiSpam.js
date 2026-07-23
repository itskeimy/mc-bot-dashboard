class AntiSpamPlugin {
    constructor() {
        this.lastMessages = new Map();
        this.spamPatterns = [
            /https?:\/\//i,
            /discord\.gg/i,
            /kit/i,
            /shop/i,
            /store/i,
            />/
        ];
    }

    isSpam(msg, isEnabled = true) {
        if (!isEnabled) return false;
        if (!msg || typeof msg !== 'string') return false;

        const lowerMsg = msg.toLowerCase();

        // 1. Паттерны
        if (this.spamPatterns.some(pattern => pattern.test(lowerMsg))) {
            return true;
        }

        // 2. Проверка дубликатов от игрока
        const match = msg.match(/<(.+?)>\s(.+)/);
        if (match) {
            const user = match[1];
            const text = match[2];
            const now = Date.now();

            if (this.lastMessages.has(user)) {
                const last = this.lastMessages.get(user);
                if (last.text === text || (now - last.time < 2000)) {
                    this.lastMessages.set(user, { text, time: now });
                    return true;
                }
            }
            this.lastMessages.set(user, { text, time: now });
        }

        return false;
    }
}

module.exports = new AntiSpamPlugin();
