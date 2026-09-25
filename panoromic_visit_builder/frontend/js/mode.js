import { stage, transformer, hotspottransformer, objecttransformer, visiontransformer, sidebar2, objectsidebar } from './script.js';
import { switchToPanoramaView, exitPanoramaView } from './buttons.js';
import { applyTourData } from './tourLoader.js';
import { saveTour } from './api/save.js';

const BACKEND_URL = 'http://127.0.0.1:8000';
const root = document.documentElement;
const toggleBtn = document.getElementById('mode-toggle');
const shareBtn = document.getElementById('Share-tool');

const sharedTourId = new URLSearchParams(location.search).get('tour');
export const IS_SHARED = !!sharedTourId;

let currentMode = IS_SHARED ? 'viewer' : 'builder';
const draggableMemory = new Map(); // builder'a dönünce sürüklenebilirlik geri gelsin

export const getMode = () => currentMode;
export const isViewer = () => currentMode === 'viewer';

function clearSelection() {
    [transformer, hotspottransformer, objecttransformer, visiontransformer].forEach(t => t.nodes([]));
    stage.find('.hotspot-vision').forEach(v => v.visible(false));
    sidebar2.style.visibility = 'hidden';
    objectsidebar.style.visibility = 'hidden';
}

function findStartNode() {
    return stage.find('.hotspot-obje').concat(stage.find('.panorama-hotspot-obje'))[0] || null;
}

export function setMode(mode) {
    if (IS_SHARED && mode !== 'viewer') return; // paylaşım linkiyle builder'a geçiş yok

    if (mode === 'viewer') {
        const start = findStartNode();
        if (!start) {
            alert('Viewer için önce haritaya en az bir hotspot (Node) ekleyin.');
            return;
        }
        currentMode = 'viewer';
        clearSelection();

        // Hiçbir şey sürüklenemesin
        stage.find('.secilebilir-obje').forEach(n => {
            draggableMemory.set(n, n.draggable());
            n.draggable(false);
        });

        switchToPanoramaView([start]);
    } else {
        currentMode = 'builder';
        clearSelection();
        exitPanoramaView();
        draggableMemory.forEach((was, n) => n.draggable(was));
        draggableMemory.clear();
    }

    root.classList.toggle('mode-viewer', currentMode === 'viewer');
    root.classList.toggle('mode-builder', currentMode === 'builder');
    if (toggleBtn) {
        toggleBtn.textContent = currentMode === 'viewer' ? '✏️ Builder\'a Dön' : '▶ Viewer\'ı Test Et';
    }
    stage.draw();
}

toggleBtn?.addEventListener('click', () => setMode(isViewer() ? 'builder' : 'viewer'));

// ---- Paylaş ----
shareBtn?.addEventListener('click', async () => {
    const ok = await saveTour({ silent: true });
    if (!ok) return;

    const link = `${location.origin}${location.pathname}?tour=${encodeURIComponent(window.aktifTurId)}`;
    try {
        await navigator.clipboard.writeText(link);
        alert('Paylaşım linki kopyalandı:\n' + link);
    } catch {
        prompt('Linki kopyalayın:', link);
    }
});

// ---- Paylaşım linkiyle açılış ----
async function bootSharedView() {
    root.classList.add('shared-view', 'mode-viewer');
    try {
        const res = await fetch(`${BACKEND_URL}/api/get-tour/${encodeURIComponent(sharedTourId)}`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        applyTourData(await res.json());
        setMode('viewer');
    } catch (err) {
        console.error(err);
        document.body.innerHTML = '<p style="padding:40px;text-align:center;">Bu tur bulunamadı veya yüklenemedi.</p>';
    }
}

if (IS_SHARED) bootSharedView();
else root.classList.add('mode-builder');