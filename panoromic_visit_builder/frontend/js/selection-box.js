import { stage, layer, transformer, hotspottransformer,sidebar2 } from './script.js';

let selectionRectangle = new Konva.Rect({
    fill: 'rgba(0,0,255,0.5)', // Yarı saydam mavi
    visible: false,
});
layer.add(selectionRectangle);

let x1, y1, x2, y2;

stage.on('mousedown touchstart', (e) => {
    // Sadece boş sahneye tıklandıysa seçim kutusunu başlat
    if (e.target !== stage) {
        return;
    }
    e.evt.preventDefault();
    x1 = stage.getPointerPosition().x;
    y1 = stage.getPointerPosition().y;
    x2 = stage.getPointerPosition().x;
    y2 = stage.getPointerPosition().y;

    selectionRectangle.setAttrs({
        x: x1, y: y1, width: 0, height: 0, visible: true,
    });
});

stage.on('mousemove touchmove', (e) => {
    if (!selectionRectangle.visible()) {
        return;
    }
    e.evt.preventDefault();
    x2 = stage.getPointerPosition().x;
    y2 = stage.getPointerPosition().y;

    selectionRectangle.setAttrs({
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
    });
});

stage.on('mouseup touchend', (e) => {
    if (!selectionRectangle.visible()) {
        return;
    }
    e.evt.preventDefault();

    setTimeout(() => {
        selectionRectangle.visible(false);
    });

    var shapes = stage.find('.secilebilir-obje');
    var box = selectionRectangle.getClientRect();
    var selected = shapes.filter((shape) =>
        Konva.Util.haveIntersection(box, shape.getClientRect())
    );
    transformer.nodes(selected);

    sidebar2.style.visibility = selected.length > 0 ? 'visible' : 'hidden';
});

