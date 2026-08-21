import { stage, layer, transformer, hotspottransformer, sidebar2 } from './script.js';


const removeObjectButton = document.getElementById('Remove-object-tool');
const addNodebutton = document.getElementById('Node-tool');
const changecolorbutton = document.getElementById('Change-color-tool');
const finishbutton = document.getElementById('Finish');

removeObjectButton.addEventListener('click', function () {
    const seciliObjeler = transformer.nodes().concat(hotspottransformer.nodes());
    seciliObjeler.forEach((obj) => {
        obj.destroy();
    });
    sidebar2.style.visibility = 'hidden';
    transformer.nodes([]);
    hotspottransformer.nodes([]);
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
            name: 'hotspot-obje'
        });

        layer.add(newNode); // add to the layer, not the stage
        stage.off("mousedown touchstart", handler);
    });
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


