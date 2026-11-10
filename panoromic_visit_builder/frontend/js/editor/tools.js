// Çizim / yerleştirme araçları. Bir araç seçiliyken haritaya basılınca
// ilgili öğe oluşturulur; Shift basılıysa araç açık kalır.
import { stage, uiLayer, pointer, setCursor, isPrimary } from './stage.js';
import { createRoom, createHotspot, createObject, snap } from './entities.js';
import { setSelection } from './selection.js';
import { commit } from './scene.js';
import { emit } from '../core/events.js';
import { GRID } from '../core/config.js';

const HINTS = {
    rect: 'Dikdörtgen oda: haritada sürükleyerek çizin. (Esc: iptal)',
    circle: 'Daire oda: merkezden dışa doğru sürükleyin. (Esc: iptal)',
    hotspot: 'Panorama noktasını koymak istediğiniz yere tıklayın. (Shift: art arda ekle, Esc: iptal)',
    object: '3D objeyi koymak istediğiniz yere tıklayın. (Shift: art arda ekle, Esc: iptal)',
};

let active = null;
let draft = null;      // çizim sırasında gösterilen geçici şekil
let start = null;
let pressed = false;   // sol tuşla tuval üzerinde basıldı mı

export const activeTool = () => active;

// Oluşturma tıklamasının ardından gelen 'click' olayı seçimi bozmasın
let swallowClick = false;
export function consumeCreatedClick() {
    const v = swallowClick;
    swallowClick = false;
    return v;
}

export function setTool(tool) {
    active = tool && tool === active ? null : tool;
    cancelDraft();
    setCursor(active ? 'crosshair' : '');
    emit('tool', active);
}

export const toolHint = (tool) => HINTS[tool] ?? '';

function cancelDraft() {
    draft?.destroy();
    draft = null;
    start = null;
    pressed = false;
    uiLayer.batchDraw();
}

stage.on('mousedown touchstart', (e) => {
    swallowClick = false;
    if (!active) return;
    // Sağ tık: yarım kalan çizimi ve aracı iptal et
    if (!isPrimary(e)) {
        setTool(null);
        return;
    }
    cancelDraft(); // önceki çizim yarım kaldıysa ortada hayalet şekil bırakma
    pressed = true;
    const p = pointer();
    if (active === 'rect' || active === 'circle') {
        start = { x: snap(p.x), y: snap(p.y) };
        const style = { stroke: '#2563eb', strokeWidth: 1.5, dash: [6, 4], fill: 'rgba(37,99,235,0.1)', listening: false };
        draft = active === 'rect'
            ? new Konva.Rect({ ...start, width: 0, height: 0, ...style })
            : new Konva.Circle({ ...start, radius: 0, ...style });
        uiLayer.add(draft);
    }
});

stage.on('mousemove touchmove', updateDraft);

function updateDraft() {
    if (!draft) return;
    const p = pointer();
    if (active === 'rect') {
        const x2 = snap(p.x), y2 = snap(p.y);
        draft.setAttrs({
            x: Math.min(start.x, x2), y: Math.min(start.y, y2),
            width: Math.abs(x2 - start.x), height: Math.abs(y2 - start.y),
        });
    } else {
        draft.radius(snap(Math.hypot(p.x - start.x, p.y - start.y)));
    }
    uiLayer.batchDraw();
}

stage.on('mouseup touchend', (e) => {
    if (!active || !isPrimary(e) || !pressed) return;
    updateDraft(); // hızlı sürüklemede son mousemove gelmemiş olabilir
    finish(e.evt);
});

// Fare tuvalin dışında bırakılırsa çizimi son görünen haliyle tamamla
window.addEventListener('mouseup', (e) => {
    if (active && pressed && e.button === 0) finish(e);
});

function finish(evt) {
    const keep = evt?.shiftKey;
    const tool = active;
    let node = null;

    if (tool === 'rect' && draft) {
        let { x, y, width, height } = draft.attrs;
        if (width < GRID * 2 || height < GRID * 2) ({ x, y, width, height } = { x: start.x, y: start.y, width: 160, height: 100 });
        node = createRoom('rect', { x, y, width, height });
    } else if (tool === 'circle' && draft) {
        const radius = draft.radius() < GRID * 2 ? 60 : draft.radius();
        node = createRoom('circle', { x: start.x, y: start.y, radius });
    } else if (tool === 'hotspot') {
        node = createHotspot(pointer());
    } else if (tool === 'object') {
        node = createObject(pointer());
    }
    cancelDraft();
    if (!node) return;

    swallowClick = true;
    setSelection([node]);
    commit();
    if (!keep || tool === 'rect' || tool === 'circle') setTool(null);
}
