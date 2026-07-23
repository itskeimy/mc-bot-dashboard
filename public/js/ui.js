// Theme Switcher & Dynamic Particle Engine
let currentParticleTheme = 'dark';
let particleAnimationId = null;

function setTheme(themeName) {
    document.body.className = `theme-${themeName}`;
    localStorage.setItem('mc_theme', themeName);
    const select = document.getElementById('theme-select');
    if (select) select.value = themeName;
    updateParticleTheme(themeName);
}

function updateParticleTheme(themeName) {
    currentParticleTheme = themeName;
}

function initBgParticles() {
    let canvas = document.getElementById('bg-particles-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'bg-particles-canvas';
        document.body.prepend(canvas);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 40;

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 3 + 1.5,
            speedY: (Math.random() - 0.7) * 0.7,
            speedX: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.7 + 0.3,
            pulseSpeed: Math.random() * 0.02 + 0.01
        });
    }

    function getThemeParticleColor(theme) {
        switch (theme) {
            case 'nether': return ['#ff4500', '#ff8c00', '#ffd700'];
            case 'end': return ['#ba55d3', '#8a2be2', '#e066ff'];
            case 'emerald': return ['#00ff7f', '#55ff55', '#00fa9a'];
            case 'sculk': return ['#00ffff', '#008b8b', '#20b2aa'];
            case 'redstone': return ['#ff0000', '#dc143c', '#ff4500'];
            default: return ['#55ff55', '#88ff88', '#ffff55'];
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        const colors = getThemeParticleColor(currentParticleTheme);

        particles.forEach((p, idx) => {
            p.y += p.speedY;
            p.x += p.speedX;

            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;

            const color = colors[idx % colors.length];
            ctx.fillStyle = color;
            ctx.globalAlpha = Math.max(0.1, Math.min(0.85, p.opacity));
            ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.size), Math.round(p.size));
        });

        particleAnimationId = requestAnimationFrame(animate);
    }

    if (particleAnimationId) cancelAnimationFrame(particleAnimationId);
    animate();
}

// Load saved theme and initialize Minecraft styled inputs & particle canvas on boot
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('mc_theme') || 'dark';
    setTheme(savedTheme);
    initMinecraftInputs();
    initBgParticles();
});

// Fullscreen Viewer Toggle
function toggleViewerFullscreen() {
    const container = document.getElementById('viewer-container');
    if (!container) return;

    if (!document.fullscreenElement) {
        if (container.requestFullscreen) container.requestFullscreen();
        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

// Quick Chat Commands
function sendQuickChat(commandText) {
    if (window.socket) {
        window.socket.emit('sendChat', commandText);
        appendChatMessage(`[MACRO] ${commandText}`, 'system');
    }
}

// Filter Tab List Players
function filterTabPlayers() {
    const input = document.getElementById('tab-search-input');
    if (!input || !window.latestPlayers) return;

    const query = input.value.toLowerCase().trim();
    const filtered = window.latestPlayers.filter(p => p.username.toLowerCase().includes(query));
    renderPlayerGrid(filtered);
}

function renderPlayerGrid(players) {
    const container = document.getElementById('player-grid');
    if (!container) return;

    let html = '';
    players.forEach(p => {
        let color = '#55ff55';
        if (p.ping > 150) color = '#ffff55';
        if (p.ping > 300) color = '#ff5555';
        html += `<div class="player-card">
            <img src="https://minotar.net/avatar/${p.username}/20" alt="${p.username}">
            <span class="player-name">${p.username}</span>
            <span style="color:${color}; font-size:10px">${p.ping}ms</span>
        </div>`;
    });
    container.innerHTML = html;
}

/* ==========================================================================
   MINECRAFT AUTHENTIC PIXEL SVG SPRITES (HEARTS & FOOD)
   ========================================================================== */

// Authentic Minecraft Pixel Art Heart SVGs (9x9 grid)
function getHeartSvg(type) {
    if (type === 'full') {
        return `<svg class="mc-heart-svg" viewBox="0 0 9 9" width="18" height="18">
            <path fill="#000000" d="M1 0h2v1H1zM6 0h2v1H6zM0 1h1v4H0zM8 1h1v4H8zM1 5h1v1H1zM7 5h1v1H7zM2 6h1v1H2zM6 6h1v1H6zM3 7h1v1H3zM5 7h1v1H5zM4 8h1v1H4z"/>
            <path fill="#e21818" d="M1 1h2v4H1zM6 1h2v4H6zM3 1h3v6H3zM2 5h5v1H2zM3 6h3v1H3z"/>
            <path fill="#ff6b6b" d="M1 1h1v2H1zM6 1h1v1H6z"/>
            <path fill="#ffffff" d="M1 1h1v1H1z"/>
            <path fill="#930b0b" d="M2 4h1v1H2zM6 4h1v1H6zM3 6h1v1H3zM5 6h1v1H5zM4 7h1v1H4z"/>
        </svg>`;
    } else if (type === 'half') {
        return `<svg class="mc-heart-svg" viewBox="0 0 9 9" width="18" height="18">
            <path fill="#000000" d="M1 0h2v1H1zM6 0h2v1H6zM0 1h1v4H0zM8 1h1v4H8zM1 5h1v1H1zM7 5h1v1H7zM2 6h1v1H2zM6 6h1v1H6zM3 7h1v1H3zM5 7h1v1H5zM4 8h1v1H4z"/>
            <!-- Empty Right Half Container -->
            <path fill="#3b0808" d="M4 1h2v1H4zM5 1h3v4H5zM4 5h3v1H4zM4 6h2v1H4zM4 7h1v1H4z"/>
            <!-- Full Left Half -->
            <path fill="#e21818" d="M1 1h2v4H1zM3 1h1v6H3zM2 5h2v1H2zM3 6h1v1H3z"/>
            <path fill="#ff6b6b" d="M1 1h1v2H1z"/>
            <path fill="#ffffff" d="M1 1h1v1H1z"/>
            <path fill="#930b0b" d="M2 4h1v1H2zM3 6h1v1H3z"/>
        </svg>`;
    } else {
        // empty container
        return `<svg class="mc-heart-svg" viewBox="0 0 9 9" width="18" height="18">
            <path fill="#000000" d="M1 0h2v1H1zM6 0h2v1H6zM0 1h1v4H0zM8 1h1v4H8zM1 5h1v1H1zM7 5h1v1H7zM2 6h1v1H2zM6 6h1v1H6zM3 7h1v1H3zM5 7h1v1H5zM4 8h1v1H4z"/>
            <path fill="#3b0808" d="M1 1h7v4H1zM2 5h5v1H2zM3 6h3v1H3zM4 7h1v1H4z"/>
            <path fill="#1a0404" d="M2 2h5v2H2zM3 4h3v1H3z"/>
        </svg>`;
    }
}

// Authentic Minecraft Pixel Art Food Drumstick SVGs (9x9 grid)
function getFoodSvg(type) {
    if (type === 'full') {
        return `<svg class="mc-food-svg" viewBox="0 0 9 9" width="18" height="18">
            <path fill="#000000" d="M4 0h3v1H4zM3 1h1v1H3zM7 1h1v2H7zM2 2h1v2H2zM1 4h1v2H1zM0 5h1v2H0zM1 7h2v1H1zM3 6h2v1H3zM5 5h1v1H5zM6 4h1v1H6zM7 3h1v1H7z"/>
            <!-- Roasted Meat Fill -->
            <path fill="#d9822b" d="M4 1h3v1H4zM3 2h4v2H3zM2 4h4v1H2zM3 5h2v1H3z"/>
            <path fill="#f7b76d" d="M4 1h2v1H4zM3 2h2v1H3z"/>
            <path fill="#85440c" d="M3 4h3v1H3zM4 5h1v1H4z"/>
            <!-- Bone End -->
            <path fill="#e2d9c5" d="M1 5h1v2H1zM2 7h1v1H2z"/>
            <path fill="#ffffff" d="M1 5h1v1H1z"/>
        </svg>`;
    } else if (type === 'half') {
        return `<svg class="mc-food-svg" viewBox="0 0 9 9" width="18" height="18">
            <path fill="#000000" d="M4 0h3v1H4zM3 1h1v1H3zM7 1h1v2H7zM2 2h1v2H2zM1 4h1v2H1zM0 5h1v2H0zM1 7h2v1H1zM3 6h2v1H3zM5 5h1v1H5zM6 4h1v1H6zM7 3h1v1H7z"/>
            <!-- Empty Container Right Side -->
            <path fill="#38200b" d="M5 1h2v1H5zM5 2h2v2H5zM5 4h1v1H5z"/>
            <!-- Filled Meat Left Side -->
            <path fill="#d9822b" d="M4 1h1v1H4zM3 2h2v2H3zM2 4h3v1H2zM3 5h2v1H3z"/>
            <path fill="#f7b76d" d="M4 1h1v1H4zM3 2h1v1H3z"/>
            <!-- Bone -->
            <path fill="#e2d9c5" d="M1 5h1v2H1zM2 7h1v1H2z"/>
            <path fill="#ffffff" d="M1 5h1v1H1z"/>
        </svg>`;
    } else {
        // empty container
        return `<svg class="mc-food-svg" viewBox="0 0 9 9" width="18" height="18">
            <path fill="#000000" d="M4 0h3v1H4zM3 1h1v1H3zM7 1h1v2H7zM2 2h1v2H2zM1 4h1v2H1zM0 5h1v2H0zM1 7h2v1H1zM3 6h2v1H3zM5 5h1v1H5zM6 4h1v1H6zM7 3h1v1H7z"/>
            <path fill="#38200b" d="M4 1h3v1H4zM3 2h4v2H3zM2 4h4v1H2zM3 5h2v1H3zM1 5h1v2H1zM2 7h1v1H2z"/>
            <path fill="#1c0f05" d="M4 2h2v1H4zM3 3h3v1H3z"/>
        </svg>`;
    }
}

// Render Minecraft Hearts (0 to 20 health)
function renderHearts(health) {
    const container = document.getElementById('hp-container');
    if (!container) return;

    const hp = Math.max(0, Math.min(20, Math.round(health)));
    const fullHearts = Math.floor(hp / 2);
    const halfHeart = hp % 2 === 1;
    const emptyHearts = 10 - fullHearts - (halfHeart ? 1 : 0);

    let html = '';
    for (let i = 0; i < fullHearts; i++) {
        html += `<span class="mc-heart-item full">${getHeartSvg('full')}</span>`;
    }
    if (halfHeart) {
        html += `<span class="mc-heart-item half">${getHeartSvg('half')}</span>`;
    }
    for (let i = 0; i < emptyHearts; i++) {
        html += `<span class="mc-heart-item empty">${getHeartSvg('empty')}</span>`;
    }
    container.innerHTML = html;

    if (hp <= 6 && hp > 0) {
        container.classList.add('hp-low-pulse');
    } else {
        container.classList.remove('hp-low-pulse');
    }

    const valEl = document.getElementById('hp-val');
    if (valEl) valEl.innerText = hp;
}

// Render Minecraft Food (0 to 20 food)
function renderFood(food) {
    const container = document.getElementById('food-container');
    if (!container) return;

    const f = Math.max(0, Math.min(20, Math.round(food)));
    const fullFood = Math.floor(f / 2);
    const halfFood = f % 2 === 1;
    const emptyFood = 10 - fullFood - (halfFood ? 1 : 0);

    let html = '';
    for (let i = 0; i < fullFood; i++) {
        html += `<span class="mc-food-item full">${getFoodSvg('full')}</span>`;
    }
    if (halfFood) {
        html += `<span class="mc-food-item half">${getFoodSvg('half')}</span>`;
    }
    for (let i = 0; i < emptyFood; i++) {
        html += `<span class="mc-food-item empty">${getFoodSvg('empty')}</span>`;
    }
    container.innerHTML = html;

    const valEl = document.getElementById('food-val');
    if (valEl) valEl.innerText = f;
}

// Render XP Bar
function renderXp(level, progress) {
    const bar = document.getElementById('xp-fill');
    const levelEl = document.getElementById('xp-level');
    const pct = Math.max(0, Math.min(100, Math.round((progress || 0) * 100)));
    if (bar) bar.style.width = pct + '%';
    if (levelEl) levelEl.innerText = level || 0;
}

/* ==========================================================================
   SETTINGS MODAL OVERLAY (NO PAGE RELOAD)
   ========================================================================== */

let isSettingsOpen = false;

function toggleSettingsModal() {
    isSettingsOpen = !isSettingsOpen;
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    if (isSettingsOpen) {
        modal.style.display = 'flex';
        loadModalConfig();
        setTimeout(initMinecraftInputs, 0);
    } else {
        modal.style.display = 'none';
    }
}

async function loadModalConfig() {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();

        // Populate values in modal
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val !== undefined && val !== null ? val : '';
        };
        const setChk = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!val;
        };

        setVal('modal-mc-host', config.minecraft.host);
        setVal('modal-mc-port', config.minecraft.port || 25565);
        setVal('modal-mc-username', config.minecraft.username);
        setVal('modal-mc-auth', config.minecraft.auth || 'microsoft');
        setVal('modal-mc-version', config.minecraft.version || '1.21.4');
        setChk('modal-mc-autoreconnect', config.minecraft.autoReconnect);

        setChk('modal-bs-attacking', config.botState.isAttacking);
        setChk('modal-bs-antiafk', config.botState.isAntiAfk);
        setChk('modal-bs-looker', config.botState.isLooker);
        setChk('modal-bs-antispam', config.botState.isAntiSpam);
        setChk('modal-bs-totem', config.botState.autoTotem);

        setVal('modal-v-port', config.server.viewerPort || 3007);
        setVal('modal-v-distance', config.viewer.viewDistance || 6);
        setChk('modal-v-firstperson', config.viewer.firstPerson);

        if (config.chestSorting) {
            setVal('modal-cs-radius', config.chestSorting.searchRadius || 16);
            setVal('modal-cs-timeout', config.chestSorting.timeoutMs || 8000);
        }

        setChk('modal-tg-enabled', config.telegram.enabled);
        setVal('modal-tg-token', config.telegram.token);
        setVal('modal-tg-chatid', config.telegram.chatId);
        setChk('modal-tg-fwd-mctg', config.telegram.forwardMcToTg);
        setChk('modal-tg-fwd-tgmc', config.telegram.forwardTgToMc);

        const statusEl = document.getElementById('modal-save-status');
        if (statusEl) statusEl.innerText = '';
    } catch (e) {
        console.error('Error loading config for modal:', e);
    }
}

async function saveModalConfig(e) {
    if (e) e.preventDefault();

    const statusEl = document.getElementById('modal-save-status');
    if (statusEl) {
        statusEl.style.color = '#ffff55';
        statusEl.innerText = 'Сохранение...';
    }

    const payload = {
        minecraft: {
            host: document.getElementById('modal-mc-host').value,
            port: parseInt(document.getElementById('modal-mc-port').value) || 25565,
            username: document.getElementById('modal-mc-username').value,
            auth: document.getElementById('modal-mc-auth').value,
            version: document.getElementById('modal-mc-version').value,
            autoReconnect: document.getElementById('modal-mc-autoreconnect').checked
        },
        botState: {
            isAttacking: document.getElementById('modal-bs-attacking').checked,
            isAntiAfk: document.getElementById('modal-bs-antiafk').checked,
            isLooker: document.getElementById('modal-bs-looker').checked,
            isAntiSpam: document.getElementById('modal-bs-antispam').checked,
            autoTotem: document.getElementById('modal-bs-totem').checked
        },
        server: {
            viewerPort: parseInt(document.getElementById('modal-v-port').value) || 3007
        },
        viewer: {
            viewDistance: parseInt(document.getElementById('modal-v-distance').value) || 6,
            firstPerson: document.getElementById('modal-v-firstperson').checked
        },
        chestSorting: {
            searchRadius: parseInt(document.getElementById('modal-cs-radius').value) || 16,
            timeoutMs: parseInt(document.getElementById('modal-cs-timeout').value) || 8000
        },
        telegram: {
            enabled: document.getElementById('modal-tg-enabled').checked,
            token: document.getElementById('modal-tg-token').value,
            chatId: document.getElementById('modal-tg-chatid').value,
            forwardMcToTg: document.getElementById('modal-tg-fwd-mctg').checked,
            forwardTgToMc: document.getElementById('modal-tg-fwd-tgmc').checked
        }
    };

    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success && statusEl) {
            statusEl.style.color = '#55ff55';
            statusEl.innerText = '✅ Настройки успешно сохранены!';
            setTimeout(() => {
                if (statusEl.innerText.includes('успешно')) {
                    statusEl.innerText = '';
                }
            }, 3000);
        } else if (statusEl) {
            statusEl.style.color = '#ff5555';
            statusEl.innerText = '❌ Ошибка сохранения.';
        }
    } catch (err) {
        if (statusEl) {
            statusEl.style.color = '#ff5555';
            statusEl.innerText = '❌ Ошибка сети: ' + err.message;
        }
    }
}

// Setup Resizable Sidebars
function setupResizing() {
    const sidebar = document.getElementById('sidebar');
    const gutterCol = document.getElementById('gutter-col');
    const viewer = document.getElementById('viewer-container');
    const gutterRow = document.getElementById('gutter-row');
    const mainContent = document.getElementById('main-content');
    const overlay = document.getElementById('resize-overlay');

    if (!sidebar || !gutterCol || !viewer || !gutterRow || !mainContent || !overlay) return;

    let isResizingCol = false;
    let isResizingRow = false;

    gutterCol.addEventListener('mousedown', (e) => {
        isResizingCol = true;
        document.body.style.cursor = 'col-resize';
        gutterCol.classList.add('active');
        overlay.style.display = 'block';
        e.preventDefault();
    });

    gutterRow.addEventListener('mousedown', (e) => {
        isResizingRow = true;
        document.body.style.cursor = 'ns-resize';
        gutterRow.classList.add('active');
        overlay.style.display = 'block';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizingCol && !isResizingRow) return;

        if (isResizingCol) {
            let newWidth = e.clientX;
            if (newWidth < 220) newWidth = 220;
            if (newWidth > 800) newWidth = 800;
            sidebar.style.width = newWidth + 'px';
        }

        if (isResizingRow) {
            const bounds = mainContent.getBoundingClientRect();
            let newHeight = e.clientY - bounds.top;
            if (newHeight < 150) newHeight = 150;
            if (newHeight > bounds.height - 150) newHeight = bounds.height - 150;
            viewer.style.height = (newHeight / bounds.height * 100) + '%';
        }
    });

    document.addEventListener('mouseup', () => {
        isResizingCol = false;
        isResizingRow = false;
        document.body.style.cursor = 'default';
        gutterCol.classList.remove('active');
        gutterRow.classList.remove('active');
        overlay.style.display = 'none';
    });
}

/* ==========================================================================
   MINECRAFT CUSTOM INPUT STEPPER INITIALIZER
   ========================================================================== */

function initMinecraftInputs() {
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        if (input.closest('.mc-number-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'mc-number-wrapper';

        // Preserve input inline styles like width/flex
        if (input.style.width) {
            wrapper.style.width = input.style.width;
            input.style.width = '100%';
        }
        if (input.style.flexGrow) {
            wrapper.style.flexGrow = input.style.flexGrow;
            input.style.flexGrow = '1';
        }

        const parent = input.parentNode;
        if (!parent) return;

        parent.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const controls = document.createElement('div');
        controls.className = 'mc-number-controls';

        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'mc-number-btn mc-number-up';
        upBtn.setAttribute('tabindex', '-1');
        upBtn.title = 'Увеличить';
        upBtn.innerHTML = '▲';

        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.className = 'mc-number-btn mc-number-down';
        downBtn.setAttribute('tabindex', '-1');
        downBtn.title = 'Уменьшить';
        downBtn.innerHTML = '▼';

        controls.appendChild(upBtn);
        controls.appendChild(downBtn);
        wrapper.appendChild(controls);

        const step = (dir) => {
            if (input.disabled || input.readOnly) return;
            const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
            const max = input.max !== '' ? parseFloat(input.max) : Infinity;
            const stepVal = parseFloat(input.step) || 1;
            let val = parseFloat(input.value);

            if (isNaN(val)) val = 0;
            if (dir === 'up') val += stepVal;
            else if (dir === 'down') val -= stepVal;

            if (val > max) val = max;
            if (val < min) val = min;

            input.value = val;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const attachHoldEvent = (btn, dir) => {
            let timer = null;
            let interval = null;

            const start = (e) => {
                e.preventDefault();
                step(dir);
                timer = setTimeout(() => {
                    interval = setInterval(() => step(dir), 60);
                }, 300);
            };

            const stop = () => {
                if (timer) clearTimeout(timer);
                if (interval) clearInterval(interval);
            };

            btn.addEventListener('mousedown', start);
            btn.addEventListener('touchstart', start, { passive: false });
            window.addEventListener('mouseup', stop);
            window.addEventListener('touchend', stop);
            btn.addEventListener('mouseleave', stop);
        };

        attachHoldEvent(upBtn, 'up');
        attachHoldEvent(downBtn, 'down');
    });
}


