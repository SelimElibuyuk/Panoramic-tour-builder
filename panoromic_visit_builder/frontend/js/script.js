
// 1. Sahne (Stage) ve Katman (Layer) Kurulumu
export const stage = new Konva.Stage({
    container: document.getElementById('konva-container'),
    width: 800,
    height: 600,
});

export const layer = new Konva.Layer();
stage.add(layer);

// Parçaların Izgara üzerindeki hareketi
export const gridbound = 10;

// 2. Transformer (Seçim ve Boyutlandırma Aracı) Kurulumu
export const transformer = new Konva.Transformer({
    rotationSnaps: [0, 90, 180, 270],
    rotationSnapTolerance: 5,
    boundBoxFunc: function (oldBox, newBox) {
        const snap = 10;

        // Rotation itself changing? Don't touch it.
        if (Math.abs(oldBox.rotation - newBox.rotation) > 0.001) {
            return newBox;
        }

        // Konva's rotation here is in radians. Normalize to 0–360 degrees.
        const rotationDeg = ((newBox.rotation * 180 / Math.PI) % 360 + 360) % 360;
        const isAxisAligned = [0, 90, 180, 270].some(
            (angle) => Math.abs(rotationDeg - angle) < 0.5
        );

        // Not axis-aligned (0/90/180/270)? Snapping x/y/width/height directly
        // is not valid math for a rotated box — skip snapping to avoid drift.
        if (!isAxisAligned) {
            return newBox;
        }

        // --- everything below is your original logic, now safe to run ---
        let newLeft = newBox.x;
        let newTop = newBox.y;
        let newRight = newBox.x + newBox.width;
        let newBottom = newBox.y + newBox.height;

        const leftMoved = Math.abs(oldBox.x - newBox.x) > 0.1;
        const topMoved = Math.abs(oldBox.y - newBox.y) > 0.1;
        const rightMoved = Math.abs((oldBox.x + oldBox.width) - (newBox.x + newBox.width)) > 0.1;
        const bottomMoved = Math.abs((oldBox.y + oldBox.height) - (newBox.y + newBox.height)) > 0.1;

        if (leftMoved) newLeft = Math.round(newLeft / snap) * snap;
        if (topMoved) newTop = Math.round(newTop / snap) * snap;
        if (rightMoved) newRight = Math.round(newRight / snap) * snap;
        if (bottomMoved) newBottom = Math.round(newBottom / snap) * snap;

        let finalWidth = newRight - newLeft;
        let finalHeight = newBottom - newTop;

        if (finalWidth < snap) {
            finalWidth = snap;
            if (leftMoved) newLeft = newRight - snap;
        }
        if (finalHeight < snap) {
            finalHeight = snap;
            if (topMoved) newTop = newBottom - snap;
        }

        return {
            x: newLeft,
            y: newTop,
            width: finalWidth,
            height: finalHeight,
            rotation: newBox.rotation
        };

    },
    keepRatio: false,
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'middle-left', 'middle-right'],
});
layer.add(transformer);

export const hotspottransformer = new Konva.Transformer({
    keepRatio: false,
    resizeEnabled: false,
    rotateEnabled: false,
})
layer.add(hotspottransformer);

export const sidebar2 = document.getElementById('side-bar2');