import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';

let path;

const viewer = new Viewer({
    container: document.getElementById('container'),
    panorama: path,
    plugins: [
        [MarkersPlugin, { markers: [] }],
    ],
    navbar: [],

});

function panoramicScreen(path) {
    console.log('panorama path received:', path, typeof path);
    viewer.setPanorama(path);
}

panoramicScreen('assets/panorama/panorama.jfif');

const markersPlugin = viewer.getPlugin(MarkersPlugin);

viewer.addEventListener('ready', () => console.log('viewer ready'));

// debug helper: click anywhere on the sphere to log its yaw/pitch
// use this to calibrate your rotationOffset per panorama
viewer.addEventListener('click', ({ data }) => {
    console.log('yaw:', data.yaw, 'pitch:', data.pitch);
});

export { viewer, markersPlugin, panoramicScreen };