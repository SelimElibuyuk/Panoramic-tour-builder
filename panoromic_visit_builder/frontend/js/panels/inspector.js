// Sağdaki özellik paneli: seçili öğenin türüne göre ilgili bölümü gösterir.
import { on } from '../core/events.js';
import { mediaUrl, fileLabel } from '../core/config.js';
import { isRoom, isHotspot, isObject, hotspots, hotspotRange, hotspotRadius, styleHotspot } from '../editor/entities.js';
import { getSelection, refreshTransformers } from '../editor/selection.js';
import { contentLayer } from '../editor/stage.js';
import { commit } from '../editor/scene.js';
import {
    deleteSelection, duplicateSelection, setRoomsLocked, setRoomsColor, mergeSelectedRooms,
} from '../editor/actions.js';
import { openAssetLibrary } from './assetLibrary.js';
import { openObjectInfoEditor } from './objectInfo.js';
import { enterPanorama, getModelPlugin, refreshPanorama, isPanoramaOpen, modelPitch } from '../panorama/navigation.js';

const $ = (id) => document.getElementById(id);
const root = $('inspector');
const panels = Object.fromEntries([...root.querySelectorAll('[data-panel]')].map((p) => [p.dataset.panel, p]));

let current = [];

function single(kind) {
    return current.length === 1 && kind(current[0]) ? current[0] : null;
}

function render(selection) {
    current = selection;
    root.hidden = selection.length === 0;
    if (!selection.length) return;

    const kinds = new Set(selection.map((n) => (isRoom(n) ? 'room' : isHotspot(n) ? 'hotspot' : 'object')));
    const panelName = selection.length > 1 ? (kinds.size === 1 && kinds.has('room') ? 'room' : 'multi') : [...kinds][0];
    Object.entries(panels).forEach(([name, el]) => { el.hidden = name !== panelName; });

    const roomCount = selection.filter(isRoom).length;
    if (panelName === 'room') renderRoom(selection.filter(isRoom));
    if (panelName === 'hotspot') renderHotspot(selection[0]);
    if (panelName === 'object') renderObject(selection[0]);
    if (panelName === 'multi') $('multi-title').textContent = `${selection.length} öğe seçili`;

    // "Odaları birleştir" hem oda hem çoklu panelde anlamlı
    const merge = $('room-merge');
    const host = panelName === 'room' ? panels.room : panels.multi;
    if (merge.parentElement !== host) host.append(merge);
    merge.hidden = roomCount < 2;
}

// ---------------------------------------------------------------- oda

function renderRoom(roomNodes) {
    panels.room.querySelector('h2').textContent = roomNodes.length > 1 ? `${roomNodes.length} oda` : 'Oda';
    const fill = roomNodes[0].fill();
    $('room-color').value = /^#[0-9a-f]{6}$/i.test(fill) ? fill : '#cbd5e1';
    const locked = roomNodes.every((n) => n.getAttr('locked'));
    $('room-lock').textContent = locked ? '🔓 Kilidi aç' : '🔒 Kilitle';
}

$('room-color').addEventListener('input', (e) => setRoomsColor(e.target.value));
$('room-color').addEventListener('change', (e) => setRoomsColor(e.target.value, { final: true }));
$('room-lock').addEventListener('click', () => {
    const roomNodes = current.filter(isRoom);
    setRoomsLocked(!roomNodes.every((n) => n.getAttr('locked')));
});
$('room-merge').addEventListener('click', mergeSelectedRooms);

// ---------------------------------------------------------------- nokta

function renderHotspot(group) {
    $('hotspot-label').value = group.getAttr('label') || '';
    $('hotspot-label').placeholder = `Nokta ${hotspots().indexOf(group) + 1}`;
    const pano = group.getAttr('panorama');
    const thumb = $('hotspot-pano-thumb');
    thumb.hidden = !pano;
    if (pano) thumb.src = mediaUrl(pano);
    $('hotspot-pano-name').textContent = pano ? fileLabel(pano) : 'Panorama seç…';
    const r = Math.round(hotspotRadius(group));
    $('hotspot-range').value = r;
    $('hotspot-range-val').textContent = `${r} px`;
    $('hotspot-start').checked = !!group.getAttr('isStart');
    $('hotspot-open').disabled = !pano;
}

$('hotspot-label').addEventListener('input', (e) => {
    const g = single(isHotspot);
    if (!g) return;
    g.setAttr('label', e.target.value.trim());
    styleHotspot(g);
    contentLayer.batchDraw();
});
$('hotspot-label').addEventListener('change', () => { commit(); refreshPanorama(); });

$('hotspot-pano-pick').addEventListener('click', () => {
    const g = single(isHotspot);
    if (!g) return;
    openAssetLibrary('panoramas', {
        selected: g.getAttr('panorama'),
        onSelect: (url) => {
            g.setAttr('panorama', url);
            styleHotspot(g);
            commit();
            render(current);
            if (isPanoramaOpen()) enterPanorama(g);
        },
    });
});

$('hotspot-range').addEventListener('input', (e) => {
    const g = single(isHotspot);
    const range = g && hotspotRange(g);
    if (!range) return;
    range.setAttrs({ radius: +e.target.value, scaleX: 1, scaleY: 1 });
    $('hotspot-range-val').textContent = `${e.target.value} px`;
    refreshTransformers();
});
$('hotspot-range').addEventListener('change', () => { commit(); refreshPanorama(); });

$('hotspot-start').addEventListener('change', (e) => {
    const g = single(isHotspot);
    if (!g) return;
    hotspots().forEach((h) => { h.setAttr('isStart', false); styleHotspot(h); });
    g.setAttr('isStart', e.target.checked);
    styleHotspot(g);
    contentLayer.batchDraw();
    commit();
});

$('hotspot-open').addEventListener('click', () => {
    const g = single(isHotspot);
    if (g) enterPanorama(g);
});

// ---------------------------------------------------------------- obje

const sliders = {
    modelScale: { el: $('model-scale'), out: $('model-scale-val'), def: 1, fmt: (v) => `${(+v).toFixed(2)}×` },
    modelRotY: { el: $('model-rot-y'), out: $('model-rot-y-val'), def: 0, fmt: (v) => `${v}°` },
    modelRotX: { el: $('model-rot-x'), out: $('model-rot-x-val'), def: 0, fmt: (v) => `${v}°` },
    modelRotZ: { el: $('model-rot-z'), out: $('model-rot-z-val'), def: 0, fmt: (v) => `${v}°` },
    modelPitch: { el: $('model-pitch'), out: $('model-pitch-val'), def: 0, fmt: (v) => `${v > 0 ? '+' : ''}${v}°` },
};

function renderObject(node) {
    $('object-title').textContent = node.getAttr('objectName') || 'İsimsiz obje';
    const model = node.getAttr('modelUrl');
    $('object-model-name').textContent = model ? fileLabel(model) : 'Varsayılan kutu';
    for (const [attr, s] of Object.entries(sliders)) {
        s.el.value = node.getAttr(attr) ?? s.def;
        s.out.textContent = s.fmt(s.el.value);
    }
}

function applyModelSliders() {
    const node = single(isObject);
    if (!node) return;
    for (const [attr, s] of Object.entries(sliders)) {
        node.setAttr(attr, +s.el.value);
        s.out.textContent = s.fmt(s.el.value);
    }
    const plugin = getModelPlugin();
    const id = 'obj-' + node.id();
    plugin?.updateModel(id, {
        scale: node.getAttr('modelScale'),
        pitch: modelPitch(node),
        rotation: { x: node.getAttr('modelRotX'), y: node.getAttr('modelRotY'), z: node.getAttr('modelRotZ') },
    });
    plugin?.ensureVisible(id);
}

Object.values(sliders).forEach((s) => {
    s.el.addEventListener('input', applyModelSliders);
    s.el.addEventListener('change', commit);
});

$('model-reset').addEventListener('click', () => {
    Object.values(sliders).forEach((s) => { s.el.value = s.def; });
    applyModelSliders();
    commit();
});

$('object-model-pick').addEventListener('click', () => {
    const node = single(isObject);
    if (!node) return;
    openAssetLibrary('models', {
        selected: node.getAttr('modelUrl'),
        onSelect: (url) => {
            node.setAttr('modelUrl', url);
            commit();
            render(current);
            refreshPanorama();
        },
    });
});

$('object-info-edit').addEventListener('click', () => {
    const node = single(isObject);
    if (!node) return;
    openObjectInfoEditor(node, {
        onSave: () => { commit(); render(current); },
    });
});

// ---------------------------------------------------------------- ortak

$('sel-delete').addEventListener('click', deleteSelection);
$('sel-duplicate').addEventListener('click', duplicateSelection);

on('selection', render);
on('scene:changed', () => render(getSelection()));
