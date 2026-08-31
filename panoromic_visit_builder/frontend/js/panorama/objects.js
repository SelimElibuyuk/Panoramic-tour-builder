import { Viewer, AbstractPlugin } from '@photo-sphere-viewer/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---- spherical → cartesian helper ----
function sphericalToCartesian(yaw, pitch, distance = 5) {
    const x = -distance * Math.sin(yaw) * Math.cos(pitch);
    const y = distance * Math.sin(pitch);
    const z = distance * Math.cos(yaw) * Math.cos(pitch);
    return { x, y, z };
}

// ---- the plugin ----
export class ModelHotspotsPlugin extends AbstractPlugin {
    static id = 'model-hotspots';

    constructor(viewer) {
        super(viewer);
        this.loader = new GLTFLoader();
        this.models = new Map();
    }

    init() {
        super.init();
        this.scene = this.viewer.renderer.scene;
        this.camera = this.viewer.renderer.camera;
        this.renderer = this.viewer.renderer.renderer;

        // GLTF models need light to be visible — PSV's own sphere doesn't, so none exist by default
        const ambient = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambient);

        const directional = new THREE.DirectionalLight(0xffffff, 1.0);
        directional.position.set(0, 5, 5);
        this.scene.add(directional);

        this._onClick = this._onClick.bind(this);
        this.viewer.container.addEventListener('click', this._onClick);
    }

    destroy() {
        this.viewer.container.removeEventListener('click', this._onClick);
        super.destroy();
    }

    addModel({ id, url, yaw, pitch, distance = 5, scale = 1, data = {} }) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => {
                    const mesh = gltf.scene;
                    const { x, y, z } = sphericalToCartesian(yaw, pitch, distance);
                    mesh.position.set(x, y, z);
                    mesh.scale.setScalar(scale);
                    mesh.userData = { hotspotId: id, ...data };

                    this.scene.add(mesh);
                    this.models.set(id, { mesh, data });
                    this.viewer.needsUpdate();
                    resolve(mesh);
                },
                undefined,
                (error) => {
                    console.error(`Failed to load model ${id}:`, error);
                    reject(error);
                }
            );
        });
    }

    removeModel(id) {
        const entry = this.models.get(id);
        if (entry) {
            this.scene.remove(entry.mesh);
            this.models.delete(id);
            this.viewer.needsUpdate();
        }
    }

    _onClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const meshes = Array.from(this.models.values()).map(m => m.mesh);
        const intersects = raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj && !obj.userData?.hotspotId) {
                obj = obj.parent;
            }
            if (obj) {
                // build a real Event/CustomEvent instead of a plain object
                const selectEvent = new CustomEvent('select-model', {
                    detail: {
                        hotspotId: obj.userData.hotspotId,
                        data: obj.userData,
                    }
                });
                this.dispatchEvent(selectEvent);
            }
        }
    }
    
    clearAllModels() {
        this.models.forEach(({ mesh }) => {
            this.scene.remove(mesh);
        });
        this.models.clear();
        this.viewer.needsUpdate();
    };
}