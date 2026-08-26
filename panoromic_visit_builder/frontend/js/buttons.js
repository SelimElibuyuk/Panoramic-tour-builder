import { stage, layer, transformer, hotspottransformer, sidebar2, objectsidebar, objecttransformer, visiontransformer } from './script.js';
import { initViewer, showPanorama, resizeViewer, getViewer, onViewerReady } from '/panoromic_visit_builder/frontend/js/panorama/panorama.js';
import { getGroup } from './addgroup.js';
import { addMarker } from '/panoromic_visit_builder/frontend/js/panorama/hotspots.js';
import { addMarkersForNode } from './panorama/hotspots.js';


const addNodebutton = document.getElementById('Node-tool');
const changecolorbutton = document.getElementById('Change-color-tool');
const finishbutton = document.getElementById('Finish');
const switchpanoramabutton = document.getElementById('Switch-panorama-tool');
const setpanoramabutton = document.getElementById('Set-panorama-tool');
const addObjectButton = document.getElementById('Object-tool');
const removeObjectButton = document.querySelectorAll('.remove-item');

const konvaKutusu = document.getElementById('konva-container');
const panoramaKutusu = document.getElementById('container');


let panoramicpath = 'assets/panorama/panorama.jfif';

function setPanoramicpath(path) {
    panoramicpath = path;
}

setPanoramicpath('assets/panorama/Soissons_Cathedral_Interior_360x180,_Picardy,_France_-_Diliff.jpg');

removeObjectButton.forEach(button => {
    button.addEventListener('click', function () {
        const seciliObjeler = transformer.nodes().concat(hotspottransformer.nodes()).concat(objecttransformer.nodes());
        seciliObjeler.forEach((obj) => {
            console.log('Removing object:', obj.getName());
            const target = (obj.hasName('hotspot-obje') || obj.hasName('object-obje'))
                ? obj.getParent()
                : obj;
            target.destroy();
        });
        sidebar2.style.visibility = 'hidden';
        objectsidebar.style.visibility = 'hidden';
        transformer.nodes([]);
        hotspottransformer.nodes([]);
        objecttransformer.nodes([]);
        visiontransformer.nodes([]);
        layer.draw();
    });
})

changecolorbutton?.addEventListener('click', function () {

    const seciliObjeler = transformer.nodes().concat(hotspottransformer.nodes()).concat(objecttransformer.nodes());

    seciliObjeler.forEach(function (obje) {
        const rastgeleRenk = '#' + Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
        obje.fill(rastgeleRenk);
    });

});


finishbutton?.addEventListener('click', function () {
    const butunObjeler = stage.find('.secilebilir-obje');
    getGroup(butunObjeler);

    const yeniObjeler = stage.find('.secilebilir-obje');

    yeniObjeler.forEach(function (obje) {
        obje.draggable(false);
        obje.name('kilitli-obje');
        console.log('Object locked:', obje.getAttrs());
    });

    transformer.nodes([]);
    sidebar2.style.visibility = 'hidden';
    layer.draw();

});

setpanoramabutton?.addEventListener('click', function () {
    const object = hotspottransformer.nodes()[0];
    if (!object) return;

    object.setAttr('panorama', panoramicpath);
    console.log('Panorama path set for object:', panoramicpath);
});


addNodebutton?.addEventListener("click", function () {
    stage.on("mousedown touchstart", function handler(e) {

        const pos = stage.getPointerPosition();
        const group = new Konva.Group({
            x: pos.x,
            y: pos.y,
            name: 'hotspot-group',
            draggable: false,
            id: 'hotspot-group-' + Math.random().toString(36).substr(2, 9),
        });

        const nodeVision = new Konva.Circle({
            x: 0,
            y: 0,
            radius: 200,
            fill: 'rgba(0, 0, 255, 0.1)',
            stroke: 'blue',
            strokeWidth: 1,
            name: 'hotspot-vision',
            listening: false,
            visible: false,
        });

        const newNode = new Konva.Circle({
            x: 0,
            y: 0,
            radius: 10,
            fill: 'lightblue',
            stroke: 'black',
            strokeWidth: 1,
            name: 'hotspot-obje',
            id: 'hotspot-' + Math.random().toString(36).substr(2, 9),
        });

        newNode.setAttr('panorama', 'assets/panorama/panorama.jfif');

        group.add(nodeVision);
        group.add(newNode);
        layer.add(group);

        stage.off("mousedown touchstart", handler);
    });
});



addObjectButton?.addEventListener('click', function () {
    stage.on("mousedown touchstart", function handler(e) {

        const pos = stage.getPointerPosition();

        const newNode = new Konva.Rect({
            x: pos.x - 10,
            y: pos.y - 10,
            width: 20,
            height: 20,
            fill: 'lightblue',
            stroke: 'black',
            strokeWidth: 1,
            name: 'object-obje',
            id: 'object-' + Math.random().toString(36).substr(2, 9),
        });

        layer.add(newNode);
        stage.off("mousedown touchstart", handler);
    });

});



export function switchToPanoramaView([selectedNode]) {

    const path = selectedNode?.getAttr('panorama');
    console.log('Selected node panorama path:', path);
    if (!path) {
        console.warn('No panorama path set on selected node');
        return;
    }

    panoramaKutusu.style.visibility = 'visible';
    konvaKutusu.classList.add('mini-map-modu');
    sidebar2.style.visibility = 'hidden';


    const hotspotNodes = stage.find('.hotspot-obje');
    hotspotNodes.forEach(node => {
        node.setAttr('name', 'panorama-hotspot-obje');
        console.log('Renamed node to panorama-hotspot-obje:', node.getAttr('name'));
        stage.draw();
    });

    if (!getViewer()) {
        initViewer(path);
        onViewerReady(() => addMarkersForNode(selectedNode));

    } else {
        showPanorama(path);
        addMarkersForNode(selectedNode);
    }
    stage.find('.hotspot-vision').forEach(v => v.visible(false));
    showPanorama(path);
    resizeViewer();
    hotspottransformer.nodes([]);
    visiontransformer.nodes([]);
    objecttransformer.nodes([]);

    console.log('Switching to panorama view with path:', path);

};


switchpanoramabutton?.addEventListener('click', function () {
    const selected = hotspottransformer.nodes();
    switchToPanoramaView(selected);
});

