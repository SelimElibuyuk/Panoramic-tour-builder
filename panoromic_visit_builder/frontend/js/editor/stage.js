import { CANVAS_W, CANVAS_H, GRID } from '../core/config.js';

// İçerik (kaydedilen) ve arayüz (transformer, seçim kutusu, görüş konisi)
// ayrı katmanlarda: böylece kayda yardımcı nesneler karışmaz.
export const stage = new Konva.Stage({
    container: 'konva-container',
    width: CANVAS_W,
    height: CANVAS_H,
});

export const contentLayer = new Konva.Layer();
export const uiLayer = new Konva.Layer();
stage.add(contentLayer, uiLayer);

const snap = (v) => Math.round(v / GRID) * GRID;

// Odalar: ızgaraya oturan boyutlandırma (yalnızca eksenlere hizalıyken)
export const roomTransformer = new Konva.Transformer({
    rotationSnaps: [0, 90, 180, 270],
    rotationSnapTolerance: 5,
    keepRatio: false,
    anchorSize: 9,
    anchorCornerRadius: 2,
    borderStroke: '#3b82f6',
    anchorStroke: '#3b82f6',
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right',
        'top-center', 'bottom-center', 'middle-left', 'middle-right'],
    boundBoxFunc(oldBox, newBox) {
        if (Math.abs(oldBox.rotation - newBox.rotation) > 0.001) return newBox;
        const deg = ((newBox.rotation * 180 / Math.PI) % 360 + 360) % 360;
        if (![0, 90, 180, 270, 360].some((a) => Math.abs(deg - a) < 0.5)) return newBox;

        let left = newBox.x, top = newBox.y;
        let right = newBox.x + newBox.width, bottom = newBox.y + newBox.height;
        if (Math.abs(oldBox.x - newBox.x) > 0.1) left = snap(left);
        if (Math.abs(oldBox.y - newBox.y) > 0.1) top = snap(top);
        if (Math.abs(oldBox.x + oldBox.width - right) > 0.1) right = snap(right);
        if (Math.abs(oldBox.y + oldBox.height - bottom) > 0.1) bottom = snap(bottom);
        if (right - left < GRID || bottom - top < GRID) return oldBox;
        return { x: left, y: top, width: right - left, height: bottom - top, rotation: newBox.rotation };
    },
});

// Noktalar ve objeler: sadece seçim çerçevesi
export const pickTransformer = new Konva.Transformer({
    resizeEnabled: false,
    rotateEnabled: false,
    borderStroke: '#3b82f6',
    borderStrokeWidth: 2,
    padding: 4,
});

// Nokta görüş menzili: merkezden orantılı büyütme
export const rangeTransformer = new Konva.Transformer({
    rotateEnabled: false,
    keepRatio: true,
    centeredScaling: true,
    borderStroke: '#2563eb',
    anchorStroke: '#2563eb',
    anchorSize: 9,
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    boundBoxFunc: (oldBox, newBox) => (newBox.width < 60 || newBox.width > 1600 ? oldBox : newBox),
});

uiLayer.add(roomTransformer, pickTransformer, rangeTransformer);

export const selectionRect = new Konva.Rect({
    fill: 'rgba(59,130,246,0.12)',
    stroke: '#3b82f6',
    strokeWidth: 1,
    dash: [4, 4],
    visible: false,
    listening: false,
});
uiLayer.add(selectionRect);

export function pointer() {
    return stage.getPointerPosition() ?? { x: 0, y: 0 };
}

/** Sol tuş ya da dokunma mı? (sağ/orta tuş çizim ve seçim başlatmamalı) */
export function isPrimary(e) {
    const ev = e?.evt ?? e;
    return !ev || typeof ev.button !== 'number' || ev.button === 0;
}

// Tuval üzerinde tarayıcının sağ tık menüsü açılmasın
stage.container().addEventListener('contextmenu', (e) => e.preventDefault());

export function setCursor(cursor) {
    stage.container().style.cursor = cursor || '';
}
