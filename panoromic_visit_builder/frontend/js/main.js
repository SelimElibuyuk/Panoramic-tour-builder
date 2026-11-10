// Uygulamanın giriş noktası: modülleri bağlar, kısayolları ve modları yönetir.
import { state, setState, isDirty, isViewer } from './core/state.js';
import { on } from './core/events.js';
import { toast, isTyping, anyModalOpen } from './core/ui.js';
import { stage, contentLayer, isPrimary } from './editor/stage.js';
import { entityOf, isHotspot, isObject, hotspots, setEditable, rooms, objects } from './editor/entities.js';
import { getSelection, setSelection, clearSelection, setSelectionGuard, setClickFilter, refreshTransformers } from './editor/selection.js';
import { setTool, activeTool, toolHint, consumeCreatedClick } from './editor/tools.js';
import { commit, undo, redo, canUndo, canRedo, resetHistory } from './editor/scene.js';
import { deleteSelection, duplicateSelection } from './editor/actions.js';
import './panels/inspector.js';
import { showObjectInfo, hideObjectInfo } from './panels/objectInfo.js';
import { saveTour, newTour, openTour, shareTour, openToursModal } from './panels/tours.js';
import {
    enterPanorama, exitPanorama, isPanoramaOpen, refreshPanorama, resizePanorama, currentHotspot,
} from './panorama/navigation.js';

const $ = (id) => document.getElementById(id);
const html = document.documentElement;

// ================================================================ düzenleyici

setSelectionGuard(() => !isViewer() && !isPanoramaOpen() && !activeTool());
setClickFilter(consumeCreatedClick);

// Taşıma / boyutlandırma bittiğinde geçmişe yaz
stage.on('dragend', (e) => {
    if (!entityOf(e.target)) return;
    commit();
    refreshPanorama();
});

stage.on('transformend', (e) => {
    const node = e.target;
    // Menzil halkasının ölçeğini yarıçapa işle (ölçek birikmesin)
    if (node.hasName('hotspot-range')) {
        node.setAttrs({ radius: Math.round(node.radius() * Math.abs(node.scaleX())), scaleX: 1, scaleY: 1 });
        refreshTransformers();
        refreshPanorama();
    }
    commit();
});

stage.on('dblclick dbltap', (e) => {
    if (isViewer()) return;
    const entity = entityOf(e.target);
    if (isHotspot(entity)) enterPanorama(entity);
});

// Panorama açıkken haritadaki nokta küçük harita üzerinden gezinmeye yarar
stage.on('click tap', (e) => {
    if (!isPanoramaOpen() || !isPrimary(e)) return;
    const entity = entityOf(e.target);
    if (isHotspot(entity)) enterPanorama(entity);
    else if (isObject(entity) && !isViewer()) setSelection([entity]);
});

// ---- Araç çubuğu
document.querySelectorAll('.tool-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
        exitPanorama();
        setTool(btn.dataset.tool);
    }));

on('tool', (tool) => {
    document.querySelectorAll('.tool-btn').forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
    const hint = $('tool-hint');
    hint.hidden = !tool;
    hint.textContent = toolHint(tool);
    if (tool) clearSelection();
});

$('btn-undo').addEventListener('click', undo);
$('btn-redo').addEventListener('click', redo);
$('pano-exit').addEventListener('click', exitPanorama);

on('history', () => {
    $('btn-undo').disabled = !canUndo();
    $('btn-redo').disabled = !canRedo();
    const empty = contentLayer.getChildren().length === 0;
    $('empty-hint').hidden = !empty;
    refreshSaveStatus();
});

on('scene:changed', refreshPanorama);
on('panorama:model-click', (node) => {
    if (isViewer()) showObjectInfo(node);
    else setSelection([node]);
});
// Küçük haritada öğeler sürüklenmesin (sahne ölçekli, yalnızca gezinme için)
const allEntities = () => [...rooms(), ...hotspots(), ...objects()];
on('panorama:enter', () => {
    setTool(null);
    clearSelection();
    allEntities().forEach((n) => setEditable(n, false));
});
on('panorama:exit', () => {
    if (!isViewer()) allEntities().forEach((n) => setEditable(n, true));
    refreshTransformers();
});

// ================================================================ üst bar

const nameInput = $('tour-name');
nameInput.addEventListener('input', () => setState({ tourName: nameInput.value }));
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });

$('btn-save').addEventListener('click', () => saveTour());
$('btn-new').addEventListener('click', newTour);
$('btn-tours').addEventListener('click', openToursModal);
$('btn-share').addEventListener('click', shareTour);
$('mode-toggle').addEventListener('click', () => setMode(isViewer() ? 'builder' : 'viewer'));

function refreshSaveStatus() {
    const el = $('save-status');
    if (state.saving) { el.textContent = 'Kaydediliyor…'; el.dataset.status = 'saving'; return; }
    if (isDirty()) { el.textContent = 'Kaydedilmedi'; el.dataset.status = 'dirty'; return; }
    el.textContent = state.tourId ? 'Kaydedildi' : '';
    el.dataset.status = 'saved';
}

on('state', () => {
    if (document.activeElement !== nameInput) nameInput.value = state.tourName;
    document.title = `${state.tourName || 'Tur'} · Panoramik Tur`;
    refreshSaveStatus();
});

window.addEventListener('beforeunload', (e) => {
    if (!state.shared && isDirty()) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// ================================================================ modlar

function startHotspot() {
    const withPano = hotspots().filter((h) => h.getAttr('panorama'));
    return withPano.find((h) => h.getAttr('isStart')) ?? withPano[0] ?? null;
}

async function setMode(mode) {
    if (state.shared && mode !== 'viewer') return;
    if (mode === 'viewer') {
        // Builder'da bir panorama açıksa önizleme oradan başlasın
        const start = currentHotspot() ?? startHotspot();
        if (!start) {
            toast('Önizleme için panoraması seçilmiş en az bir nokta gerekli.', 'warn', 4500);
            return;
        }
        setTool(null);
        clearSelection();
        setState({ mode: 'viewer' });
        allEntities().forEach((n) => setEditable(n, false));
        applyModeClasses();
        await enterPanorama(start);
    } else {
        hideObjectInfo();
        exitPanorama();
        setState({ mode: 'builder' });
        allEntities().forEach((n) => setEditable(n, true));
        applyModeClasses();
    }
}

function applyModeClasses() {
    html.classList.toggle('mode-viewer', isViewer());
    html.classList.toggle('mode-builder', !isViewer());
    $('mode-toggle').textContent = isViewer() ? '✎ Düzenlemeye dön' : '▶ Önizle';
    requestAnimationFrame(resizePanorama);
}

window.addEventListener('resize', resizePanorama);

// ================================================================ kısayollar

const TOOL_KEYS = { r: 'rect', c: 'circle', n: 'hotspot', o: 'object' };

document.addEventListener('keydown', (e) => {
    if (isTyping(e) || anyModalOpen() || isViewer()) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (mod && key === 's') { e.preventDefault(); saveTour(); return; }
    if (mod && key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
    if (mod && key === 'd') { e.preventDefault(); duplicateSelection(); return; }
    if (mod) return;

    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); return; }
    if (e.key === 'Escape') {
        if (activeTool()) setTool(null);
        else if (getSelection().length) clearSelection();
        else exitPanorama();
        return;
    }
    if (TOOL_KEYS[key] && !e.altKey) {
        exitPanorama();
        setTool(TOOL_KEYS[key]);
        return;
    }
    // Ok tuşlarıyla seçiliyi kaydır (Shift: 10 px)
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.key] && getSelection().length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        getSelection().forEach((n) => {
            if (n.draggable()) n.position({ x: n.x() + arrows[e.key][0] * step, y: n.y() + arrows[e.key][1] * step });
        });
        refreshTransformers();
        clearTimeout(arrowTimer);
        arrowTimer = setTimeout(() => { commit(); refreshPanorama(); }, 300);
    }
});
let arrowTimer = null;

// ================================================================ açılış

async function boot() {
    const params = new URLSearchParams(location.search);
    if (state.shared) {
        try {
            await openTour(params.get('tour'), { quiet: true });
            document.title = `${state.tourName} · Panoramik Tur`;
            const start = startHotspot();
            if (!start) throw new Error('Bu turda görüntülenecek panorama yok.');
            allEntities().forEach((n) => setEditable(n, false));
            await enterPanorama(start);
        } catch (err) {
            console.error(err);
            document.body.replaceChildren(Object.assign(document.createElement('p'), {
                className: 'fatal-message',
                textContent: err.message === 'Tur bulunamadı.' ? 'Bu tur bulunamadı veya silinmiş.' : `Tur açılamadı: ${err.message}`,
            }));
        }
        return;
    }

    resetHistory();
    const editId = params.get('edit');
    if (editId) {
        try {
            await openTour(editId, { quiet: true });
        } catch (err) {
            toast(`Kayıtlı tur açılamadı: ${err.message}`, 'error');
        }
    }
    applyModeClasses();
}

boot();
