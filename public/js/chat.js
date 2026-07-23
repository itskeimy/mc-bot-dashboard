// Minecraft color code parser (§0-9, §a-f, §k-r)
function parseMcColors(text) {
    if (!text) return '';

    const colorMap = {
        '0': '#777777', // Brightened from #000000 for dark mode readability
        '1': '#3355FF', '2': '#22FF22', '3': '#00AAAA',
        '4': '#FF3333', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
        '8': '#888888', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
        'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
    };

    let parts = text.split(/§([0-9a-fA-FK-Rk-r])/g);
    let html = '';
    let currentColor = '#FFFFFF';
    let isBold = false;
    let isItalic = false;

    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
            let code = parts[i].toLowerCase();
            if (colorMap[code]) {
                currentColor = colorMap[code];
                isBold = false;
                isItalic = false;
            } else if (code === 'l') {
                isBold = true;
            } else if (code === 'o') {
                isItalic = true;
            } else if (code === 'r') {
                currentColor = '#FFFFFF';
                isBold = false;
                isItalic = false;
            }
        } else if (parts[i]) {
            let style = `color:${currentColor};text-shadow: 1px 1px 0 #000;`;
            if (isBold) style += 'font-weight:bold;';
            if (isItalic) style += 'font-style:italic;';
            const escaped = parts[i].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            html += `<span style="${style}">${escaped}</span>`;
        }
    }
    return html;
}

function appendChatMessage(msg, type = 'chat') {
    const box = document.getElementById('chat-box');
    if (!box) return;

    const div = document.createElement('div');
    div.className = 'chat-message';

    const timeStr = new Date().toLocaleTimeString();

    if (type === 'system') {
        div.innerHTML = `<span class="chat-time">[${timeStr}]</span> <span class="chat-sys">[SYSTEM] ${msg}</span>`;
    } else {
        // Check for player name in <Player>
        const playerMatch = msg.match(/^<(.+?)>\s*(.+)$/);
        if (playerMatch) {
            const player = playerMatch[1];
            const content = playerMatch[2];
            const parsed = parseMcColors(content);
            div.innerHTML = `<span class="chat-time">[${timeStr}]</span> <img class="chat-avatar" src="https://minotar.net/avatar/${player}/16" alt="${player}"> <b style="color:#55ffff">&lt;${player}&gt;</b> ${parsed}`;
        } else {
            div.innerHTML = `<span class="chat-time">[${timeStr}]</span> ${parseMcColors(msg)}`;
        }
    }

    box.appendChild(div);

    while (box.children.length > 200) {
        box.removeChild(box.firstChild);
    }
    box.scrollTop = box.scrollHeight;
}
