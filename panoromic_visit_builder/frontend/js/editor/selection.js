// Seçim: tıklama, Shift ile çoklu seçim, boş alanda sürükleyerek kutu seçimi.
import { stage, contentLayer, uiLayer, roomTransformer, pickTransformer, rangeTransformer, selectionRect, pointer, isPrimary } from './stage.js';
import { entityOf, isRoom, isHotspot, hotspotDot, hotspotRange, rooms, hotspots, objects } from './entities.js';
import { emit, on } from '../core/events.js';

let selected = [];

export const getSelection = () => selected.slice();

export function setSelection(nodes) {
    selected = [...new Set(nodes.filter((n) => n && !n.isDestroyed?.() && n.getLayer()))];
    refreshTransformers();
    emit('selection', getSelection());
}

export const clearSelection = () => setSelection([]);

export function toggleInSelection(node) {
    setSelection(selected.includes(node) ? selected.filter((n) => n !== node) : [...selected, node]);
}

export function refreshTransformers() {
    selected = selected.filter((n) => n.getLayer());
    const roomNodes = selected.filter(isRoom);
    const anyLocked = roomNodes.some((n) => n.getAttr('locked'));
    roomTransformer.nodes(roomNodes);
    roomTransformer.resizeEnabled(!anyLocked);
    roomTransformer.rotateEnabled(!anyLocked);

    pickTransformer.nodes(selected.filter((n) => !isRoom(n)).map((n) => (isHotspot(n) ? hotspotDot(n) : n)).filter(Boolean));

    hotspots().forEach((h) => hotspotRange(h)?.visible(false));
    const single = selected.length === 1 && isHotspot(selected[0]) ? selected[0] : null;
    const range = single && hotspotRange(single);
    if (range) {
        range.visible(true);
        rangeTransformer.nodes([range]);
    } else {
        rangeTransformer.nodes([]);
    }
    contentLayer.batchDraw();
    uiLayer.batchDraw();
}

// Konva düğümleri silindiğinde/yeniden yüklendiğinde seçimi temizle
on('scene:before-load', () => {
    selected = [];
    [roomTransformer, pickTransformer, rangeTransformer].forEach((t) => t.nodes([]));
    emit('selection', []);
});

// ------------------------------------------------------------ fare

let enabled = () => true;      // main.js tarafından ayarlanır (ör. araç etkinken kapalı)
export function setSelectionGuard(fn) { enabled = fn; }
let ignoreClick = () => false; // ör. yeni öğe oluşturan tıklama
export function setClickFilter(fn) { ignoreClick = fn; }

let boxStart = null;

stage.on('mousedown touchstart', (e) => {
    if (!enabled() || e.target !== stage || !isPrimary(e)) return;
    boxStart = pointer();
    selectionRect.setAttrs({ ...boxStart, width: 0, height: 0, visible: true });
});

stage.on('mousemove touchmove', () => {
    if (!boxStart) return;
    const p = pointer();
    selectionRect.setAttrs({
        x: Math.min(boxStart.x, p.x),
        y: Math.min(boxStart.y, p.y),
        width: Math.abs(p.x - boxStart.x),
        height: Math.abs(p.y - boxStart.y),
    });
    uiLayer.batchDraw();
});

let suppressNextClick = false;

stage.on('mouseup touchend', (e) => {
    if (!boxStart || !isPrimary(e)) return;
    finishBox(e.evt);
});

// Fare tuvalin dışında bırakılırsa kutu seçimini son konuma göre bitir
window.addEventListener('mouseup', (e) => {
    if (boxStart && e.button === 0) finishBox(e);
});

function finishBox(evt) {
    // Kutuyu bırakılan noktaya göre hesapla (hızlı sürüklemede mousemove gelmeyebilir)
    const p = pointer();
    const box = {
        x: Math.min(boxStart.x, p.x), y: Math.min(boxStart.y, p.y),
        width: Math.abs(p.x - boxStart.x), height: Math.abs(p.y - boxStart.y),
    };
    boxStart = null;
    selectionRect.visible(false);
    uiLayer.batchDraw();
    if (box.width < 4 && box.height < 4) return; // sadece tıklama: click olayı halleder

    suppressNextClick = true;
    const candidates = [...rooms(), ...hotspots(), ...objects()];
    const hits = candidates.filter((n) => {
        const r = isHotspot(n) ? hotspotDot(n).getClientRect() : n.getClientRect();
        return Konva.Util.haveIntersection(box, r);
    });
    const additive = evt?.shiftKey || evt?.ctrlKey || evt?.metaKey;
    setSelection(additive ? [...selected, ...hits] : hits);
}

stage.on('click tap', (e) => {
    if (suppressNextClick) { suppressNextClick = false; return; }
    if (!isPrimary(e) || ignoreClick() || !enabled()) return;
    const entity = entityOf(e.target);
    const additive = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    if (!entity) {
        if (!additive) clearSelection();
        return;
    }
    if (additive) toggleInSelection(entity);
    else if (!selected.includes(entity) || selected.length > 1) setSelection([entity]);
});

// Sürüklemeye başlanan öğe seçili değilse onu seç
stage.on('dragstart', (e) => {
    const entity = entityOf(e.target);
    if (entity && !selected.includes(entity)) setSelection([entity]);
});
