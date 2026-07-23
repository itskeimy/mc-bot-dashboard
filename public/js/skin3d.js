// 3d рендер скина майнкрафт на three.js
class MinecraftSkinViewer3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.playerGroup = null;
        this.headGroup = null;
        this.rightArmPivot = null;
        this.leftArmPivot = null;
        this.rightLegPivot = null;
        this.leftLegPivot = null;
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.targetRotationY = 0.35;
        this.targetRotationX = 0;
        this.currentUsername = null;
        this.animTime = 0;
    }

    init() {
        if (!this.container || !window.THREE) return;

        const width = this.container.clientWidth || 160;
        const height = this.container.clientHeight || 180;

        // сцена
        this.scene = new THREE.Scene();

        // камера
        this.camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
        this.camera.position.set(0, -2, 54);

        // рендерер
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        // освещение
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        this.scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.65);
        dirLight1.position.set(20, 30, 20);
        this.scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.35);
        dirLight2.position.set(-20, -10, -20);
        this.scene.add(dirLight2);

        // сборка модели игрока
        this.buildPlayer(null);

        // управления мышью
        this.bindEvents();

        // анимационный цикл
        this.animate();
    }

    createFaceMaterials(skinImg, uvs, isOverlay = false) {
        const materials = [];
        const faceKeys = ['right', 'left', 'top', 'bottom', 'front', 'back'];

        faceKeys.forEach(key => {
            const uv = uvs[key];
            const canvas = document.createElement('canvas');
            canvas.width = uv.w * 8;
            canvas.height = uv.h * 8;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;

            if (skinImg && skinImg.complete) {
                ctx.drawImage(skinImg, uv.x, uv.y, uv.w, uv.h, 0, 0, canvas.width, canvas.height);
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;

            materials.push(new THREE.MeshLambertMaterial({
                map: texture,
                transparent: true,
                alphaTest: isOverlay ? 0.1 : 0.0
            }));
        });

        return materials;
    }

    buildPlayer(skinImg) {
        if (this.playerGroup && this.scene) {
            this.scene.remove(this.playerGroup);
        }

        this.playerGroup = new THREE.Group();

        // uv разметка 64x64 скина майнкрафт
        const headUVs = { right:{x:0,y:8,w:8,h:8}, left:{x:16,y:8,w:8,h:8}, top:{x:8,y:0,w:8,h:8}, bottom:{x:16,y:0,w:8,h:8}, front:{x:8,y:8,w:8,h:8}, back:{x:24,y:8,w:8,h:8} };
        const torsoUVs = { right:{x:16,y:20,w:4,h:12}, left:{x:28,y:20,w:4,h:12}, top:{x:20,y:16,w:8,h:4}, bottom:{x:28,y:16,w:8,h:4}, front:{x:20,y:20,w:8,h:12}, back:{x:32,y:20,w:8,h:12} };
        const rightArmUVs = { right:{x:40,y:20,w:4,h:12}, left:{x:48,y:20,w:4,h:12}, top:{x:44,y:16,w:4,h:4}, bottom:{x:48,y:16,w:4,h:4}, front:{x:44,y:20,w:4,h:12}, back:{x:52,y:20,w:4,h:12} };
        const leftArmUVs = { right:{x:32,y:52,w:4,h:12}, left:{x:40,y:52,w:4,h:12}, top:{x:36,y:48,w:4,h:4}, bottom:{x:40,y:48,w:4,h:4}, front:{x:36,y:52,w:4,h:12}, back:{x:44,y:52,w:4,h:12} };
        const rightLegUVs = { right:{x:0,y:20,w:4,h:12}, left:{x:8,y:20,w:4,h:12}, top:{x:4,y:16,w:4,h:4}, bottom:{x:8,y:16,w:4,h:4}, front:{x:4,y:20,w:4,h:12}, back:{x:12,y:20,w:4,h:12} };
        const leftLegUVs = { right:{x:16,y:52,w:4,h:12}, left:{x:24,y:52,w:4,h:12}, top:{x:20,y:48,w:4,h:4}, bottom:{x:24,y:48,w:4,h:4}, front:{x:20,y:52,w:4,h:12}, back:{x:28,y:52,w:4,h:12} };

        // uv разметка внешнего слоя скина
        const hatOverlayUVs = { right:{x:32,y:8,w:8,h:8}, left:{x:48,y:8,w:8,h:8}, top:{x:40,y:0,w:8,h:8}, bottom:{x:48,y:0,w:8,h:8}, front:{x:40,y:8,w:8,h:8}, back:{x:56,y:8,w:8,h:8} };
        const jacketOverlayUVs = { right:{x:16,y:36,w:4,h:12}, left:{x:28,y:36,w:4,h:12}, top:{x:20,y:32,w:8,h:4}, bottom:{x:28,y:32,w:8,h:4}, front:{x:20,y:36,w:8,h:12}, back:{x:32,y:36,w:8,h:12} };
        const rightSleeveOverlayUVs = { right:{x:40,y:36,w:4,h:12}, left:{x:48,y:36,w:4,h:12}, top:{x:44,y:32,w:4,h:4}, bottom:{x:48,y:32,w:4,h:4}, front:{x:44,y:36,w:4,h:12}, back:{x:52,y:36,w:4,h:12} };
        const leftSleeveOverlayUVs = { right:{x:48,y:52,w:4,h:12}, left:{x:56,y:52,w:4,h:12}, top:{x:52,y:48,w:4,h:4}, bottom:{x:56,y:48,w:4,h:4}, front:{x:52,y:52,w:4,h:12}, back:{x:60,y:52,w:4,h:12} };
        const rightPantsOverlayUVs = { right:{x:0,y:36,w:4,h:12}, left:{x:8,y:36,w:4,h:12}, top:{x:4,y:32,w:4,h:4}, bottom:{x:8,y:32,w:4,h:4}, front:{x:4,y:36,w:4,h:12}, back:{x:12,y:36,w:4,h:12} };
        const leftPantsOverlayUVs = { right:{x:0,y:52,w:4,h:12}, left:{x:8,y:52,w:4,h:12}, top:{x:4,y:48,w:4,h:4}, bottom:{x:4,y:48,w:4,h:4}, front:{x:4,y:52,w:4,h:12}, back:{x:12,y:52,w:4,h:12} };

        // голова и слой шляпы
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 10, 0);

        const headGeo = new THREE.BoxGeometry(8, 8, 8);
        const headMat = skinImg ? this.createFaceMaterials(skinImg, headUVs) : new THREE.MeshLambertMaterial({ color: 0xdba17d });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        this.headGroup.add(headMesh);

        if (skinImg) {
            const hatGeo = new THREE.BoxGeometry(8.6, 8.6, 8.6);
            const hatMat = this.createFaceMaterials(skinImg, hatOverlayUVs, true);
            const hatMesh = new THREE.Mesh(hatGeo, hatMat);
            this.headGroup.add(hatMesh);
        }
        this.playerGroup.add(this.headGroup);

        // туловище и куртка
        const torsoGroup = new THREE.Group();
        torsoGroup.position.set(0, 0, 0);

        const torsoGeo = new THREE.BoxGeometry(8, 12, 4);
        const torsoMat = skinImg ? this.createFaceMaterials(skinImg, torsoUVs) : new THREE.MeshLambertMaterial({ color: 0x3366cc });
        const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
        torsoGroup.add(torsoMesh);

        if (skinImg) {
            const jacketGeo = new THREE.BoxGeometry(8.5, 12.5, 4.5);
            const jacketMat = this.createFaceMaterials(skinImg, jacketOverlayUVs, true);
            const jacketMesh = new THREE.Mesh(jacketGeo, jacketMat);
            torsoGroup.add(jacketMesh);
        }
        this.playerGroup.add(torsoGroup);

        // 3. RIGHT ARM PIVOT AT SHOULDER (-6, 6, 0)
        this.rightArmPivot = new THREE.Group();
        this.rightArmPivot.position.set(-6, 6, 0);

        const armGeo = new THREE.BoxGeometry(4, 12, 4);
        const rightArmMat = skinImg ? this.createFaceMaterials(skinImg, rightArmUVs) : new THREE.MeshLambertMaterial({ color: 0xdba17d });
        const rightArmMesh = new THREE.Mesh(armGeo, rightArmMat);
        rightArmMesh.position.set(0, -6, 0); // Offset geometry down by half height
        this.rightArmPivot.add(rightArmMesh);

        if (skinImg) {
            const sleeveGeo = new THREE.BoxGeometry(4.5, 12.5, 4.5);
            const sleeveMat = this.createFaceMaterials(skinImg, rightSleeveOverlayUVs, true);
            const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
            sleeveMesh.position.set(0, -6, 0);
            this.rightArmPivot.add(sleeveMesh);
        }
        this.playerGroup.add(this.rightArmPivot);

        // 4. LEFT ARM PIVOT AT SHOULDER (6, 6, 0)
        this.leftArmPivot = new THREE.Group();
        this.leftArmPivot.position.set(6, 6, 0);

        const leftArmMat = skinImg ? this.createFaceMaterials(skinImg, leftArmUVs) : new THREE.MeshLambertMaterial({ color: 0xdba17d });
        const leftArmMesh = new THREE.Mesh(armGeo, leftArmMat);
        leftArmMesh.position.set(0, -6, 0);
        this.leftArmPivot.add(leftArmMesh);

        if (skinImg) {
            const leftSleeveGeo = new THREE.BoxGeometry(4.5, 12.5, 4.5);
            const leftSleeveMat = this.createFaceMaterials(skinImg, leftSleeveOverlayUVs, true);
            const leftSleeveMesh = new THREE.Mesh(leftSleeveGeo, leftSleeveMat);
            leftSleeveMesh.position.set(0, -6, 0);
            this.leftArmPivot.add(leftSleeveMesh);
        }
        this.playerGroup.add(this.leftArmPivot);

        // 5. RIGHT LEG PIVOT AT HIP (-2, -6, 0)
        this.rightLegPivot = new THREE.Group();
        this.rightLegPivot.position.set(-2, -6, 0);

        const legGeo = new THREE.BoxGeometry(4, 12, 4);
        const rightLegMat = skinImg ? this.createFaceMaterials(skinImg, rightLegUVs) : new THREE.MeshLambertMaterial({ color: 0x222266 });
        const rightLegMesh = new THREE.Mesh(legGeo, rightLegMat);
        rightLegMesh.position.set(0, -6, 0);
        this.rightLegPivot.add(rightLegMesh);

        if (skinImg) {
            const pantsGeo = new THREE.BoxGeometry(4.5, 12.5, 4.5);
            const pantsMat = this.createFaceMaterials(skinImg, rightPantsOverlayUVs, true);
            const pantsMesh = new THREE.Mesh(pantsGeo, pantsMat);
            pantsMesh.position.set(0, -6, 0);
            this.rightLegPivot.add(pantsMesh);
        }
        this.playerGroup.add(this.rightLegPivot);

        // 6. LEFT LEG PIVOT AT HIP (2, -6, 0)
        this.leftLegPivot = new THREE.Group();
        this.leftLegPivot.position.set(2, -6, 0);

        const leftLegMat = skinImg ? this.createFaceMaterials(skinImg, leftLegUVs) : new THREE.MeshLambertMaterial({ color: 0x222266 });
        const leftLegMesh = new THREE.Mesh(legGeo, leftLegMat);
        leftLegMesh.position.set(0, -6, 0);
        this.leftLegPivot.add(leftLegMesh);

        if (skinImg) {
            const leftPantsGeo = new THREE.BoxGeometry(4.5, 12.5, 4.5);
            const leftPantsMat = this.createFaceMaterials(skinImg, leftPantsOverlayUVs, true);
            const leftPantsMesh = new THREE.Mesh(leftPantsGeo, leftPantsMat);
            leftPantsMesh.position.set(0, -6, 0);
            this.leftLegPivot.add(leftPantsMesh);
        }
        this.playerGroup.add(this.leftLegPivot);

        this.scene.add(this.playerGroup);
    }

    loadSkin(username) {
        if (!username) return;
        if (this.currentUsername === username && this.playerGroup) return;
        this.currentUsername = username;

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            this.buildPlayer(img);
        };
        img.onerror = () => {
            const fallback = new Image();
            fallback.crossOrigin = 'Anonymous';
            fallback.onload = () => { this.buildPlayer(fallback); };
            fallback.onerror = () => { this.buildPlayer(null); };
            fallback.src = `https://minotar.net/skin/${encodeURIComponent(username)}`;
        };
        img.src = `https://mc-heads.net/skin/${encodeURIComponent(username)}`;
    }

    bindEvents() {
        if (!this.container) return;

        const dom = this.container;

        dom.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) {
                // слежение головы за курсором
                const rect = dom.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const dx = (e.clientX - centerX) / (window.innerWidth / 2);
                const dy = (e.clientY - centerY) / (window.innerHeight / 2);

                if (this.headGroup) {
                    this.headGroup.rotation.y = dx * 0.35;
                    this.headGroup.rotation.x = dy * 0.25;
                }
                return;
            }

            const deltaX = e.clientX - this.previousMousePosition.x;
            const deltaY = e.clientY - this.previousMousePosition.y;

            this.targetRotationY += deltaX * 0.015;
            this.targetRotationX += deltaY * 0.01;
            this.targetRotationX = Math.max(-0.4, Math.min(0.4, this.targetRotationX));

            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // поддержка сенсорного экрана
        dom.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        window.addEventListener('touchmove', (e) => {
            if (this.isDragging && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
                const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

                this.targetRotationY += deltaX * 0.015;
                this.targetRotationX += deltaY * 0.01;

                this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        window.addEventListener('touchend', () => {
            this.isDragging = false;
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.playerGroup) {
            // плавное вращение фигуры
            this.playerGroup.rotation.y += (this.targetRotationY - this.playerGroup.rotation.y) * 0.1;
            this.playerGroup.rotation.x += (this.targetRotationX - this.playerGroup.rotation.x) * 0.1;

            // плавное покачивание рук и ног в покое
            this.animTime += 0.025;
            const swing = Math.sin(this.animTime) * 0.12;

            if (this.rightArmPivot) this.rightArmPivot.rotation.x = swing;
            if (this.leftArmPivot) this.leftArmPivot.rotation.x = -swing;
            if (this.rightLegPivot) this.rightLegPivot.rotation.x = -swing;
            if (this.leftLegPivot) this.leftLegPivot.rotation.x = swing;
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

window.MinecraftSkinViewer3D = MinecraftSkinViewer3D;
