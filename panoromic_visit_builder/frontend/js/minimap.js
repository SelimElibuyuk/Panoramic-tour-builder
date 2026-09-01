
// Get ABSOLUTE points for a node, reusing your existing local-point logic
function getAbsoluteBoundaryPointsForNode(node) {
    let localPoints = [];

    if (node.getClassName() === 'Rect') {
        const w = node.width();
        const h = node.height();
        localPoints = [
            { x: 0, y: 0 },
            { x: w, y: 0 },
            { x: w, y: h },
            { x: 0, y: h }
        ];
    } else if (node.getClassName() === 'Line') {
        const pts = node.points();
        for (let i = 0; i < pts.length; i += 2) {
            localPoints.push({ x: pts[i], y: pts[i + 1] });
        }
    } else if (node.getClassName() === 'Circle') {
        const r = node.radius();
        const corners = 32;
        for (let i = 0; i < corners; i++) {
            const angle = (i * 2 * Math.PI) / corners;
            localPoints.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
        }
    } else {
        return [];
    }

    // Convert local -> absolute using the node's own transform (handles
    // its position, rotation, scale AND any parent group transforms)
    const transform = node.getAbsoluteTransform();
    return localPoints.map(p => transform.point(p));
}

// Compute the bounding box of everything on the layer
function getSceneBoundingBox(layer) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    layer.getChildren().forEach(node => {
        if (!node.visible()) return;
        const absPoints = getAbsoluteBoundaryPointsForNode(node);
        absPoints.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        });
    });

    if (minX === Infinity) return null; // nothing on the layer

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

// The core "crop to fit" function
export function applyMiniMapCrop(stage, layer, miniMapWidth, miniMapHeight, padding = 10) {
    const bbox = getSceneBoundingBox(layer);
    if (!bbox || bbox.width === 0 || bbox.height === 0) return;

    const availableW = miniMapWidth - padding * 2;
    const availableH = miniMapHeight - padding * 2;

    // "contain" scale — fit bbox fully inside the minimap without distortion
    const scale = Math.min(
        availableW / bbox.width,
        availableH / bbox.height
    );

    // center the bbox inside the minimap
    const scaledW = bbox.width * scale;
    const scaledH = bbox.height * scale;
    const offsetX = (miniMapWidth - scaledW) / 2;
    const offsetY = (miniMapHeight - scaledH) / 2;

    stage.scale({ x: scale, y: scale });
    stage.position({
        x: offsetX - bbox.x * scale,
        y: offsetY - bbox.y * scale
    });

    stage.batchDraw();
}

export function restoreFullView(stage) {
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    stage.batchDraw();
}