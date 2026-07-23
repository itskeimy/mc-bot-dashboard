let controlModeActive = false;

function initControls(socket) {
    if (!socket) return;

    // кнопки движения (сенсор и мышь)
    const setupDirButton = (elementId, controlName) => {
        const btn = document.getElementById(elementId);
        if (!btn) return;

        const startMove = (e) => {
            e.preventDefault();
            btn.classList.add('active');
            socket.emit('move', { control: controlName, state: true });
        };

        const stopMove = (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            socket.emit('move', { control: controlName, state: false });
        };

        btn.addEventListener('mousedown', startMove);
        btn.addEventListener('mouseup', stopMove);
        btn.addEventListener('mouseleave', stopMove);

        btn.addEventListener('touchstart', startMove, { passive: false });
        btn.addEventListener('touchend', stopMove, { passive: false });
    };

    setupDirButton('btn-w', 'forward');
    setupDirButton('btn-a', 'left');
    setupDirButton('btn-s', 'back');
    setupDirButton('btn-d', 'right');

    // кнопки действий
    const bindAction = (btnId, actionName) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.onclick = () => {
                socket.emit('action', actionName);
            };
        }
    };

    bindAction('btn-action-jump', 'jump');
    bindAction('btn-action-attack', 'attack');
    bindAction('btn-action-use', 'use');

    // кнопка режима управления
    const toggleBtn = document.getElementById('btn-toggle-controls');
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            controlModeActive = !controlModeActive;
            toggleBtn.innerText = `🎮 Control Mode: ${controlModeActive ? 'ON' : 'OFF'}`;
            toggleBtn.classList.toggle('active', controlModeActive);
            const overlayControls = document.getElementById('wasd-controls');
            if (overlayControls) {
                overlayControls.classList.toggle('control-mode-active', controlModeActive);
            }
        };
    }

    // ходьба по клику в 3d вьювере и захват мыши в freecam
    const viewerContainer = document.getElementById('viewer-container');
    if (viewerContainer) {
        viewerContainer.addEventListener('dblclick', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            socket.emit('walkToLookTarget');
        });
        viewerContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            if (typeof currentViewMode !== 'undefined' && currentViewMode === 'free') {
                const frame = document.getElementById('viewer-frame');
                if (frame && frame.contentWindow) {
                    frame.contentWindow.postMessage({ type: 'requestPointerLock' }, '*');
                }
            }
        });
    }

    window.triggerPointWalk = () => {
        socket.emit('walkToLookTarget');
    };

    // слушатели клавиатуры
    const keyMap = {
        'KeyW': 'forward',
        'KeyS': 'back',
        'KeyA': 'left',
        'KeyD': 'right',
        'Space': 'jump',
        'ShiftLeft': 'sneak',
        'ShiftRight': 'sneak',
        'ControlLeft': 'sprint'
    };

    const pressedKeys = new Set();

    document.addEventListener('keydown', (e) => {
        // игнорирование при вводе в текстовые поля
        if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            return;
        }

        if (window.currentViewMode === 'free') {
            const frame = document.getElementById('viewer-frame');
            if (frame && frame.contentWindow) {
                frame.contentWindow.postMessage({ type: 'keydown', code: e.code, key: e.key, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey }, '*');
            }
        }

        if (e.code === 'Escape' || e.key === 'Escape') {
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        }

        if (!controlModeActive) return;

        if (keyMap[e.code] && !pressedKeys.has(e.code)) {
            pressedKeys.add(e.code);
            socket.emit('move', { control: keyMap[e.code], state: true });
            const btnEl = document.getElementById(`btn-${keyMap[e.code][0]}`);
            if (btnEl) btnEl.classList.add('active');
        }

        if (e.code.startsWith('Digit') && e.code.length === 6) {
            const digit = parseInt(e.code.charAt(5));
            if (digit >= 1 && digit <= 9) {
                socket.emit('selectSlot', digit - 1);
            }
        }

        if (e.code === 'KeyQ') {
            socket.emit('action', 'drop');
        }
    });

    document.addEventListener('keyup', (e) => {
        if (window.currentViewMode === 'free') {
            const frame = document.getElementById('viewer-frame');
            if (frame && frame.contentWindow) {
                frame.contentWindow.postMessage({ type: 'keyup', code: e.code, key: e.key }, '*');
            }
        }

        if (keyMap[e.code]) {
            pressedKeys.delete(e.code);
            socket.emit('move', { control: keyMap[e.code], state: false });
            const btnEl = document.getElementById(`btn-${keyMap[e.code][0]}`);
            if (btnEl) btnEl.classList.remove('active');
        }
    });
}
