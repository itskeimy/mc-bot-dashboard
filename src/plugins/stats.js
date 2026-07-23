class SessionStatsManager {
    constructor() {
        this.startTime = Date.now();
        this.distanceWalked = 0;
        this.lastPos = null;
        this.messagesReceived = 0;
        this.mobsKilled = 0;
    }

    reset() {
        this.startTime = Date.now();
        this.distanceWalked = 0;
        this.lastPos = null;
        this.messagesReceived = 0;
        this.mobsKilled = 0;
    }

    updatePosition(pos) {
        if (!pos) return;
        if (this.lastPos) {
            const dx = pos.x - this.lastPos.x;
            const dy = pos.y - this.lastPos.y;
            const dz = pos.z - this.lastPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist > 0.1 && dist < 10) { // Ignore teleports
                this.distanceWalked += dist;
            }
        }
        this.lastPos = { x: pos.x, y: pos.y, z: pos.z };
    }

    incrementMessages() {
        this.messagesReceived++;
    }

    incrementKills() {
        this.mobsKilled++;
    }

    getStats(bot) {
        const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
        let timeOfDay = 'Day';
        let isDay = true;
        let biome = 'Unknown';
        let dimension = 'Overworld';

        if (bot) {
            if (bot.time) {
                const time = bot.time.timeOfDay;
                isDay = time >= 0 && time < 12000;
                timeOfDay = isDay ? 'Day ☀️' : 'Night 🌙';
            }
            if (bot.game && bot.game.dimension) {
                dimension = bot.game.dimension;
            }
            if (bot.blockAt && bot.entity && bot.entity.position) {
                try {
                    const block = bot.blockAt(bot.entity.position);
                    if (block && block.biome) {
                        biome = block.biome.name || 'Unknown';
                    }
                } catch (e) {}
            }
        }

        return {
            uptime: uptimeSec,
            distanceWalked: Math.round(this.distanceWalked),
            messagesReceived: this.messagesReceived,
            mobsKilled: this.mobsKilled,
            timeOfDay,
            isDay,
            biome,
            dimension
        };
    }
}

module.exports = new SessionStatsManager();
