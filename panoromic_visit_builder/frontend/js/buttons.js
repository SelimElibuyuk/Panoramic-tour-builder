import { stage, layer, transformer, hotspottransformer, sidebar2 } from './script.js';
import { initViewer, showPanorama, resizeViewer, viewer } from '/panoromic_visit_builder/frontend/js/panorama/panorama.js';
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
        const newNode = new Konva.Circle({
            x: pos.x,
            y: pos.y,
            radius: 7,
            fill: 'lightblue',
            stroke: 'black',
            strokeWidth: 1,
            name: 'hotspot-obje',
        });

        newNode.setAttr('panorama', 'assets/panorama/panorama.jfif');

        newNode.on('click tap', function (e) {
            hotspottransformer.nodes([newNode]);
            layer.draw();
            sidebar2.style.visibility = 'visible';
            e.cancelBubble = true; // stop it from reaching the stage-level deselect handler below
        });

        layer.add(newNode); // add to the layer, not the stage
        stage.off("mousedown touchstart", handler);
    });
});




switchpanoramabutton.addEventListener('click', function () {
    const selected = hotspottransformer.nodes();
    const path = selected[0]?.getAttr('panorama');
    if (!path) {
        console.warn('No panorama path set on selected node');
        return;
    }

    konvaKutusu.style.visibility = 'hidden';
    panoramaKutusu.style.visibility = 'visible';
    //konvaKutusu.classList.add('mini-map-modu');
    sidebar2.style.visibility = 'hidden';

    if (!getViewer()) {
        initViewer(path);       // create it only the first time
    } else {
        showPanorama(path);     // reuse it after that
    }
    showPanorama(panoramicpath);
    resizeViewer();

    console.log('Switching to panorama view with path:', path);

});