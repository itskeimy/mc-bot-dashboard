let radarMode = 'map'; // 'map' or 'radar'
let radarZoom = 1.0;

function setRadarMode(mode) {
    radarMode = mode;
    const btnMap = document.getElementById('radar-btn-map');
    const btnRadar = document.getElementById('radar-btn-radar');
    if (btnMap) btnMap.classList.toggle('active', mode === 'map');
    if (btnRadar) btnRadar.classList.toggle('active', mode === 'radar');
    if (window.latestRadarData) {
        window.renderRadar(window.latestRadarData.botYaw, window.latestRadarData.entities);
    }
}

function zoomRadar(delta) {
    radarZoom = Math.max(0.5, Math.min(3.0, radarZoom + delta));
    if (window.latestRadarData) {
        window.renderRadar(window.latestRadarData.botYaw, window.latestRadarData.entities);
    }
}

function initRadar() {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    window.renderRadar = function(botYaw, entities) {
        // Store latest data for mode/zoom toggle re-renders
        window.latestBotYaw = botYaw;
        window.latestEntities = entities;
        window.latestRadarData = { botYaw, entities };

        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = centerX - 5;
        const maxDist = 32 / radarZoom;

        ctx.clearRect(0, 0, width, height);

        ctx.save();

        // Stencil Clip to circular radar frame
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.clip();

        // 1. Draw Real Terrain Map Background if in 'map' mode
        const ms = window.mapState;
        if (radarMode === 'map' && ms && ms.botPos && ms.cache && ms.cache.size > 0) {
            ctx.fillStyle = '#0b0d10';
            ctx.fillRect(0, 0, width, height);

            const tileSize = (width / (maxDist * 2));
            const bp = ms.botPos;
            const rBlocks = Math.ceil(maxDist) + 2;

            for (let dx = -rBlocks; dx <= rBlocks; dx++) {
                for (let dz = -rBlocks; dz <= rBlocks; dz++) {
                    const worldX = bp.x + dx;
                    const worldZ = bp.z + dz;
                    const block = ms.cache.get(`${worldX},${worldZ}`);
                    if (!block) continue;

                    const px = centerX + (dx * tileSize);
                    const py = centerY + (dz * tileSize);

                    if (px + tileSize >= 0 && px <= width && py + tileSize >= 0 && py <= height) {
                        const baseColor = window.getBlockColor ? window.getBlockColor(block.name) : '#555555';
                        ctx.fillStyle = baseColor;
                        ctx.fillRect(px - tileSize / 2, py - tileSize / 2, tileSize + 0.5, tileSize + 0.5);
                    }
                }
            }

            // Dark subtle tint overlay for radar contrast
            ctx.fillStyle = 'rgba(0, 10, 5, 0.15)';
            ctx.fillRect(0, 0, width, height);
        } else {
            // Dark Radar Grid Background
            ctx.fillStyle = 'rgba(0, 20, 10, 0.85)';
            ctx.fillRect(0, 0, width, height);
        }

        // 2. Radar Grid Rings & Crosshair
        ctx.strokeStyle = radarMode === 'map' ? 'rgba(0, 255, 170, 0.35)' : 'rgba(0, 255, 0, 0.4)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX, 5); ctx.lineTo(centerX, height - 5);
        ctx.moveTo(5, centerY); ctx.lineTo(width - 5, centerY);
        ctx.stroke();

        // 3. Render Waypoints on Minimap
        if (window.currentWaypoints && Array.isArray(window.currentWaypoints) && ms && ms.botPos) {
            const bp = ms.botPos;
            const scale = (radius - 5) / maxDist;

            window.currentWaypoints.forEach(wp => {
                const dx = wp.x - bp.x;
                const dz = wp.z - bp.z;
                const px = centerX + (dx * scale);
                const py = centerY + (dz * scale);

                if (Math.hypot(px - centerX, py - centerY) <= radius - 4) {
                    ctx.fillStyle = '#00e5ff';
                    ctx.beginPath();
                    ctx.arc(px, py, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.stroke();
                }
            });
        }

        // 4. Render Living Entities
        if (entities && Array.isArray(entities)) {
            const scale = (radius - 5) / maxDist;

            entities.forEach(e => {
                const px = centerX + (e.dx * scale);
                const py = centerY + (e.dz * scale);

                if (Math.hypot(px - centerX, py - centerY) > radius - 4) return;

                if (e.kind === 'player') {
                    if (window.drawMinecraftMapArrow) {
                        window.drawMinecraftMapArrow(ctx, px, py, e.yaw || 0, 7, '#00ffff', '#ffffff');
                    } else {
                        ctx.fillStyle = '#00ffff';
                        ctx.beginPath();
                        ctx.arc(px, py, 5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else {
                    ctx.beginPath();
                    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
                    ctx.fillStyle = e.kind === 'hostile' ? '#ff3333' : '#ffff44';
                    ctx.fill();
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });
        }

        ctx.restore(); // Remove clip boundary

        // 5. Outer Circular Frame Ring
        ctx.strokeStyle = radarMode === 'map' ? '#00ffaa' : '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Compass Rose Markers (N, S, E, W)
        ctx.fillStyle = '#55ff55';
        ctx.font = 'bold 10px Monocraft';
        ctx.textAlign = 'center';
        ctx.fillText('N', centerX, 16);
        ctx.fillText('S', centerX, height - 8);
        ctx.fillText('W', 12, centerY + 3);
        ctx.fillText('E', width - 12, centerY + 3);

        // 6. FOV Cone & Official Minecraft Map Pointer for Bot
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-botYaw);

        ctx.fillStyle = 'rgba(255, 255, 85, 0.22)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 24, -Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        if (window.drawMinecraftMapArrow) {
            window.drawMinecraftMapArrow(ctx, centerX, centerY, botYaw, 10, '#ffffff', '#ffaa00');
        }
    };
}

document.addEventListener('DOMContentLoaded', initRadar);
