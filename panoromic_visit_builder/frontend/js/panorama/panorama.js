
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';

let viewer = null;
let markersPlugin = null;

function initViewer(defaultPanorama) {
    const container = document.getElementById('container');
    if (!container) {
        throw new Error('panorama.js: #container not found in DOM at init time');
    }

    viewer = new Viewer({
        container,
        panorama: defaultPanorama,
        plugins: [[MarkersPlugin, { markers: [] }]],
        navbar: [],
        description: 'Panoramic view of the room. Use mouse or touch to look around.',
    });

    markersPlugin = viewer.getPlugin(MarkersPlugin);

    viewer.addEventListener('ready', () => console.log('viewer ready'));
    viewer.addEventListener('click', ({ data }) => {
        console.log('yaw:', data.yaw, 'pitch:', data.pitch);
    });

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

function onViewerReady(callback) {
    if (!viewer) return;
    viewer.addEventListener('ready', callback, { once: true });
}

export { initViewer, showPanorama, resizeViewer, getViewer, viewer, markersPlugin, onViewerReady };
