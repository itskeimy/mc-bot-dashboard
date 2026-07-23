class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem('mc_sound_enabled') !== 'false';
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('mc_sound_enabled', this.enabled ? 'true' : 'false');
        this.updateBtnUI();
        if (this.enabled) this.playPop();
    }

    updateBtnUI() {
        const btn = document.getElementById('btn-sound-toggle');
        if (btn) {
            btn.innerHTML = this.enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
            btn.style.backgroundColor = this.enabled ? '' : '#c62828 !important';
        }
    }

    playClick() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.04);

            gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.04);
        } catch (e) {}
    }

    playPop() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.07);

            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.07);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.07);
        } catch (e) {}
    }

    playXp() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const notes = [880, 1046, 1318];
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.06);

                gain.gain.setValueAtTime(0.15, now + i * 0.06);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.12);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + i * 0.06);
                osc.stop(now + i * 0.06 + 0.12);
            });
        } catch (e) {}
    }

    playHurt() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.15);

            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.15);
        } catch (e) {}
    }

    playChest() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(450, this.ctx.currentTime + 0.12);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch (e) {}
    }

    playDanger() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            [600, 850].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now + i * 0.12);

                gain.gain.setValueAtTime(0.25, now + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.18);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + i * 0.12);
                osc.stop(now + i * 0.12 + 0.18);
            });
        } catch (e) {}
    }
}

const sounds = new SoundManager();

document.addEventListener('DOMContentLoaded', () => {
    sounds.updateBtnUI();
});

document.addEventListener('click', (e) => {
    sounds.init();
    if (e.target.closest('.wasd-btn') || e.target.closest('.wasd-grid') || e.target.closest('.action-row')) {
        return;
    }
    if (e.target.closest('.mc-btn') || e.target.closest('.mc-number-btn')) {
        sounds.playClick();
    } else if (e.target.closest('.inv-slot')) {
        sounds.playPop();
    }
});
