import { stage, layer, transformer, hotspottransformer, sidebar2 } from './script.js';
import { initViewer, showPanorama, resizeViewer, viewer, getViewer } from '/panoromic_visit_builder/frontend/js/panorama/panorama.js';
import { getGroup } from './addgroup.js';


const removeObjectButton = document.getElementById('Remove-object-tool');
const addNodebutton = document.getElementById('Node-tool');
const changecolorbutton = document.getElementById('Change-color-tool');
const finishbutton = document.getElementById('Finish');
const switchpanoramabutton = document.getElementById('Switch-panorama-tool');
const setpanoramabutton = document.getElementById('Set-panorama-tool');

const konvaKutusu = document.getElementById('konva-container');
const panoramaKutusu = document.getElementById('container');


let panoramicpath = 'assets/panorama/panorama.jfif';

function setPanoramicpath(path) {
    panoramicpath = path;
}

setPanoramicpath('assets/panorama/Soissons_Cathedral_Interior_360x180,_Picardy,_France_-_Diliff.jpg');

removeObjectButton.addEventListener('click', function () {
    const seciliObjeler = transformer.nodes().concat(hotspottransformer.nodes());
    seciliObjeler.forEach((obj) => {
        obj.destroy();
    });
    sidebar2.style.visibility = 'hidden';
    transformer.nodes([]);
    hotspottransformer.nodes([]);
});

changecolorbutton.addEventListener('click', function () {

    const seciliObjeler = transformer.nodes().concat(hotspottransformer.nodes());

    if (seciliObjeler !== null) {
        seciliObjeler.forEach(function (obje) {
            const rastgeleRenk = '#' + Math.floor(Math.random() * 16777215).toString(16);
            obje.fill(rastgeleRenk);
        });
    }

});


finishbutton.addEventListener('click', function () {
    const butunObjeler = stage.find('.secilebilir-obje');
    getGroup(butunObjeler);

    const yeniObjeler = stage.find('.secilebilir-obje');

    yeniObjeler.forEach(function (obje) {
        obje.draggable(false);
        obje.name('kilitli-obje'); // Transform aracını kaldır
        console.log('Object locked:', obje.getAttrs());
    });

    transformer.nodes([]);
    sidebar2.style.visibility = 'hidden';
    layer.draw();

});

setpanoramabutton.addEventListener('click', function () {
    const object = hotspottransformer.nodes()[0];
    object.setAttr('panorama', panoramicpath);
    console.log('Panorama path set for object:', panoramicpath);
});


addNodebutton.addEventListener("click", function () {
    stage.on("mousedown touchstart", function handler(e) {

        const pos = stage.getPointerPosition();
        const group = new Konva.Group({
            x: pos.x,
            y: pos.y,
            name: 'hotspot-group',
            draggable: false, // drag the pair together
        });

        const nodeVision = new Konva.Circle({
            x: 0,
            y: 0,
            radius: 100,
            fill: 'rgba(0, 0, 255, 0.1)',
            stroke: 'blue',
            strokeWidth: 1,
            name: 'hotspot-vision',
            listening: false,  // never intercepts clicks itself
            visible: false,    // hidden until its sibling is selected
        });

        const newNode = new Konva.Circle({
            x: 0,
            y: 0,
            radius: 10,
            fill: 'lightblue',
            stroke: 'black',
            strokeWidth: 1,
            name: 'hotspot-obje',
        });

        newNode.setAttr('panorama', 'assets/panorama/panorama.jfif');

        group.add(nodeVision);
        group.add(newNode);
        layer.add(group);

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
    } else {
        showPanorama(path);
    }
    stage.find('.hotspot-vision').forEach(v => v.visible(false));
    showPanorama(path);
    resizeViewer();

    console.log('Switching to panorama view with path:', path);
};


switchpanoramabutton.addEventListener('click', function () {
    const selected = hotspottransformer.nodes();
    switchToPanoramaView(selected);
});
