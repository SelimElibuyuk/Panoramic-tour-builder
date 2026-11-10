// Sahnenin kaydedilmesi / yüklenmesi ve geri al - yinele geçmişi.
import { contentLayer } from './stage.js';
import { hydrate, hotspotRange, hotspots, normalizeZOrder, setActiveHotspot } from './entities.js';
import { state, setState } from '../core/state.js';
import { emit } from '../core/events.js';

export const SCENE_VERSION = 2;

export function serializeScene() {
    const layer = JSON.parse(contentLayer.toJSON());
    // Seçim sırasında açılan menzil halkaları kayda görünür olarak geçmesin
    // Görünüm (renk, etiket metni) yüklemede yeniden üretildiği için kaydedilmez;
    // böylece yalnızca stil değişikliği "kaydedilmemiş değişiklik" sayılmaz.
    (function walk(node) {
        if (node.children) {
            node.children = node.children.filter((c) => c.attrs?.name !== 'hotspot-label');
            node.children.forEach(walk);
        }
        // Sürüklenebilirlik moda göre (builder/önizleme/kilit) her seferinde hesaplanır
        if (node.attrs) delete node.attrs.draggable;
        const name = node.attrs?.name;
        if (name === 'hotspot-range') node.attrs = { name, radius: node.attrs.radius, scaleX: node.attrs.scaleX, scaleY: node.attrs.scaleY };
        if (name === 'hotspot-dot') node.attrs = { name };
    })(layer);
    return { version: SCENE_VERSION, layer };
}

export function loadScene(scene) {
    emit('scene:before-load');
    contentLayer.destroyChildren();
    const layerData = scene?.layer;
    if (layerData?.children?.length) {
        const temp = Konva.Node.create(layerData);
        temp.getChildren().slice().forEach((child) => {
            child.moveTo(contentLayer);
            hydrate(child);
        });
        temp.destroy();
    }
    setActiveHotspot(null);
    normalizeZOrder();
    contentLayer.batchDraw();
    emit('scene:loaded');
}

/** Kat planının küçük önizleme görselini (PNG data URL) üretir. */
export function capturePreview() {
    // Küçük harita yakınlaştırması ve seçim halkaları görsele karışmasın
    const stage = contentLayer.getStage();
    const prevScale = stage.scale();
    const prevPos = stage.position();
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    const ranges = hotspots().map(hotspotRange).filter(Boolean);
    const wasVisible = ranges.map((r) => r.visible());
    ranges.forEach((r) => r.visible(false));
    const box = contentLayer.getClientRect({ skipShadow: true });

    const pad = 20;
    const hasContent = box.width > 0 && box.height > 0;
    const area = hasContent
        ? { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 }
        : { x: 0, y: 0, width: 400, height: 225 };
    const ratio = Math.min(1, 640 / area.width, 360 / area.height);

    const src = contentLayer.toCanvas({ ...area, pixelRatio: ratio });
    ranges.forEach((r, i) => r.visible(wasVisible[i]));
    stage.scale(prevScale);
    stage.position(prevPos);
    stage.batchDraw();

    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(area.width * ratio));
    out.height = Math.max(1, Math.round(area.height * ratio));
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#f4f6f9';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
}

// ------------------------------------------------------------ geçmiş

const MAX_HISTORY = 100;
let undoStack = [];
let redoStack = [];

function snapshot() {
    return JSON.stringify(serializeScene());
}

/** Yeni (ya da yeni yüklenmiş) bir sahne için geçmişi sıfırlar. */
export function resetHistory({ saved = true } = {}) {
    undoStack = [];
    redoStack = [];
    const snap = snapshot();
    setState({ currentScene: snap, ...(saved ? { savedScene: snap } : {}) });
    emit('history');
}

/** Her kullanıcı değişikliğinden sonra çağrılır. */
export function commit() {
    const snap = snapshot();
    if (snap === state.currentScene) return;
    undoStack.push(state.currentScene);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    setState({ currentScene: snap });
    emit('history');
    emit('scene:changed');
}

function restore(snap) {
    loadScene(JSON.parse(snap));
    setState({ currentScene: snap });
    emit('history');
    emit('scene:changed');
}

export function undo() {
    if (!undoStack.length) return;
    redoStack.push(state.currentScene);
    restore(undoStack.pop());
}

export function redo() {
    if (!redoStack.length) return;
    undoStack.push(state.currentScene);
    restore(redoStack.pop());
}

export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;
