// Photo Sphere Viewer için 3D model (GLB) eklentisi.
import { AbstractPlugin } from '@photo-sphere-viewer/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const deg = THREE.MathUtils.degToRad;
const MODEL_RENDER_ORDER = 10;

export class ModelPlugin extends AbstractPlugin {
    static id = 'model-hotspots';

    constructor(viewer) {
        super(viewer);
        this.loader = new GLTFLoader();
        this.cache = new Map();   // url -> Promise<gltf>; aynı model bir kez indirilir
        this.models = new Map();  // id -> { mesh, data }
        this.generation = 0;      // clearAll sonrası geç gelen yüklemeleri yok saymak için
        this.raycaster = new THREE.Raycaster();
    }

    init() {
        super.init();
        this.scene = this.viewer.renderer.scene;
        this.camera = this.viewer.renderer.camera;
        this.canvas = this.viewer.renderer.renderer.domElement;

        this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const sun = new THREE.DirectionalLight(0xffffff, 1.4);
        sun.position.set(2, 5, 3);
        this.scene.add(sun);

        this._onClick = this._onClick.bind(this);
        this._onMove = this._onMove.bind(this);
        this.viewer.container.addEventListener('click', this._onClick);
        this.viewer.container.addEventListener('pointermove', this._onMove);
    }

    destroy() {
        this.viewer.container.removeEventListener('click', this._onClick);
        this.viewer.container.removeEventListener('pointermove', this._onMove);
        this.clearAll();
        super.destroy();
    }

    _load(url) {
        if (!this.cache.has(url)) {
            const p = this.loader.loadAsync(url);
            p.catch(() => this.cache.delete(url)); // hatalıysa tekrar denenebilsin
            this.cache.set(url, p);
        }
        return this.cache.get(url);
    }

    async addModel({ id, url, yaw, pitch = -0.3, distance = 4, scale = 1, rotation = {}, data = {} }) {
        const gen = this.generation;
        let gltf;
        try {
            gltf = await this._load(url);
        } catch (err) {
            console.error(`Model yüklenemedi (${url}):`, err);
            this.dispatchEvent(new CustomEvent('model-error', { detail: { id, url, error: err } }));
            return null;
        }
        if (gen !== this.generation) return null; // bu arada başka panoramaya geçildi

        this.removeModel(id);
        const mesh = gltf.scene.clone(true);
        mesh.rotation.order = 'YXZ'; // Y = yatay dönüş, X = eğim, Z = yan yatma
        // PSV panorama küresini derinlik testi olmadan çizer. Çizim sırası belirtilmezse
        // three.js malzeme sırasına bakar; panorama yeniden yüklenince (ör. çıkıp tekrar
        // girince) küre en son çizilip modelleri örtüyordu. Modeller her zaman küreden sonra.
        mesh.renderOrder = MODEL_RENDER_ORDER;
        mesh.traverse((child) => { child.renderOrder = MODEL_RENDER_ORDER; });
        mesh.userData = { modelId: id, ...data, yaw, distance };
        this._apply(mesh, { pitch, scale, rotation });

        this.scene.add(mesh);
        this.models.set(id, { mesh, data });
        this.viewer.needsUpdate();
        return mesh;
    }

    _apply(mesh, { pitch, scale, rotation }) {
        if (pitch !== undefined) {
            // Model kameradan aynı uzaklıkta kalır, yalnızca bakış açısı (yukarı/aşağı) değişir
            // Yön dönüşümünü PSV'nin kendisi yapar; böylece modeller geçiş oklarıyla
            // (ve haritadaki görüş konisiyle) aynı yöne yerleşir.
            const { yaw, distance } = mesh.userData;
            this.viewer.dataHelper.sphericalCoordsToVector3({ yaw, pitch }, mesh.position, distance);
        }
        if (scale !== undefined) mesh.scale.setScalar(scale);
        if (rotation) mesh.rotation.set(deg(rotation.x ?? 0), deg(rotation.y ?? 0), deg(rotation.z ?? 0));
    }

    updateModel(id, props) {
        const entry = this.models.get(id);
        if (!entry) return false;
        this._apply(entry.mesh, props);
        this.viewer.needsUpdate();
        return true;
    }

    /** Model ekranın dışına kaydıysa kamerayı ona çevirir (ayar yaparken gözden kaybolmasın). */
    ensureVisible(id) {
        const entry = this.models.get(id);
        if (!entry) return;
        const p = entry.mesh.position.clone().project(this.camera);
        const inView = p.z < 1 && Math.abs(p.x) < 0.85 && Math.abs(p.y) < 0.8;
        if (!inView) this.viewer.rotate(this.viewer.dataHelper.vector3ToSphericalCoords(entry.mesh.position));
    }

    removeModel(id) {
        const entry = this.models.get(id);
        if (!entry) return;
        this.scene.remove(entry.mesh);
        this.models.delete(id);
        this.viewer.needsUpdate();
    }

    clearAll() {
        this.generation++;
        this.models.forEach(({ mesh }) => this.scene.remove(mesh));
        this.models.clear();
        this.viewer.needsUpdate();
    }

    _hit(event) {
        if (!this.models.size) return null;
        const rect = this.canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        this.raycaster.setFromCamera(mouse, this.camera);
        const meshes = [...this.models.values()].map((m) => m.mesh);
        const hit = this.raycaster.intersectObjects(meshes, true)[0];
        let obj = hit?.object;
        while (obj && !obj.userData?.modelId) obj = obj.parent;
        return obj ?? null;
    }

    _onMove(event) {
        if (this._moveQueued) return;
        this._moveQueued = true;
        requestAnimationFrame(() => {
            this._moveQueued = false;
            const hovering = !!this._hit(event);
            this.viewer.container.classList.toggle('model-hover', hovering);
        });
    }

    _onClick(event) {
        const obj = this._hit(event);
        if (!obj) return;
        this.dispatchEvent(new CustomEvent('select-model', {
            detail: { id: obj.userData.modelId, data: obj.userData },
        }));
    }
}
