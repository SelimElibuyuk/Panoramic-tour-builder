import { stage, layer, transformer, hotspottransformer, sidebar2 } from '/panoromic_visit_builder/frontend/js/script.js';
import { getViewer, onViewerReady } from '/panoromic_visit_builder/frontend/js/panorama/panorama.js';
import { getSelectedNode } from '/panoromic_visit_builder/frontend/js/buttons.js';
import { findRadiusForNode } from '/panoromic_visit_builder/frontend/js/panorama/hotspots.js';



function updateVisionCone(node, yaw, radius) {
    const group = node.getParent(); // the hotspot-group at this node's minimap position

    let cone = group.findOne('.vision-cone');
    if (!cone) {
        cone = new Konva.Wedge({
            name: 'vision-cone',
            radius: radius,       // how far the cone reaches on the minimap
            angle: 80,        // cone width in degrees — could scale with FOV/zoom
            fill: 'rgba(255, 255, 0, 0.3)',
            stroke: 'orange',
            strokeWidth: 1,
            listening: false,
        });
        group.add(cone);
        cone.moveToBottom(); // so it sits behind the node dot, not on top
    }

    // Konva angles: 0° = pointing right (east). Panorama yaw: 0 = north typically.
    // Offset by -angle/2 to center the wedge on the yaw direction, and convert
    // panorama yaw (radians, 0=north) into Konva's rotation convention (degrees, 0=east).
    const yawDegrees = (yaw * 180 / Math.PI);
    cone.rotation(yawDegrees - cone.angle() / 2 - 90); // -90 shifts "north" to "up"
    group.getLayer().batchDraw();
}

export function removeVisionCone(node) {
    const group = node.getParent();
    const cone = group.findOne('.vision-cone');
    if (cone) {
        cone.destroy();
    }
}

let visionConeListenersAdded = false;

onViewerReady(() => {
    const viewer = getViewer();

    if (!visionConeListenersAdded) {

        viewer.addEventListener('position-updated', ({ position }) => {
            const selectedNode = getSelectedNode();
            if (selectedNode) {
                const radius = findRadiusForNode(selectedNode);
                updateVisionCone(selectedNode, position.yaw, radius);
            }
        });

        viewer.addEventListener('ready', () => {
            const selectedNode = getSelectedNode();
            if (selectedNode) {
                const radius = findRadiusForNode(selectedNode);
                updateVisionCone(selectedNode, 0, radius);
            }
        });
        visionConeListenersAdded = true;
    }
});