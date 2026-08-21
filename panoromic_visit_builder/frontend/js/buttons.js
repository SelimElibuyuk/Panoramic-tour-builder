import { stage, layer, transformer, hotspottransformer, sidebar2 } from './script.js';
import { viewer, markersPlugin, panoramicScreen } from '/panoromic_visit_builder/frontend/js/panorama/panorama.js';


const removeObjectButton = document.getElementById('Remove-object-tool');
const addNodebutton = document.getElementById('Node-tool');
const changecolorbutton = document.getElementById('Change-color-tool');
const finishbutton = document.getElementById('Finish');
const switchpanoramabutton = document.getElementById('Switch-panorama-tool');
const setpanoramabutton = document.getElementById('Set-panorama-tool');



let panoramicpath;

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

    butunObjeler.forEach(function (obje) {
        obje.draggable(false);
        obje.name('kilitli-obje'); // Transform aracını kaldır
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
            radius: 10,
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
    console.log('Switch panorama button clicked');

    const selected = hotspottransformer.nodes();
    const path = selected[0]?.getAttr('panorama');

    panoramicScreen(path);
});