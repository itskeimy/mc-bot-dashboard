// === SHARED MAP STATE (central source of truth for all map/radar rendering) ===
window.mapState = {
    botPos: null,       // {x, y, z} - latest bot position from server
    botYaw: 0,          // Latest bot yaw angle
    cache: new Map(),   // "worldX,worldZ" -> {worldX, worldZ, y, name}
    MAX_CACHE_SIZE: 40000
};

let mapModalOpen = false;
let currentWorldMapData = null;

// Map Viewport state (pan in BLOCK UNITS & zoom)
let mapZoom = 1.0;
let mapOffsetX = 0; // block offset from bot X
let mapOffsetY = 0; // block offset from bot Z
let isDraggingMap = false;
let clickStartX = 0;
let clickStartY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetY = 0;
let hoverBlockInfo = null;
let destinationTarget = null;

// Layer Visibility Toggles
const mapLayers = {
    terrain: true,
    shading: true,
    textures: true,
    entities: true,
    waypoints: true,
    grid: false
};

// Rich Minecraft Color Palette
const blockColorMap = {
    // Grass & Foliage
    'grass_block': '#5b8731',
    'short_grass': '#5b8731',
    'tall_grass': '#4c7a2b',
    'fern': '#4c7a2b',
    'large_fern': '#4c7a2b',
    'moss_block': '#597d34',
    'moss_carpet': '#597d34',
    'mycelium': '#6f4b67',
    'podzol': '#593d29',
    
    // Soil & Earth
    'dirt': '#866043',
    'coarse_dirt': '#775235',
    'rooted_dirt': '#65432b',
    'mud': '#3c3938',
    'muddy_mangrove_roots': '#4d3728',
    'farmland': '#593b22',
    'clay': '#9ca4b0',

    // Stone & Underground
    'stone': '#737373',
    'cobblestone': '#5a5a5a',
    'mossy_cobblestone': '#4b5e43',
    'smooth_stone': '#909090',
    'stone_bricks': '#696969',
    'deepslate': '#4d4d4d',
    'cobbled_deepslate': '#383838',
    'polished_deepslate': '#484848',
    'deepslate_bricks': '#333333',
    'bedrock': '#222222',
    'tuff': '#6c6d66',
    'calcite': '#e0e0dc',
    'andesite': '#868686',
    'diorite': '#c8c8c8',
    'granite': '#956755',

    // Sand & Gravel
    'sand': '#dcb36a',
    'red_sand': '#b75a28',
    'sandstone': '#d7b370',
    'red_sandstone': '#b35626',
    'gravel': '#888484',

    // Liquids & Ice
    'water': '#29b6f6',
    'flowing_water': '#0288d1',
    'lava': '#ff5722',
    'flowing_lava': '#e65100',
    'snow': '#f0f5f5',
    'snow_block': '#f0f5f5',
    'powder_snow': '#e6f2f2',
    'ice': '#a0cbef',
    'packed_ice': '#8bb9e8',
    'blue_ice': '#72a6e0',

    // Trees & Wood
    'oak_planks': '#a6824e',
    'spruce_planks': '#684e32',
    'birch_planks': '#d7c186',
    'jungle_planks': '#b07957',
    'acacia_planks': '#ad5d32',
    'dark_oak_planks': '#422a15',
    'mangrove_planks': '#753432',
    'cherry_planks': '#eab6b6',
    'bamboo_planks': '#c0b443',
    'oak_log': '#6b5331',
    'spruce_log': '#3b2816',
    'birch_log': '#d1d1cd',
    'jungle_log': '#564319',
    'acacia_log': '#676157',
    'dark_oak_log': '#332414',
    'cherry_log': '#9b7653',
    'mangrove_log': '#6a2b28',
    'oak_leaves': '#2d6d1b',
    'spruce_leaves': '#2b4d37',
    'birch_leaves': '#5b8239',
    'jungle_leaves': '#1f7e09',
    'acacia_leaves': '#41791a',
    'dark_oak_leaves': '#1b4b0d',
    'cherry_leaves': '#f3a2b7',
    'mangrove_leaves': '#31541e',
    'azalea_leaves': '#51752b',

    // Nether & End
    'netherrack': '#6f2b2b',
    'soul_sand': '#4d3b32',
    'soul_soil': '#44342a',
    'basalt': '#48474d',
    'blackstone': '#2a2730',
    'crimson_nylium': '#832222',
    'warped_nylium': '#2b7067',
    'end_stone': '#dddd9f',
    'purpur_block': '#a97bb0',

    // Functional & Ores
    'coal_ore': '#4a4a4a',
    'iron_ore': '#a89278',
    'copper_ore': '#a86e58',
    'gold_ore': '#f8d55a',
    'redstone_ore': '#ff3333',
    'diamond_ore': '#4deeea',
    'emerald_ore': '#17dd62',
    'chest': '#b87b28',
    'trapped_chest': '#b87b28',
    'ender_chest': '#253e44',
    'barrel': '#7a542b',
    'crafting_table': '#916338',
    'furnace': '#636363',
    'blast_furnace': '#4e4e4e',
    'smoker': '#48443f',
    'anvil': '#404040',
    'glass': '#c2e7f2',
    'tinted_glass': '#2c2533',
    'obsidian': '#19132b',

    // Concrete & Concrete Powder
    'white_concrete': '#e9ecec',
    'orange_concrete': '#f07613',
    'magenta_concrete': '#bd44b3',
    'light_blue_concrete': '#3aafd9',
    'yellow_concrete': '#f8c527',
    'lime_concrete': '#70b919',
    'pink_concrete': '#ed8dac',
    'gray_concrete': '#3e4447',
    'light_gray_concrete': '#8e8e86',
    'cyan_concrete': '#158991',
    'purple_concrete': '#792aac',
    'blue_concrete': '#35399d',
    'brown_concrete': '#724728',
    'green_concrete': '#546d1b',
    'red_concrete': '#a12722',
    'black_concrete': '#141519',
    'white_concrete_powder': '#e9ecec',
    'orange_concrete_powder': '#f07613',
    'magenta_concrete_powder': '#bd44b3',
    'light_blue_concrete_powder': '#3aafd9',
    'yellow_concrete_powder': '#f8c527',
    'lime_concrete_powder': '#70b919',
    'pink_concrete_powder': '#ed8dac',
    'gray_concrete_powder': '#3e4447',
    'light_gray_concrete_powder': '#8e8e86',
    'cyan_concrete_powder': '#158991',
    'purple_concrete_powder': '#792aac',
    'blue_concrete_powder': '#35399d',
    'brown_concrete_powder': '#724728',
    'green_concrete_powder': '#546d1b',
    'red_concrete_powder': '#a12722',
    'black_concrete_powder': '#141519',

    // Wool & Carpet
    'white_wool': '#e9ecec',
    'orange_wool': '#f07613',
    'magenta_wool': '#bd44b3',
    'light_blue_wool': '#3aafd9',
    'yellow_wool': '#f8c527',
    'lime_wool': '#70b919',
    'pink_wool': '#ed8dac',
    'gray_wool': '#3e4447',
    'light_gray_wool': '#8e8e86',
    'cyan_wool': '#158991',
    'purple_wool': '#792aac',
    'blue_wool': '#35399d',
    'brown_wool': '#724728',
    'green_wool': '#546d1b',
    'red_wool': '#a12722',
    'black_wool': '#141519',

    // Terracotta & Stained Clay
    'terracotta': '#985e43',
    'white_terracotta': '#d1b1a1',
    'orange_terracotta': '#a15325',
    'magenta_terracotta': '#95586d',
    'light_blue_terracotta': '#706c8a',
    'yellow_terracotta': '#ba8523',
    'lime_terracotta': '#677535',
    'pink_terracotta': '#a14d4e',
    'gray_terracotta': '#392a24',
    'light_gray_terracotta': '#876b62',
    'cyan_terracotta': '#575c5c',
    'purple_terracotta': '#7a4958',
    'blue_terracotta': '#4a3b5b',
    'brown_terracotta': '#4d3323',
    'green_terracotta': '#4c532a',
    'red_terracotta': '#8e3c2e',
    'black_terracotta': '#251610'
};

const minecraftColorPrefixes = {
    'light_blue': '#3aafd9',
    'light_gray': '#8e8e86',
    'white': '#e9ecec',
    'orange': '#f07613',
    'magenta': '#bd44b3',
    'yellow': '#f8c527',
    'lime': '#70b919',
    'pink': '#ed8dac',
    'gray': '#3e4447',
    'cyan': '#158991',
    'purple': '#792aac',
    'blue': '#35399d',
    'brown': '#724728',
    'green': '#546d1b',
    'red': '#a12722',
    'black': '#141519'
};

function getBlockColor(name) {
    if (!name) return '#222222';
    if (blockColorMap[name]) return blockColorMap[name];

    for (const [colorName, colorHex] of Object.entries(minecraftColorPrefixes)) {
        if (name.startsWith(colorName + '_') || name.includes('_' + colorName + '_') || name.endsWith('_' + colorName)) {
            return colorHex;
        }
    }

    if (name.includes('water')) return '#29b6f6';
    if (name.includes('lava')) return '#ff5722';
    if (name.includes('grass')) return '#5b8731';
    if (name.includes('dirt')) return '#866043';
    if (name.includes('stone') || name.includes('cobble')) return '#737373';
    if (name.includes('sand')) return '#dcb36a';
    if (name.includes('log') || name.includes('wood')) return '#6b5331';
    if (name.includes('plank')) return '#a6824e';
    if (name.includes('leaf') || name.includes('leaves')) return '#2d6d1b';
    if (name.includes('ore')) return '#86866b';
    if (name.includes('glass')) return '#c2e7f2';
    if (name.includes('flower') || name.includes('tulip') || name.includes('rose')) return '#e74c3c';
    if (name.includes('air')) return '#111111';

    return '#555555';
}
window.getBlockColor = getBlockColor;

// Deterministic noise for micro-dithering block textures
function getBlockNoise(x, z) {
    const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return ((n - Math.floor(n)) - 0.5) * 0.12;
}

function applyShading(hexColor, dy, x, z) {
    let hex = hexColor.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    let factor = 1.0;

    // Topographical NW sun relief shading
    if (mapLayers.shading) {
        if (dy > 0) {
            factor = 1.0 + Math.min(0.45, dy * 0.15);
        } else if (dy < 0) {
            factor = Math.max(0.45, 1.0 + dy * 0.11);
        }
    }

    // Micro-dithering texture variation
    if (mapLayers.textures) {
        const noise = getBlockNoise(x, z);
        factor += noise;
    }

    r = Math.min(255, Math.max(0, Math.floor(r * factor)));
    g = Math.min(255, Math.max(0, Math.floor(g * factor)));
    b = Math.min(255, Math.max(0, Math.floor(b * factor)));

    return `rgb(${r},${g},${b})`;
}

// Authentic Minecraft Map Locator Pointer Arrow Renderer
function drawMinecraftMapArrow(ctx, x, y, yaw, size, bodyColor, tipColor) {
    size = size || 12;
    bodyColor = bodyColor || '#ffffff';
    tipColor = tipColor || '#55ff55';

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-yaw);

    const s = size;

    // 1. Black outer shadow/border
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(0, -s - 2);
    ctx.lineTo(s + 2, s + 3);
    ctx.lineTo(0, s - 2);
    ctx.lineTo(-s - 2, s + 3);
    ctx.closePath();
    ctx.fill();

    // 2. Main Arrow Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s, s);
    ctx.lineTo(0, s - 3);
    ctx.lineTo(-s, s);
    ctx.closePath();
    ctx.fill();

    // 3. Pointer Tip Highlight
    ctx.fillStyle = tipColor;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.45, -s * 0.1);
    ctx.lineTo(0, s * 0.1);
    ctx.lineTo(-s * 0.45, -s * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}
window.drawMinecraftMapArrow = drawMinecraftMapArrow;

// === CACHE MANAGEMENT ===
function addToCache(worldX, worldZ, y, name) {
    const cache = window.mapState.cache;
    const key = `${worldX},${worldZ}`;
    cache.set(key, { worldX, worldZ, y, name });

    // Evict oldest entries if cache exceeds max size
    if (cache.size > window.mapState.MAX_CACHE_SIZE) {
        const keysIter = cache.keys();
        const toDelete = cache.size - window.mapState.MAX_CACHE_SIZE + 1000;
        for (let i = 0; i < toDelete; i++) {
            const oldKey = keysIter.next().value;
            if (oldKey) cache.delete(oldKey);
        }
    }
}
window.addToCache = addToCache;

function initWorldMap() {
    const canvas = document.getElementById('world-map-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Pan & Zoom controls
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.2 : 0.8;
        mapZoom = Math.max(0.3, Math.min(8.0, mapZoom * zoomFactor));

        if (currentWorldMapData) window.renderWorldMap(currentWorldMapData);
    });

    let isMouseDown = false;

    canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isMouseDown = true;
        isDraggingMap = false;
        clickStartX = e.clientX;
        clickStartY = e.clientY;
        dragStartOffsetX = mapOffsetX;
        dragStartOffsetY = mapOffsetY;
    });

    window.addEventListener('mousemove', (e) => {
        if (isMouseDown) {
            const dxPixels = e.clientX - clickStartX;
            const dyPixels = e.clientY - clickStartY;

            if (Math.abs(dxPixels) > 3 || Math.abs(dyPixels) > 3) {
                isDraggingMap = true;
            }
            if (isDraggingMap) {
                const tileSize = 10 * mapZoom;
                mapOffsetX = dragStartOffsetX + (dxPixels / tileSize);
                mapOffsetY = dragStartOffsetY + (dyPixels / tileSize);
                if (currentWorldMapData) window.renderWorldMap(currentWorldMapData);
            }
        }

        // Hover block calculation from persistent cache
        if (mapModalOpen && window.mapState.botPos) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            if (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) {
                const tileSize = 10 * mapZoom;
                const bp = window.mapState.botPos;
                const centerX = canvas.width / 2 + (mapOffsetX * tileSize);
                const centerY = canvas.height / 2 + (mapOffsetY * tileSize);

                const dxBlocks = Math.round((mouseX - centerX) / tileSize);
                const dzBlocks = Math.round((mouseY - centerY) / tileSize);

                const targetX = bp.x + dxBlocks;
                const targetZ = bp.z + dzBlocks;

                const found = window.mapState.cache.get(`${targetX},${targetZ}`);

                hoverBlockInfo = {
                    x: targetX,
                    z: targetZ,
                    y: found ? found.y : null,
                    name: found ? found.name : 'Unknown',
                    dist: Math.round(Math.sqrt(dxBlocks * dxBlocks + dzBlocks * dzBlocks))
                };

                updateMapStatusBar();
            } else {
                hoverBlockInfo = null;
                updateMapStatusBar();
            }
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (!isMouseDown) return;
        isMouseDown = false;

        if (!isDraggingMap && mapModalOpen && window.mapState.botPos) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const tileSize = 10 * mapZoom;
            const bp = window.mapState.botPos;
            const centerX = canvas.width / 2 + (mapOffsetX * tileSize);
            const centerY = canvas.height / 2 + (mapOffsetY * tileSize);

            const dxBlocks = Math.round((mouseX - centerX) / tileSize);
            const dzBlocks = Math.round((mouseY - centerY) / tileSize);

            const targetX = bp.x + dxBlocks;
            const targetZ = bp.z + dzBlocks;

            destinationTarget = { x: targetX, z: targetZ, time: Date.now() };

            if (window.socket) {
                window.socket.emit('mapWalkTo', { x: targetX, z: targetZ });
            }
            if (currentWorldMapData) window.renderWorldMap(currentWorldMapData);
        }
    });

    // === RENDER WORLD MAP (pure renderer — reads from mapState.cache) ===
    window.renderWorldMap = function(data) {
        currentWorldMapData = data;

        // Update shared state from incoming data
        if (data.botPos) {
            window.mapState.botPos = data.botPos;
            window.mapState.botYaw = data.botYaw || 0;
        }

        // Merge incoming blocks into persistent cache
        if (data.blocks && Array.isArray(data.blocks) && data.botPos) {
            data.blocks.forEach(b => {
                let dx, dz, y, name;
                if (Array.isArray(b)) {
                    dx = b[0];
                    dz = b[1];
                    y = b[2];
                    name = data.palette ? data.palette[b[3]] : 'stone';
                } else {
                    dx = b.x - data.botPos.x;
                    dz = b.z - data.botPos.z;
                    y = b.y || data.botPos.y;
                    name = b.name;
                }

                const worldX = data.botPos.x + dx;
                const worldZ = data.botPos.z + dz;
                addToCache(worldX, worldZ, y, name);
            });
        }

        // NOTE: We do NOT call renderRadar here.
        // Radar renders on its own schedule via the 'radar' socket event.

        if (!mapModalOpen) return;

        const width = canvas.width;
        const height = canvas.height;
        const tileSize = 10 * mapZoom;
        const cache = window.mapState.cache;
        const bp = data.botPos;
        if (!bp) return;

        ctx.fillStyle = '#0b0d10';
        ctx.fillRect(0, 0, width, height);

        // Center point of bot on canvas
        const centerX = width / 2 + (mapOffsetX * tileSize);
        const centerY = height / 2 + (mapOffsetY * tileSize);

        // Render Persistent Terrain from Cache
        if (mapLayers.terrain && cache.size > 0) {
            const botX = bp.x;
            const botZ = bp.z;

            // Camera center in world coordinates
            const camWorldX = botX - mapOffsetX;
            const camWorldZ = botZ - mapOffsetY;

            // Compute range of world coordinates visible on canvas
            const halfW = Math.ceil((width / 2) / tileSize) + 3;
            const halfH = Math.ceil((height / 2) / tileSize) + 3;

            const minX = Math.floor(camWorldX - halfW);
            const maxX = Math.ceil(camWorldX + halfW);
            const minZ = Math.floor(camWorldZ - halfH);
            const maxZ = Math.ceil(camWorldZ + halfH);

            for (let worldX = minX; worldX <= maxX; worldX++) {
                for (let worldZ = minZ; worldZ <= maxZ; worldZ++) {
                    const block = cache.get(`${worldX},${worldZ}`);
                    if (!block) continue;

                    const relX = worldX - botX;
                    const relZ = worldZ - botZ;

                    const screenX = centerX + (relX * tileSize);
                    const screenY = centerY + (relZ * tileSize);

                    if (screenX + tileSize < 0 || screenX > width || screenY + tileSize < 0 || screenY > height) continue;

                    // 4-Way NW Topographical elevation calculation
                    const blockN = cache.get(`${worldX},${worldZ - 1}`);
                    const blockW = cache.get(`${worldX - 1},${worldZ}`);
                    const blockNW = cache.get(`${worldX - 1},${worldZ - 1}`);

                    let dy = 0;
                    if (blockN || blockW) {
                        const yN = blockN ? blockN.y : block.y;
                        const yW = blockW ? blockW.y : block.y;
                        const yNW = blockNW ? blockNW.y : block.y;
                        dy = (block.y - yN) * 0.5 + (block.y - yW) * 0.3 + (block.y - yNW) * 0.2;
                    }

                    const baseColor = getBlockColor(block.name);
                    ctx.fillStyle = applyShading(baseColor, dy, worldX, worldZ);
                    ctx.fillRect(screenX - tileSize / 2, screenY - tileSize / 2, tileSize + 0.5, tileSize + 0.5);
                }
            }
        }

        // Render Grid lines
        if (mapLayers.grid && tileSize > 7) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            const botX = bp.x;
            const botZ = bp.z;
            const camWorldX = botX - mapOffsetX;
            const camWorldZ = botZ - mapOffsetY;

            const halfW = Math.ceil((width / 2) / tileSize) + 2;
            const halfH = Math.ceil((height / 2) / tileSize) + 2;

            for (let wx = Math.floor(camWorldX - halfW); wx <= Math.ceil(camWorldX + halfW); wx++) {
                const screenX = centerX + ((wx - bp.x) * tileSize);
                if (screenX >= 0 && screenX <= width) {
                    ctx.beginPath();
                    ctx.moveTo(screenX, 0); ctx.lineTo(screenX, height);
                    ctx.stroke();
                }
            }
            for (let wz = Math.floor(camWorldZ - halfH); wz <= Math.ceil(camWorldZ + halfH); wz++) {
                const screenY = centerY + ((wz - bp.z) * tileSize);
                if (screenY >= 0 && screenY <= height) {
                    ctx.beginPath();
                    ctx.moveTo(0, screenY); ctx.lineTo(width, screenY);
                    ctx.stroke();
                }
            }
        }

        // Render Waypoints
        if (mapLayers.waypoints && window.currentWaypoints && Array.isArray(window.currentWaypoints)) {
            window.currentWaypoints.forEach(wp => {
                const relX = wp.x - bp.x;
                const relZ = wp.z - bp.z;
                const wx = centerX + (relX * tileSize);
                const wy = centerY + (relZ * tileSize);

                if (wx >= -20 && wx <= width + 20 && wy >= -20 && wy <= height + 20) {
                    ctx.fillStyle = '#00e5ff';
                    ctx.beginPath();
                    ctx.arc(wx, wy, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 11px Monocraft';
                    ctx.textAlign = 'center';
                    ctx.fillText(`📍 ${wp.name}`, wx, wy - 10);
                }
            });
        }

        // Render Living Entities & Other Players
        if (mapLayers.entities && window.latestEntities && Array.isArray(window.latestEntities)) {
            window.latestEntities.forEach(e => {
                const relX = e.x - bp.x;
                const relZ = e.z - bp.z;
                const ex = centerX + (relX * tileSize);
                const ey = centerY + (relZ * tileSize);

                if (ex >= 0 && ex <= width && ey >= 0 && ey <= height) {
                    if (e.kind === 'player') {
                        drawMinecraftMapArrow(ctx, ex, ey, e.yaw || 0, 9, '#55ffff', '#ffffff');
                        if (e.name) {
                            ctx.fillStyle = '#ffffff';
                            ctx.font = '10px Monocraft';
                            ctx.textAlign = 'center';
                            ctx.fillText(e.name, ex, ey - 12);
                        }
                    } else {
                        ctx.beginPath();
                        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
                        ctx.fillStyle = e.kind === 'hostile' ? '#ff3333' : '#ffff44';
                        ctx.fill();
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }
            });
        }

        // Render Destination Target Animation
        if (destinationTarget) {
            const relX = destinationTarget.x - bp.x;
            const relZ = destinationTarget.z - bp.z;
            const tx = centerX + (relX * tileSize);
            const ty = centerY + (relZ * tileSize);

            const elapsed = (Date.now() - destinationTarget.time) / 1000;
            if (elapsed < 12) {
                const pulse = (Math.sin(elapsed * 6) + 1) / 2;
                const radiusAnim = 8 + pulse * 6;

                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(tx, ty, radiusAnim, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(tx - 12, ty); ctx.lineTo(tx + 12, ty);
                ctx.moveTo(tx, ty - 12); ctx.lineTo(tx, ty + 12);
                ctx.stroke();
            }
        }

        // Render Bot Minecraft Locator Map Arrow & Vision Field Cone
        const botScreenX = centerX;
        const botScreenY = centerY;

        ctx.save();
        ctx.translate(botScreenX, botScreenY);

        // Vision Cone
        ctx.rotate(-(data.botYaw || 0));
        ctx.fillStyle = 'rgba(255, 255, 85, 0.16)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 50 * mapZoom, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Draw Official Minecraft Map Pointer for Bot
        drawMinecraftMapArrow(ctx, botScreenX, botScreenY, data.botYaw || 0, 13, '#ffffff', '#ffaa00');

        updateMapStatusBar();
    };
}

function updateMapStatusBar() {
    const statusEl = document.getElementById('map-status-bar');
    if (!statusEl) return;

    if (hoverBlockInfo) {
        statusEl.innerHTML = `
            <span>📍 X: <b>${hoverBlockInfo.x}</b> Y: <b>${hoverBlockInfo.y !== null ? hoverBlockInfo.y : '?'}</b> Z: <b>${hoverBlockInfo.z}</b></span> |
            <span>🧱 Block: <b style="color: ${getBlockColor(hoverBlockInfo.name)}">${hoverBlockInfo.name}</b></span> |
            <span>📏 Distance: <b>${hoverBlockInfo.dist}m</b></span>
        `;
    } else if (window.mapState.botPos) {
        const bp = window.mapState.botPos;
        statusEl.innerHTML = `<span>🤖 Bot Position: X: <b>${bp.x}</b> Y: <b>${bp.y}</b> Z: <b>${bp.z}</b> | Zoom: <b>${Math.round(mapZoom * 100)}%</b> | Explored Blocks: <b>${window.mapState.cache.size}</b></span>`;
    }
}

function resetMapCenter() {
    mapZoom = 1.0;
    mapOffsetX = 0;
    mapOffsetY = 0;
    if (currentWorldMapData) window.renderWorldMap(currentWorldMapData);
}

// FIXED: Use addition, not multiplication. zoomMap(0.25) adds 0.25, zoomMap(-0.25) subtracts 0.25.
function zoomMap(delta) {
    mapZoom = Math.max(0.3, Math.min(8.0, mapZoom + delta));
    if (currentWorldMapData) window.renderWorldMap(currentWorldMapData);
}

function toggleMapLayer(layerName) {
    if (mapLayers.hasOwnProperty(layerName)) {
        mapLayers[layerName] = !mapLayers[layerName];
        const btn = document.getElementById(`layer-${layerName}`);
        if (btn) btn.classList.toggle('active', mapLayers[layerName]);
        if (currentWorldMapData) window.renderWorldMap(currentWorldMapData);
    }
}

function toggleMapModal() {
    mapModalOpen = !mapModalOpen;
    const modal = document.getElementById('map-modal');
    if (modal) modal.style.display = mapModalOpen ? 'flex' : 'none';
    if (mapModalOpen) {
        if (window.socket) window.socket.emit('requestWorldMap');
        if (currentWorldMapData) window.renderWorldMap(currentWorldMapData);
    }
}

document.addEventListener('DOMContentLoaded', initWorldMap);
