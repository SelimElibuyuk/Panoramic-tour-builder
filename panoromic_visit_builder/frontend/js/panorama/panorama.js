
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { getSelectedNode, switchToPanoramaView } from '/panoromic_visit_builder/frontend/js/buttons.js';
import { addMarkersForNode } from '/panoromic_visit_builder/frontend/js/panorama/hotspots.js';
import { ModelHotspotsPlugin } from '/panoromic_visit_builder/frontend/js/panorama/objects.js';

let viewer = null;
let markersPlugin = null;
let modelPlugin = null;
let pendingReadyCallbacks = [];

function initViewer(defaultPanorama) {
    const container = document.getElementById('container');
    if (!container) {
        throw new Error('panorama.js: #container not found in DOM at init time');
    }

    viewer = new Viewer({
        container,
        panorama: defaultPanorama,
        plugins: [
            [MarkersPlugin, { markers: [] }],
            ModelHotspotsPlugin
        ],
        navbar: [],
        description: 'Panoramic view of the room. Use mouse or touch to look around.',
    });
    viewer.rotate({
        yaw: 1.5,
        pitch: 0,
    });
    modelPlugin = viewer.getPlugin(ModelHotspotsPlugin);
    markersPlugin = viewer.getPlugin(MarkersPlugin);

    viewer.addEventListener('ready', () => console.log('viewer ready'));
    viewer.addEventListener('click', ({ data }) => {
        console.log('yaw:', data.yaw, 'pitch:', data.pitch);
    });
    viewer.addEventListener('ready', () => {
        pendingReadyCallbacks.forEach(cb => cb());
        pendingReadyCallbacks = [];
    }, { once: true });


    return viewer;
}

function showPanorama(path) {
    if (!viewer) {
        throw new Error('panorama.js: viewer not initialized yet — call initViewer first');
    }
    if (!path) {
        console.warn('showPanorama called with no path');
        return;
    }
    console.log('loading panorama:', path);
    viewer.setPanorama(path).catch(err => {
        console.error('Failed to load panorama:', path, err);
    });
}

function resizeViewer() {
    if (viewer) viewer.needsUpdate?.();
}

function getViewer() {
    return viewer;
}

let markerListenerAdded = false; // Sadece bir kez eklenmesini sağlamak için

function onViewerReady(callback) {
    if (!viewer) {
        // viewer doesn't exist yet — queue this callback for later
        pendingReadyCallbacks.push(callback);
        return;
    }
    viewer.addEventListener('ready', callback, { once: true });

    const markersPlugin = viewer.getPlugin('markers');

    // Dinleyici daha önce eklendiyse bu bloğu atla
    if (!markerListenerAdded) {

        markersPlugin.addEventListener('select-marker', ({ marker }) => {
            if (marker.data && marker.data.targetNodeRef) {
                const hedefNode = marker.data.targetNodeRef;
                // Odayı sadece 1 KERE değiştirir
                switchToPanoramaView([hedefNode]);
            } else {
                console.warn('Tıklanan marker bir hedef node referansı içermiyor.');
            }
        });

        // Kilidi kapat, bir daha asla üst üste dinleyici eklenmeyecek
        markerListenerAdded = true;
    }

    const selectedNode = getSelectedNode();
    if (selectedNode) {
        addMarkersForNode(selectedNode);
    }

}

function getModelPlugin() {
    return modelPlugin;
}

export { initViewer, showPanorama, resizeViewer, getViewer, viewer, markersPlugin, modelPlugin, onViewerReady, getModelPlugin };
