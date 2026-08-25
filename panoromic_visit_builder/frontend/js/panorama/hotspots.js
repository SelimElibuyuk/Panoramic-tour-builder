import { getViewer } from '/panoromic_visit_builder/frontend/js/panorama/panorama.js';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { stage, layer, transformer, hotspottransformer, sidebar2 } from '/panoromic_visit_builder/frontend/js/script.js';


const VISION_RADIUS = 100; // must match your nodeVision circle radius

export function addMarker(yaw, pitch, targetNode = null) {
    const viewer = getViewer();
    if (!viewer) {
        console.error('addMarker called before viewer was initialized');
        return;
    }
    const markersPlugin = viewer.getPlugin(MarkersPlugin);
    markersPlugin.addMarker({
        id: '#' + Math.random(),
        position: { yaw, pitch },
        image: 'assets/models/marker.png',
        size: { width: 32, height: 32 },
        anchor: 'bottom center',
        tooltip: targetNode ? (targetNode.getAttr('panorama') || 'Generated pin') : 'Generated pin',
        data: {
            generated: true,
            targetNodeId: targetNode ? targetNode._id : null,
        },
    });
}

function findMarkerLocations(centerNode) {
    // centerNode is the hotspot circle (or its group) the user is currently viewing from
    const centerGroup = centerNode.hasName('hotspot-obje') ? centerNode.getParent() : centerNode;
    const centerPos = centerGroup.getAbsolutePosition();

    const allHotspots = stage.find('.panorama-hotspot-obje');
    const nearby = [];
    allHotspots.forEach((node) => {
        if (node === centerNode) return;

        const group = node.getParent();
        const pos = group.getAbsolutePosition();

        const dx = pos.x - centerPos.x;
        const dy = pos.y - centerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= VISION_RADIUS && distance > 0) {
            // bearing from center node to this node, in radians
            // atan2(dy, dx): 0 = east, PI/2 = south (screen coords)
            // shift so 0 = "up/north" to feel more natural for a panorama yaw, adjust as needed
            const yaw = Math.atan2(dx, -dy); // 0 = up, clockwise positive

            // optional: push pitch down slightly for closer nodes, flatten for far ones
            const pitch = -0.1 - (1 - distance / VISION_RADIUS) * 0.3;

            nearby.push({ node, distance, yaw, pitch });
        }
    });

    return nearby;
}

export function addMarkersForNode(centerNode) {
    const viewer = getViewer();
    if (!viewer) {
        console.error('addMarkersForNode called before viewer was initialized');
        return;
    }
    const markersPlugin = viewer.getPlugin(MarkersPlugin);
    markersPlugin.clearMarkers(); // clear old markers from the previous panorama first

    const targets = findMarkerLocations(centerNode);
    targets.forEach(({ node, yaw, pitch }) => {
        addMarker(yaw, pitch, node);
    });

    console.log(`Added ${targets.length} marker(s) for node`, centerNode);
}
