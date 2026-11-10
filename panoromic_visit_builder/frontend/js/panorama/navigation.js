// Panorama görünümü: bir noktanın 360° fotoğrafını açar, menzilindeki diğer
// noktaları geçiş oku, objeleri 3D model olarak yerleştirir ve haritada
// bakılan yönü gösteren koniyi günceller.
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { ModelPlugin } from './modelPlugin.js';
import { stage, uiLayer } from '../editor/stage.js';
import {
    hotspots, objects, rooms, hotspotDot, findById, hotspotRadius, hotspotTitle, objectCenter, setActiveHotspot,
} from '../editor/entities.js';
import { mediaUrl, DEFAULT_MODEL_URL, YAW_OFFSET, CANVAS_W, CANVAS_H } from '../core/config.js';
import { escapeHtml, toast } from '../core/ui.js';
import { emit, on } from '../core/events.js';

const container = document.getElementById('pano-container');
const konvaBox = document.getElementById('konva-container');

let viewer = null;
let markers = null;
let models = null;
let currentId = null;
let navToken = 0;

export const currentHotspot = () => findById(currentId);
export const isPanoramaOpen = () => currentId !== null;
export const getModelPlugin = () => models;

function createViewer() {
    viewer = new Viewer({
        container,
        navbar: ['zoom', 'fullscreen'],
        loadingTxt: 'Yükleniyor…',
        mousewheelCtrlKey: false,
        touchmoveTwoFingers: false,
        defaultZoomLvl: 30,
        lang: {
            zoom: 'Yakınlaştırma', zoomOut: 'Uzaklaş', zoomIn: 'Yakınlaş',
            fullscreen: 'Tam ekran', loadError: 'Panorama yüklenemedi',
            twoFingers: 'Gezinmek için iki parmak kullanın',
        },
        plugins: [MarkersPlugin, ModelPlugin],
    });
    markers = viewer.getPlugin(MarkersPlugin);
    models = viewer.getPlugin(ModelPlugin);

    markers.addEventListener('select-marker', ({ marker }) => {
        const target = findById(marker.data?.hotspotId);
        // İleri yürüyormuş hissi için yeni panoramada aynı yöne bakıyoruz
        if (target) enterPanorama(target, { yaw: marker.config.position.yaw });
    });

    models.addEventListener('select-model', (e) => {
        const node = findById(e.detail.data.objectId);
        if (node) emit('panorama:model-click', node);
    });
    models.addEventListener('model-error', () => toast('Bir 3D model yüklenemedi.', 'error'));

    viewer.addEventListener('position-updated', ({ position }) => updateCone(position.yaw));
    viewer.addEventListener('zoom-updated', () => updateCone(viewer.getPosition().yaw));
}

/** Bir noktanın haritadaki konumundan diğerine bakış açısı (panorama yaw'ı). */
function bearing(from, to) {
    return Math.atan2(to.x - from.x, -(to.y - from.y)) + YAW_OFFSET;
}

function nearbyItems(group) {
    const center = group.position(); // katman koordinatları (küçük harita ölçeğinden bağımsız)
    const radius = hotspotRadius(group);
    const all = hotspots();
    const items = [];

    all.forEach((h, i) => {
        if (h === group || !h.getAttr('panorama')) return;
        const pos = h.position();
        const dist = Math.hypot(pos.x - center.x, pos.y - center.y);
        if (dist > 0 && dist <= radius) {
            items.push({ type: 'hotspot', node: h, title: hotspotTitle(h, i), yaw: bearing(center, pos), dist, radius });
        }
    });
    objects().forEach((o) => {
        const pos = objectCenter(o);
        const dist = Math.hypot(pos.x - center.x, pos.y - center.y);
        if (dist <= radius) items.push({ type: 'object', node: o, yaw: bearing(center, pos), dist, radius });
    });
    return items;
}

// Modellerin varsayılan konumu ufkun biraz altı; obje ayarındaki "dikey konum" bunu kaydırır
const BASE_MODEL_PITCH = -0.3;
export function modelPitch(node) {
    return BASE_MODEL_PITCH + ((node.getAttr('modelPitch') ?? 0) * Math.PI) / 180;
}

function populate(group) {
    markers.clearMarkers();
    models.clearAll();

    for (const item of nearbyItems(group)) {
        if (item.type === 'hotspot') {
            // Yakın noktalar daha aşağıda, uzaktakiler ufka yakın görünür
            const pitch = -0.12 - (1 - item.dist / item.radius) * 0.3;
            markers.addMarker({
                id: 'hs-' + item.node.id(),
                position: { yaw: item.yaw, pitch },
                html: `<div class="pano-marker"><span class="pano-marker-arrow"></span><span class="pano-marker-label">${escapeHtml(item.title)}</span></div>`,
                anchor: 'center center',
                data: { hotspotId: item.node.id() },
            });
        } else {
            const o = item.node;
            models.addModel({
                id: 'obj-' + o.id(),
                url: mediaUrl(o.getAttr('modelUrl')) || DEFAULT_MODEL_URL,
                yaw: item.yaw,
                pitch: modelPitch(o),
                scale: o.getAttr('modelScale') ?? 1,
                rotation: {
                    x: o.getAttr('modelRotX') ?? 0,
                    y: o.getAttr('modelRotY') ?? 0,
                    z: o.getAttr('modelRotZ') ?? 0,
                },
                data: { objectId: o.id() },
            });
        }
    }
}

export async function enterPanorama(group, { yaw = null } = {}) {
    const path = group?.getAttr('panorama');
    if (!path) {
        toast('Bu noktaya henüz panorama seçilmedi.', 'warn');
        return false;
    }
    const token = ++navToken;
    const wasOpen = isPanoramaOpen();
    currentId = group.id();
    setActiveHotspot(group);

    container.classList.add('visible');
    konvaBox.classList.add('mini-map-modu');
    if (!wasOpen) fitMinimap();
    document.documentElement.classList.add('pano-open');
    if (!wasOpen) emit('panorama:enter');

    if (!viewer) createViewer();
    viewer.autoSize();
    // Yeni görsel yüklenirken eski odanın okları/modelleri ekranda kalmasın
    markers.clearMarkers();
    models.clearAll();

    const position = yaw !== null ? { yaw, pitch: 0 } : { yaw: 0, pitch: 0 };
    try {
        await viewer.setPanorama(mediaUrl(path), { position, transition: wasOpen ? 600 : false, showLoader: true });
    } catch (err) {
        if (token !== navToken) return false;
        console.error('Panorama yüklenemedi:', path, err);
        toast('Panorama görseli yüklenemedi.', 'error');
    }
    if (token !== navToken) return false; // bu sırada başka bir noktaya geçildi
    populate(group);
    updateCone(viewer.getPosition().yaw);
    emit('panorama:changed', group);
    return true;
}

export function exitPanorama() {
    if (!isPanoramaOpen()) return;
    navToken++;
    currentId = null;
    setActiveHotspot(null);
    removeCone();
    markers?.clearMarkers();
    models?.clearAll();
    container.classList.remove('visible');
    konvaBox.classList.remove('mini-map-modu');
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    stage.batchDraw();
    document.documentElement.classList.remove('pano-open');
    emit('panorama:exit');
}

/** Sahne değişince (silme, taşıma, geri al…) açık panoramanın içeriğini tazeler. */
export function refreshPanorama() {
    if (!isPanoramaOpen()) return;
    const group = currentHotspot();
    if (!group) { exitPanorama(); return; }
    setActiveHotspot(group);
    populate(group);
    updateCone(viewer.getPosition().yaw);
}

export function resizePanorama() {
    viewer?.autoSize();
}

/** Küçük haritada planın tamamı görünsün diye sahneyi içeriğe sığdırır. */
function fitMinimap() {
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    // Menzil halkaları hariç: oda, nokta ve objelerin kapladığı alan
    const rects = [...rooms(), ...objects(), ...hotspots().map(hotspotDot)]
        .filter(Boolean)
        .map((n) => n.getClientRect({ skipShadow: true }));
    if (!rects.length) return;
    const x1 = Math.min(...rects.map((r) => r.x)), y1 = Math.min(...rects.map((r) => r.y));
    const x2 = Math.max(...rects.map((r) => r.x + r.width)), y2 = Math.max(...rects.map((r) => r.y + r.height));
    const box = { x: x1, y: y1, width: Math.max(x2 - x1, 1), height: Math.max(y2 - y1, 1) };
    const pad = 60;
    const scale = Math.min(4, (CANVAS_W - pad * 2) / box.width, (CANVAS_H - pad * 2) / box.height);
    stage.scale({ x: scale, y: scale });
    stage.position({
        x: (CANVAS_W - box.width * scale) / 2 - box.x * scale,
        y: (CANVAS_H - box.height * scale) / 2 - box.y * scale,
    });
    stage.batchDraw();
}

// ---------------------------------------------------- haritadaki görüş konisi

let cone = null;

function updateCone(yaw) {
    const group = currentHotspot();
    if (!group || !viewer) return;
    if (!cone) {
        cone = new Konva.Wedge({
            fill: 'rgba(250, 204, 21, 0.35)',
            stroke: '#f59e0b',
            strokeWidth: 1,
            listening: false,
        });
        uiLayer.add(cone);
        cone.moveToBottom();
    }
    const fov = viewer.state?.hFov ?? 80;
    const lookDeg = ((yaw - YAW_OFFSET) * 180) / Math.PI;
    cone.setAttrs({
        ...group.position(),
        radius: hotspotRadius(group),
        angle: fov,
        rotation: lookDeg - fov / 2 - 90, // Konva'da 0° doğu; panoramada 0 kuzey
    });
    uiLayer.batchDraw();
}

function removeCone() {
    cone?.destroy();
    cone = null;
    uiLayer.batchDraw();
}

on('scene:loaded', () => {
    if (isPanoramaOpen()) refreshPanorama();
});
