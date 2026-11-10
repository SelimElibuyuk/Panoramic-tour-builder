// Seçim üzerinde yapılan düzenleme işlemleri.
import { contentLayer } from './stage.js';
import { isRoom, isHotspot, hotspots, createRoom, duplicate, setEditable, styleHotspot } from './entities.js';
import { getSelection, setSelection, clearSelection, refreshTransformers } from './selection.js';
import { commit } from './scene.js';
import { toast } from '../core/ui.js';
import { emit } from '../core/events.js';

export function deleteSelection() {
    const nodes = getSelection();
    if (!nodes.length) return;
    const removedStart = nodes.some((n) => isHotspot(n) && n.getAttr('isStart'));
    clearSelection();
    nodes.forEach((n) => n.destroy());
    if (removedStart) {
        const next = hotspots()[0];
        if (next) { next.setAttr('isStart', true); styleHotspot(next); }
    }
    contentLayer.batchDraw();
    emit('entities:removed');
    commit();
}

export function duplicateSelection() {
    const nodes = getSelection();
    if (!nodes.length) return;
    setSelection(nodes.map(duplicate));
    commit();
}

export function setRoomsLocked(locked) {
    const roomNodes = getSelection().filter(isRoom);
    roomNodes.forEach((n) => {
        n.setAttr('locked', locked);
        setEditable(n, true);
    });
    refreshTransformers();
    emit('selection', getSelection());
    commit();
}

export function setRoomsColor(color, { final = false } = {}) {
    getSelection().filter(isRoom).forEach((n) => n.fill(color));
    contentLayer.batchDraw();
    if (final) commit();
}

/** Bir oda şeklinin köşe noktalarını sahne koordinatlarında verir. */
function outline(node) {
    let local = [];
    const cls = node.getClassName();
    if (cls === 'Rect') {
        const w = node.width(), h = node.height();
        local = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
    } else if (cls === 'Line') {
        const p = node.points();
        for (let i = 0; i < p.length; i += 2) local.push({ x: p[i], y: p[i + 1] });
    } else if (cls === 'Circle') {
        const r = node.radius();
        for (let i = 0; i < 48; i++) {
            const a = (i * 2 * Math.PI) / 48;
            local.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
        }
    }
    const t = node.getAbsoluteTransform();
    return local.map((p) => {
        const q = t.point(p);
        // PolyBool kayan nokta hatalarında çökmesin diye yuvarlıyoruz
        return [Math.round(q.x * 100) / 100, Math.round(q.y * 100) / 100];
    });
}

export function mergeSelectedRooms() {
    const roomNodes = getSelection().filter(isRoom);
    if (roomNodes.length < 2) {
        toast('Birleştirmek için en az iki oda seçin.', 'warn');
        return;
    }
    let merged = null;
    try {
        for (const n of roomNodes) {
            const poly = { regions: [outline(n)], inverted: false };
            merged = merged ? PolyBool.union(merged, poly) : poly;
        }
    } catch (err) {
        console.error(err);
        toast('Odalar birleştirilemedi.', 'error');
        return;
    }
    const fill = roomNodes[0].fill();
    const created = merged.regions.map((region) => createRoom('line', {
        points: region.flat(),
        closed: true,
        fill,
    }));
    clearSelection();
    roomNodes.forEach((n) => n.destroy());
    setSelection(created);
    commit();
    toast(created.length === 1 ? 'Odalar birleştirildi.' : `${created.length} parça oluştu (odalar birbirine değmiyor).`, 'success');
}
