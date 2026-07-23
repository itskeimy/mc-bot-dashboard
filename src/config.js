const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const defaultConfigPath = path.join(__dirname, '..', 'config', 'default.json');
const userConfigPath = path.join(__dirname, '..', 'config', 'config.json');

let config = {};

function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && !Array.isArray(source[key])) {
            if (!target[key]) Object.assign(target, { [key]: {} });
            deepMerge(target[key], source[key]);
        } else {
            Object.assign(target, { [key]: source[key] });
        }
    }
    return target;
}

function loadConfig() {
    try {
        const defaultRaw = fs.readFileSync(defaultConfigPath, 'utf8');
        const defaultConfig = JSON.parse(defaultRaw);

        if (fs.existsSync(userConfigPath)) {
            const userRaw = fs.readFileSync(userConfigPath, 'utf8');
            const userConfig = JSON.parse(userRaw);
            config = deepMerge(defaultConfig, userConfig);
        } else {
            config = defaultConfig;
            saveConfig();
        }
        return config;
    } catch (err) {
        log(`Ошибка загрузки конфигурации: ${err.message}`, 'error');
        return config;
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(userConfigPath, JSON.stringify(config, null, 2), 'utf8');
        log('Конфигурация успешно сохранена.', 'success');
        return true;
    } catch (err) {
        log(`Ошибка сохранения конфигурации: ${err.message}`, 'error');
        return false;
    }
}

function getConfig() {
    if (Object.keys(config).length === 0) {
        return loadConfig();
    }
    return config;
}

function updateConfig(newPartialConfig) {
    deepMerge(config, newPartialConfig);
    saveConfig();
    return config;
}

module.exports = { loadConfig, saveConfig, getConfig, updateConfig };
