const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    setupResizing();
    initControls(socket);
    initWaypointsUI(socket);
    initFarmUI(socket);

    if (window.MinecraftSkinViewer3D && document.getElementById('player-skin-avatar-3d')) {
        window.skinViewer3D = new window.MinecraftSkinViewer3D('player-skin-avatar-3d');
        window.skinViewer3D.init();
    }

    const frame = document.getElementById('viewer-frame');
    if (frame) {
        frame.addEventListener('load', () => {
            sendViewModeToIframe(currentViewMode);
        });
    }

    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.onsubmit = (e) => {
            e.preventDefault();
            const input = document.getElementById('msg-input');
            if (input && input.value.trim()) {
                socket.emit('sendChat', input.value.trim());
                input.value = '';
            }
        };
    }
});

socket.on('playSound', (type) => {
    if (window.sounds) {
        if (type === 'xp') window.sounds.playXp();
        else if (type === 'hurt') window.sounds.playHurt();
        else if (type === 'chest') window.sounds.playChest();
        else if (type === 'danger' || type === 'warning') window.sounds.playDanger();
        else if (type === 'pop') window.sounds.playPop();
        else window.sounds.playClick();
    }
});

// обработчик данных карты мира
socket.on('worldMap', (data) => {
    try {
        if (window.renderWorldMap) {
            window.renderWorldMap(data);
        }
    } catch (e) {
        console.error('[worldMap] render error:', e);
    }
});

socket.on('reloadViewer', () => {
    const frame = document.getElementById('viewer-frame');
    if (frame) {
        frame.src = frame.src;
    }
});

// события сокетов
socket.on('stateUpdate', (botState) => {
    for (let key in botState) {
        const el = document.getElementById('s-' + key);
        if (el) {
            el.innerText = botState[key] ? 'ON' : 'OFF';
            el.className = botState[key] ? 'state-on' : 'state-off';
        }
    }
});


socket.on('chat', (msg) => {
    appendChatMessage(msg, 'chat');
});

socket.on('log', (msg) => {
    appendChatMessage(msg, 'system');
});

let freecamPos = null;
let freecamYaw = 0;

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'cameraUpdate') {
        freecamPos = event.data.pos;
        freecamYaw = event.data.yaw;
    }
});

// === RADAR DATA (fires every 1 second) ===
socket.on('radar', (data) => {
    if (window.renderRadar) {
        try {
            if (currentViewMode === 'free' && freecamPos) {
                const freecamEntities = data.entities.map(e => {
                    if (e.x !== undefined && e.z !== undefined) {
                        return {
                            ...e,
                            dx: Math.round(e.x - freecamPos.x),
                            dz: Math.round(e.z - freecamPos.z)
                        };
                    }
                    return e;
                });
                window.renderRadar(freecamYaw, freecamEntities);
            } else {
                window.renderRadar(data.botYaw, data.entities);
            }
        } catch (e) {
            console.error('[radar] render error:', e);
        }
    }
});

// обновление статуса и координат бота
socket.on('status', (data) => {
    try {
        renderHearts(data.health);
        renderFood(data.food);
        renderXp(data.level, data.progress);

        if (data.username && window.lastAvatarUsername !== data.username) {
            window.lastAvatarUsername = data.username;
            if (window.skinViewer3D) {
                window.skinViewer3D.loadSkin(data.username);
            }
            sendBotUsernameToIframe(data.username);
        }
    } catch (e) {
        console.error('[status] render error:', e);
    }

    // ALWAYS update coordinates — this is the primary and only place
    const coordsX = document.getElementById('coords-x');
    const coordsY = document.getElementById('coords-y');
    const coordsZ = document.getElementById('coords-z');

    let displayPos = data.pos;
    if (window.mapState && window.mapState.botPos) {
        displayPos = window.mapState.botPos;
    }
    if (currentViewMode === 'free' && freecamPos) {
        displayPos = freecamPos;
    }

    if (displayPos && typeof displayPos.x === 'number') {
        if (coordsX) coordsX.innerText = Math.round(displayPos.x);
        if (coordsY) coordsY.innerText = Math.round(displayPos.y);
        if (coordsZ) coordsZ.innerText = Math.round(displayPos.z);
    }

    if (data.stats) {
        const todEl = document.getElementById('stat-tod');
        const dimEl = document.getElementById('stat-dim');
        const bioEl = document.getElementById('stat-bio');
        const distEl = document.getElementById('stat-dist');
        const killsEl = document.getElementById('stat-kills');

        if (todEl) todEl.innerText = data.stats.timeOfDay || 'Day';
        if (dimEl) dimEl.innerText = data.stats.dimension || 'Overworld';
        if (bioEl) bioEl.innerText = data.stats.biome || 'Plains';
        if (distEl) distEl.innerText = (data.stats.distanceWalked || 0) + 'm';
        if (killsEl) killsEl.innerText = data.stats.mobsKilled || 0;
    }

    if (data.botState) {
        for (let key in data.botState) {
            const el = document.getElementById('s-' + key);
            if (el) {
                el.innerText = data.botState[key] ? 'ON' : 'OFF';
                el.className = data.botState[key] ? 'state-on' : 'state-off';
            }
        }
    }
});

socket.on('inventory', (data) => {
    if (Array.isArray(data)) {
        renderInventoryGrid(data, window.currentActiveSlot);
    } else if (data && data.slots) {
        window.currentActiveSlot = data.activeSlot;
        renderInventoryGrid(data.slots, data.activeSlot);
    }
});

let isTabOpen = false;

function toggleTabList() {
    isTabOpen = !isTabOpen;
    const tabModal = document.getElementById('tab-modal');
    if (tabModal) tabModal.style.display = isTabOpen ? 'flex' : 'none';
}

socket.on('playerList', (players) => {
    window.latestPlayers = players;
    const countEl = document.getElementById('player-count');
    if (countEl) countEl.innerText = players.length;

    if (!isTabOpen) return;
    const searchInput = document.getElementById('tab-search-input');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = query ? players.filter(p => p.username.toLowerCase().includes(query)) : players;
    renderPlayerGrid(filtered);
});

function toggle(key) {
    socket.emit('toggleState', key);
}

function sendViewModeToIframe(mode) {
    const frame = document.getElementById('viewer-frame');
    if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'viewMode', mode: mode }, '*');
    }
}

function sendBotUsernameToIframe(username) {
    const frame = document.getElementById('viewer-frame');
    if (frame && frame.contentWindow && username) {
        frame.contentWindow.postMessage({ type: 'botUsername', username: username }, '*');
    }
}

socket.on('viewMode', (mode) => {
    currentViewMode = mode;
    sendViewModeToIframe(mode);
    const btn1 = document.getElementById('btn-1st');
    const btn3 = document.getElementById('btn-3rd');
    const btnFree = document.getElementById('btn-free');
    if (btn1) btn1.classList.toggle('active', mode === '1st');
    if (btn3) btn3.classList.toggle('active', mode === '3rd');
    if (btnFree) btnFree.classList.toggle('active', mode === 'free');
});

function changeView(type) {
    currentViewMode = type;
    sendViewModeToIframe(type);
    socket.emit('changeView', type);

    const btn1 = document.getElementById('btn-1st');
    const btn3 = document.getElementById('btn-3rd');
    const btnFree = document.getElementById('btn-free');
    if (btn1) btn1.classList.toggle('active', type === '1st');
    if (btn3) btn3.classList.toggle('active', type === '3rd');
    if (btnFree) btnFree.classList.toggle('active', type === 'free');
}
