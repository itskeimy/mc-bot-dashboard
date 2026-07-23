const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    red: "\x1b[31m",
    gray: "\x1b[90m"
};

function log(msg, type = 'info') {
    const time = new Date().toLocaleTimeString();
    let color = colors.reset;
    let prefix = "[INFO]";

    switch (type) {
        case 'success': color = colors.green; prefix = "[SUCCESS]"; break;
        case 'warn': color = colors.yellow; prefix = "[WARN]"; break;
        case 'error': color = colors.red; prefix = "[ERROR]"; break;
        case 'bot': color = colors.cyan; prefix = "[BOT]"; break;
        case 'viewer': color = colors.magenta; prefix = "[VIEWER]"; break;
        case 'tg': color = colors.blue; prefix = "[TELEGRAM]"; break;
    }

    console.log(`${colors.gray}${time}${colors.reset} ${colors.bright}${color}${prefix}${colors.reset} ${msg}`);
}

module.exports = { log, colors };
