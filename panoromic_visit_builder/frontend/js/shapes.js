import { stage, layer, transformer, hotspottransformer, sidebar2, gridbound } from './script.js';

const addrectanglebutton = document.getElementById('rectangle-tool');
const addcirclebutton = document.getElementById('Circle-tool');

addrectanglebutton.addEventListener('click', function () {
    const newRectangle = new Konva.Rect({
        x: 50, y: 50, width: 100, height: 50,
        fill: '#8a8a8a',
        draggable: true,
        name: 'secilebilir-obje', // Tüm şekiller bu ismi almalı
        dragBoundFunc: function (pos) {
            return {
                // Objeyi serbest bırakmayıp, en yakın 20'nin katına yuvarlıyoruz
                x: Math.round(pos.x / gridbound) * gridbound,
                y: Math.round(pos.y / gridbound) * gridbound,
            };
        }
    });
    layer.add(newRectangle);
    transformer.nodes([newRectangle]);
});


function newCircle() {
    const newCircle = new Konva.Circle({
        x: 100, y: 100, radius: 50,
        fill: '#8a8a8a',
        draggable: true,
        name: 'secilebilir-obje', // Tüm şekiller bu ismi almalı
        dragBoundFunc: function (pos) {
            return {
                // Objeyi serbest bırakmayıp, en yakın 20'nin katına yuvarlıyoruz
                x: Math.round(pos.x / gridbound) * gridbound,
                y: Math.round(pos.y / gridbound) * gridbound,
            };
        }
    });
    layer.add(newCircle);
    transformer.nodes([newCircle]);
};

addcirclebutton.addEventListener('click', newCircle);


