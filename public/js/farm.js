function initFarmUI(socket) {
    if (!socket) return;

    const btnStartPatrol = document.getElementById('btn-start-patrol');
    const btnStopPatrol = document.getElementById('btn-stop-patrol');
    const patrolModeSelect = document.getElementById('patrol-mode');
    const patrolDelayInput = document.getElementById('patrol-delay');
    const btnDepositChest = document.getElementById('btn-deposit-chest');

    if (btnStartPatrol) {
        btnStartPatrol.onclick = () => {
            const mode = patrolModeSelect ? patrolModeSelect.value : 'loop';
            const delay = patrolDelayInput ? parseInt(patrolDelayInput.value) || 3 : 3;
            socket.emit('startPatrol', { mode, delay });
        };
    }

    if (btnStopPatrol) {
        btnStopPatrol.onclick = () => {
            socket.emit('stopPatrol');
        };
    }

    if (btnDepositChest) {
        btnDepositChest.onclick = () => {
            socket.emit('depositChest');
        };
    }

    const btnStartSort = document.getElementById('btn-start-sort');
    const btnStopSort = document.getElementById('btn-stop-sort');

    if (btnStartSort) {
        btnStartSort.onclick = () => {
            socket.emit('startChestSort');
        };
    }

    if (btnStopSort) {
        btnStopSort.onclick = () => {
            socket.emit('stopChestSort');
        };
    }
}
