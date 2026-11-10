// Haritadaki üç varlık türü ve bunların oluşturulması / yeniden canlandırılması.
//   room    : Rect | Circle | Line (birleştirilmiş)  attrs: locked
//   hotspot : Group [hotspot-range, hotspot-dot, hotspot-label]  attrs: panorama, label, isStart
//   object  : Rect  attrs: modelUrl, modelScale, modelRotX/Y/Z, modelPitch (derece), objectName, objectDescription
import { contentLayer } from './stage.js';
import { GRID, DEFAULT_RANGE } from '../core/config.js';
import { isViewer } from '../core/state.js';

export const ROOM_FILL = '#cbd5e1';
const HOTSPOT_COLORS = {
    normal: { fill: '#1e293b', stroke: '#ffffff' },
    start: { fill: '#16a34a', stroke: '#ffffff' },
    active: { fill: '#2563eb', stroke: '#bfdbfe' },
    empty: { fill: '#94a3b8', stroke: '#ffffff' },
};

export const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
export const snap = (v) => Math.round(v / GRID) * GRID;
const snapPos = (pos) => ({ x: snap(pos.x), y: snap(pos.y) });

export const isRoom = (n) => n?.hasName?.('room');
export const isHotspot = (n) => n?.hasName?.('hotspot');
export const isObject = (n) => n?.hasName?.('object');
export const kindOf = (n) => (isRoom(n) ? 'room' : isHotspot(n) ? 'hotspot' : isObject(n) ? 'object' : null);

export const rooms = () => contentLayer.find('.room');
export const hotspots = () => contentLayer.find('.hotspot');
export const objects = () => contentLayer.find('.object');

/** Tıklanan Konva şeklinden ait olduğu varlığı bulur. */
export function entityOf(target) {
    let n = target;
    while (n && n !== contentLayer) {
        if (kindOf(n)) return n;
        n = n.getParent();
    }
    return null;
}

export const findById = (id) => (id ? contentLayer.findOne('#' + CSS.escape(id)) : null);

// ------------------------------------------------------------ oluşturma

export function createRoom(shape, attrs) {
    const Cls = { rect: Konva.Rect, circle: Konva.Circle, line: Konva.Line }[shape];
    const node = new Cls({
        fill: ROOM_FILL,
        stroke: '#64748b',
        strokeWidth: 1,
        ...attrs,
        name: 'room',
        locked: false,
    });
    contentLayer.add(node);
    hydrate(node);
    normalizeZOrder();
    return node;
}

export function createHotspot({ x, y }) {
    const group = new Konva.Group({
        ...snapPos({ x, y }),
        name: 'hotspot',
        id: uid('hs'),
        label: '',
        panorama: null,
        isStart: hotspots().length === 0,
    });
    group.add(new Konva.Circle({ name: 'hotspot-range', radius: DEFAULT_RANGE }));
    group.add(new Konva.Circle({ name: 'hotspot-dot', radius: 10 }));
    contentLayer.add(group);
    hydrate(group);
    normalizeZOrder();
    return group;
}

export function createObject({ x, y }) {
    const node = new Konva.Rect({
        x: snap(x) - 10,
        y: snap(y) - 10,
        width: 20,
        height: 20,
        cornerRadius: 4,
        fill: '#f59e0b',
        stroke: '#78350f',
        strokeWidth: 1,
        name: 'object',
        id: uid('obj'),
    });
    contentLayer.add(node);
    hydrate(node);
    normalizeZOrder();
    return node;
}

/** Varlığın kopyasını biraz kaydırarak oluşturur. */
export function duplicate(node) {
    const copy = node.clone({ x: node.x() + 20, y: node.y() + 20 });
    if (isHotspot(copy) || isObject(copy)) copy.id(uid(isHotspot(copy) ? 'hs' : 'obj'));
    if (isHotspot(copy)) copy.setAttr('isStart', false);
    contentLayer.add(copy);
    hydrate(copy);
    normalizeZOrder();
    return copy;
}

// ------------------------------------------------------------ canlandırma

/** JSON'dan yüklenen ya da yeni oluşturulan düğüme davranışlarını ekler
 *  (fonksiyonlar JSON'a yazılmadığı için yüklemeden sonra tekrar gerekir). */
export function hydrate(node) {
    node.dragBoundFunc(snapPos);
    if (isHotspot(node)) {
        if (!node.id()) node.id(uid('hs'));
        let range = hotspotRange(node);
        if (!range) {
            range = new Konva.Circle({ name: 'hotspot-range', radius: DEFAULT_RANGE });
            node.add(range);
        }
        range.setAttrs({
            fill: 'rgba(37, 99, 235, 0.08)',
            stroke: '#2563eb',
            strokeWidth: 1,
            dash: [6, 4],
            listening: false,
            visible: false,
        });
        range.moveToBottom();
        let label = node.findOne('.hotspot-label');
        if (!label) {
            label = new Konva.Text({ name: 'hotspot-label', listening: false });
            node.add(label);
        }
        label.setAttrs({ fontSize: 12, fontFamily: 'Manrope, sans-serif', fontStyle: '600', fill: '#0f172a', y: 14 });
        styleHotspot(node);
    } else if (isObject(node)) {
        if (!node.id()) node.id(uid('obj'));
    }
    setEditable(node, !isViewer());
}

export function setEditable(node, editable) {
    const locked = isRoom(node) && node.getAttr('locked');
    node.draggable(editable && !locked);
}

export function hotspotDot(group) { return group.findOne('.hotspot-dot'); }
export function hotspotRange(group) { return group.findOne('.hotspot-range'); }
export function hotspotRadius(group) {
    const r = hotspotRange(group);
    return r ? r.radius() * Math.abs(r.scaleX()) : DEFAULT_RANGE;
}

export function hotspotTitle(group, index) {
    const label = group.getAttr('label');
    if (label) return label;
    const i = index ?? hotspots().indexOf(group);
    return `Nokta ${i + 1}`;
}

let activeHotspotId = null;
export function setActiveHotspot(group) {
    activeHotspotId = group?.id() ?? null;
    hotspots().forEach(styleHotspot);
}

export function styleHotspot(group) {
    const dot = hotspotDot(group);
    if (!dot) return;
    const colors = group.id() === activeHotspotId ? HOTSPOT_COLORS.active
        : !group.getAttr('panorama') ? HOTSPOT_COLORS.empty
            : group.getAttr('isStart') ? HOTSPOT_COLORS.start
                : HOTSPOT_COLORS.normal;
    dot.setAttrs({ radius: 10, fill: colors.fill, stroke: colors.stroke, strokeWidth: 2.5, shadowColor: 'black', shadowBlur: 4, shadowOpacity: 0.25 });
    const label = group.findOne('.hotspot-label');
    if (label) {
        label.text(group.getAttr('label') || '');
        label.offsetX(label.width() / 2);
    }
}

/** Odalar altta, noktalar ve objeler üstte kalsın. */
export function normalizeZOrder() {
    objects().forEach((n) => n.moveToTop());
    hotspots().forEach((n) => n.moveToTop());
}

/** Bir objenin harita (katman) koordinatlarındaki merkez noktası.
 *  Sahne ölçeğinden (küçük harita yakınlaştırması) etkilenmez. */
export function objectCenter(node) {
    return node.getTransform().point({ x: node.width() / 2, y: node.height() / 2 });
}
