const textureCache = new Map();
let currentSearchQuery = '';

// Drag and drop / Click-swap states
let draggedSlotIndex = null;
let selectedSourceSlotIndex = null;
let floatingItemEl = null;

async function getBestTexture(paths) {
    for (const path of paths) {
        if (textureCache.has(path)) {
            return textureCache.get(path);
        }
        try {
            const img = new Image();
            img.src = path;
            await new Promise((resolve, reject) => {
                img.onload = () => resolve(true);
                img.onerror = () => reject(false);
            });
            textureCache.set(path, path);
            return path;
        } catch (e) {
            continue;
        }
    }
    const fallback = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    return fallback;
}

let tooltipEl = null;
let itemModalEl = null;

function initTooltip() {
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'mc-tooltip';
        tooltipEl.style.display = 'none';
        document.body.appendChild(tooltipEl);
    }
}

function showTooltip(e, name, count, item) {
    initTooltip();
    let durHtml = '';
    if (item && item.durabilityPct !== undefined && item.durabilityPct !== null && item.maxDurability > 0) {
        const remaining = Math.max(0, item.maxDurability - item.durabilityUsed);
        let color = '#55ff55';
        if (item.durabilityPct <= 60) color = '#ffff55';
        if (item.durabilityPct <= 25) color = '#ff5555';
        durHtml = `<div class="tooltip-durability" style="color:${color}; font-size:10px; margin-top:2px;">🛡️ Прочность: ${remaining}/${item.maxDurability} (${item.durabilityPct}%)</div>`;
    }

    tooltipEl.innerHTML = `<div class="tooltip-title">${name}</div>${count > 1 ? `<div class="tooltip-count">Count: ${count}</div>` : ''}${durHtml}`;
    tooltipEl.style.display = 'block';
    tooltipEl.style.left = (e.pageX + 12) + 'px';
    tooltipEl.style.top = (e.pageY + 12) + 'px';
}

function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = 'none';
}

/* FLOATING ITEM CURSOR FOR CLICK-TO-MOVE */
function initFloatingCursor() {
    if (!floatingItemEl) {
        floatingItemEl = document.createElement('div');
        floatingItemEl.id = 'mc-floating-cursor';
        floatingItemEl.style.position = 'fixed';
        floatingItemEl.style.pointerEvents = 'none';
        floatingItemEl.style.zIndex = '9999';
        floatingItemEl.style.display = 'none';
        floatingItemEl.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(floatingItemEl);

        document.addEventListener('mousemove', (e) => {
            if (floatingItemEl && floatingItemEl.style.display !== 'none') {
                floatingItemEl.style.left = e.clientX + 'px';
                floatingItemEl.style.top = e.clientY + 'px';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && selectedSourceSlotIndex !== null) {
                clearSlotSelection();
            }
        });
    }
}

function clearSlotSelection() {
    selectedSourceSlotIndex = null;
    if (floatingItemEl) floatingItemEl.style.display = 'none';
    document.querySelectorAll('.inv-slot.selected-source').forEach(el => el.classList.remove('selected-source'));
}

function showSlotModal(slotIndex, item) {
    if (!item || !window.socket) return;

    if (!itemModalEl) {
        itemModalEl = document.createElement('div');
        itemModalEl.className = 'tab-overlay';
        itemModalEl.id = 'item-action-modal';
        document.body.appendChild(itemModalEl);
    }

    let durInfo = '';
    if (item.durabilityPct !== undefined && item.durabilityPct !== null && item.maxDurability > 0) {
        durInfo = `<p style="font-size:11px; margin: 4px 0;">Прочность: <b>${Math.max(0, item.maxDurability - item.durabilityUsed)} / ${item.maxDurability} (${item.durabilityPct}%)</b></p>`;
    }

    itemModalEl.innerHTML = `
        <div class="tab-content" style="width: 300px; height: auto;" onclick="event.stopPropagation()">
            <div class="tab-header-row">
                <h4 style="margin: 0;">${item.displayName || item.name}</h4>
                <button class="mc-btn close-btn" onclick="closeSlotModal()">X</button>
            </div>
            <div style="text-align: center; padding: 10px;">
                <p style="margin:4px 0;">Слот #${slotIndex} | Количество: <b>${item.count}</b></p>
                ${durInfo}
                <button class="mc-btn" onclick="equipSlotItem(${slotIndex})">🗡 Экипировать в руку</button>
                <button class="mc-btn" onclick="tossSlotItem(${slotIndex})">🗑 Выбросить (Drop)</button>
                <button class="mc-btn" onclick="closeSlotModal()">Отмена</button>
            </div>
        </div>
    `;
    itemModalEl.style.display = 'flex';
    itemModalEl.onclick = closeSlotModal;
}

function closeSlotModal() {
    if (itemModalEl) itemModalEl.style.display = 'none';
}

function equipSlotItem(slotIndex) {
    if (window.socket) window.socket.emit('equipSlot', slotIndex);
    closeSlotModal();
}

function tossSlotItem(slotIndex) {
    if (window.socket) window.socket.emit('tossSlot', slotIndex);
    closeSlotModal();
}

function filterInventory(query) {
    currentSearchQuery = (query || '').toLowerCase().trim();
    if (window.latestSlots) {
        renderInventoryGrid(window.latestSlots);
    }
}

function executeSlotSwap(fromSlot, toSlot) {
    if (fromSlot === toSlot) return;

    // Optimistic UI Swap
    if (window.latestSlots) {
        const temp = window.latestSlots[fromSlot];
        window.latestSlots[fromSlot] = window.latestSlots[toSlot] || null;
        window.latestSlots[toSlot] = temp;
        renderInventoryGrid(window.latestSlots);
    }

    if (window.socket) {
        window.socket.emit('swapSlots', { fromSlot, toSlot });
    }
}

let lastInventory = [];

function renderInventoryGrid(slots, activeSlot) {
    if (activeSlot !== undefined) {
        window.currentActiveSlot = activeSlot;
    }
    const currentHeld = window.currentActiveSlot !== undefined ? window.currentActiveSlot : 36;
    window.latestSlots = slots;
    initTooltip();
    initFloatingCursor();

    const updateGrid = (containerId, slotList) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!container.children.length) {
            let html = '';
            slotList.forEach(i => {
                html += `<div class="inv-slot" id="slot-${i}" data-slot="${i}"></div>`;
            });
            container.innerHTML = html;
        }

        slotList.forEach(i => {
            const newItem = slots[i];
            const slot = document.getElementById(`slot-${i}`);
            if (!slot) return;

            const isHeld = (i === currentHeld);
            const isEnchanted = newItem && newItem.name.includes('enchanted');
            const matches = !newItem || !currentSearchQuery || (newItem.displayName || newItem.name).toLowerCase().includes(currentSearchQuery);

            let classList = ['inv-slot'];
            if (isHeld) classList.push('active-held-slot');
            if (isEnchanted) classList.push('enchanted');
            if (!matches) classList.push('dimmed');
            if (selectedSourceSlotIndex === i) classList.push('selected-source');
            if (draggedSlotIndex === i) classList.push('dragging');

            slot.className = classList.join(' ');

            // Setup HTML5 Drag and Drop
            if (newItem) {
                slot.setAttribute('draggable', 'true');
            } else {
                slot.removeAttribute('draggable');
            }

            slot.ondragstart = (e) => {
                draggedSlotIndex = i;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', i.toString());
                slot.classList.add('dragging');
                hideTooltip();

                const img = slot.querySelector('img');
                if (img && e.dataTransfer.setDragImage) {
                    e.dataTransfer.setDragImage(img, 12, 12);
                }
            };

            slot.ondragend = () => {
                draggedSlotIndex = null;
                slot.classList.remove('dragging');
                document.querySelectorAll('.inv-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
            };

            slot.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!slot.classList.contains('drag-over')) {
                    slot.classList.add('drag-over');
                }
            };

            slot.ondragleave = () => {
                slot.classList.remove('drag-over');
            };

            slot.ondrop = (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const fromSlot = draggedSlotIndex !== null ? draggedSlotIndex : parseInt(e.dataTransfer.getData('text/plain'));
                const toSlot = i;

                if (!isNaN(fromSlot) && fromSlot !== toSlot) {
                    executeSlotSwap(fromSlot, toSlot);
                }
                draggedSlotIndex = null;
            };

            // Setup Click & Context Menu handlers
            slot.oncontextmenu = (e) => {
                e.preventDefault();
                if (newItem) {
                    showSlotModal(i, newItem);
                }
            };

            slot.onclick = (e) => {
                hideTooltip();

                if (selectedSourceSlotIndex === null) {
                    if (newItem) {
                        // Pick up item for click-move
                        selectedSourceSlotIndex = i;
                        slot.classList.add('selected-source');
                        if (floatingItemEl) {
                            floatingItemEl.innerHTML = slot.innerHTML;
                            floatingItemEl.style.display = 'flex';
                            floatingItemEl.style.left = e.clientX + 'px';
                            floatingItemEl.style.top = e.clientY + 'px';
                        }
                    } else if (i >= 36 && i <= 44 && window.socket) {
                        // Hotbar active slot switch
                        window.socket.emit('selectSlot', i - 36);
                    }
                } else {
                    // Click on target slot to swap / place
                    const fromSlot = selectedSourceSlotIndex;
                    const toSlot = i;
                    clearSlotSelection();

                    if (fromSlot !== toSlot) {
                        executeSlotSwap(fromSlot, toSlot);
                    }
                }
            };

            if (newItem) {
                slot.onmouseenter = (e) => showTooltip(e, newItem.displayName || newItem.name, newItem.count, newItem);
                slot.onmousemove = (e) => {
                    if (tooltipEl) {
                        tooltipEl.style.left = (e.pageX + 12) + 'px';
                        tooltipEl.style.top = (e.pageY + 12) + 'px';
                    }
                };
                slot.onmouseleave = hideTooltip;

                renderSlotContent(slot, newItem);
            } else {
                renderEmptySlotPlaceholder(slot, i);
                slot.onmouseenter = null;
                slot.onmousemove = null;
                slot.onmouseleave = null;
            }
        });
    };

    // Armor Slots: 5 (Helmet), 6 (Chestplate), 7 (Leggings), 8 (Boots)
    updateGrid('inv-armor', [5, 6, 7, 8]);

    // Offhand Slot: 45
    updateGrid('inv-offhand', [45]);

    // Crafting Grid: 1, 2, 3, 4 (2x2 input)
    updateGrid('inv-crafting-input', [1, 2, 3, 4]);

    // Crafting Output Slot: 0
    updateGrid('inv-crafting-output', [0]);

    // Main Inventory: 9..35
    const mainList = [];
    for (let i = 9; i <= 35; i++) mainList.push(i);
    updateGrid('inv-main', mainList);

    // Hotbar: 36..44
    const hotbarList = [];
    for (let i = 36; i <= 44; i++) hotbarList.push(i);
    updateGrid('inv-hotbar', hotbarList);

    lastInventory = JSON.parse(JSON.stringify(slots));
}

function renderEmptySlotPlaceholder(slot, slotIndex) {
    let icon = '';
    let title = '';
    if (slotIndex === 5) { icon = '🪖'; title = 'Шлем'; }
    else if (slotIndex === 6) { icon = '👕'; title = 'Нагрудник'; }
    else if (slotIndex === 7) { icon = '👖'; title = 'Поножи'; }
    else if (slotIndex === 8) { icon = '🥾'; title = 'Ботинки'; }
    else if (slotIndex === 45) { icon = '🛡'; title = 'Вторая рука'; }

    if (icon) {
        slot.innerHTML = `<span class="slot-placeholder" title="${title}">${icon}</span>`;
    } else {
        slot.innerHTML = '';
    }
}

async function renderSlotContent(slot, item) {
    if (!item) {
        slot.innerHTML = '';
        return;
    }

    let name = item.name;
    if (name === 'enchanted_golden_apple') name = 'golden_apple';

    let durBarHtml = '';
    if (item.durabilityPct !== undefined && item.durabilityPct !== null && item.maxDurability > 0 && item.durabilityPct < 100) {
        let barColor = '#55ff55';
        if (item.durabilityPct <= 60) barColor = '#ffff55';
        if (item.durabilityPct <= 25) barColor = '#ff5555';
        durBarHtml = `
            <div class="durability-bar-container">
                <div class="durability-bar-fill" style="width: ${Math.max(5, item.durabilityPct)}%; background-color: ${barColor};"></div>
            </div>
        `;
    }

    if (item.isBlock) {
        const mainTex = await getBestTexture([`/mc_assets/block/${name}.png`, `/textures/blocks/${name}.png`]);
        const topTex = await getBestTexture([`/mc_assets/block/${name}_top.png`, mainTex]);
        const sideTex = await getBestTexture([`/mc_assets/block/${name}_side.png`, mainTex]);

        slot.innerHTML = `
            <div class="block-3d-wrapper">
                <div class="block-3d">
                    <div class="block-face face-top" style="background-image: url('${topTex}')"></div>
                    <div class="block-face face-front" style="background-image: url('${mainTex}')"></div>
                    <div class="block-face face-right" style="background-image: url('${sideTex}')"></div>
                </div>
            </div>
            ${item.count > 1 ? `<span class="inv-count">${item.count}</span>` : ''}
            ${durBarHtml}
        `;
    } else {
        const path = await getBestTexture([`/mc_assets/item/${name}.png`, `/mc_assets/block/${name}.png`, `/textures/items/${name}.png`]);
        slot.innerHTML = `<img src="${path}" alt="${name}">${item.count > 1 ? `<span class="inv-count">${item.count}</span>` : ''}${durBarHtml}`;
    }
}
