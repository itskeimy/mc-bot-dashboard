function renderWaypoints(waypoints, socket) {
    const listContainer = document.getElementById('waypoints-list');
    if (!listContainer) return;

    if (!waypoints || waypoints.length === 0) {
        listContainer.innerHTML = '<div style="color:#aaa; font-style:italic; font-size:12px;">Точки не сохранены</div>';
        return;
    }

    let html = '';
    waypoints.forEach(wp => {
        html += `
            <div class="wp-card">
                <div class="wp-info">
                    <span class="wp-name">📍 ${wp.name}</span>
                    <span class="wp-coords">X:${wp.x} Y:${wp.y} Z:${wp.z}</span>
                </div>
                <div class="wp-actions">
                    <button class="mc-btn wp-btn-go" onclick="gotoWp('${wp.id}')">🏃 Go</button>
                    <button class="mc-btn wp-btn-del" onclick="delWp('${wp.id}')">❌</button>
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;

    window.currentWaypoints = waypoints;
}

function gotoWp(id) {
    if (!window.currentWaypoints || !window.socket) return;
    const wp = window.currentWaypoints.find(w => w.id === id);
    if (wp) {
        window.socket.emit('gotoWaypoint', wp);
    }
}

function delWp(id) {
    if (!window.socket) return;
    window.socket.emit('removeWaypoint', id);
}

function initWaypointsUI(socket) {
    window.socket = socket;

    const addBtn = document.getElementById('btn-add-wp');
    const inputEl = document.getElementById('wp-name-input');

    if (addBtn && inputEl) {
        addBtn.onclick = () => {
            const name = inputEl.value.trim();
            socket.emit('addWaypoint', name);
            inputEl.value = '';
        };
    }

    const stopBtn = document.getElementById('btn-stop-nav');
    if (stopBtn) {
        stopBtn.onclick = () => {
            socket.emit('stopNavigation');
        };
    }

    socket.on('waypoints', (wps) => {
        renderWaypoints(wps, socket);
    });
}
