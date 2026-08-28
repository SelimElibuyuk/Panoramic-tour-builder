import { getViewer } from '/panoromic_visit_builder/frontend/js/panorama/panorama.js';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { stage, layer, transformer, hotspottransformer, sidebar2 } from '/panoromic_visit_builder/frontend/js/script.js';
import { switchToPanoramaView } from '/panoromic_visit_builder/frontend/js/buttons.js';

const VISION_RADIUS = 200; // pixels, adjust as needed


export function addMarker(yaw, pitch, targetNode = null) {
    const viewer = getViewer();
    if (!viewer) {
        console.error('addMarker called before viewer was initialized');
        return;
    }
    const markersPlugin = viewer.getPlugin(MarkersPlugin);
    if (targetNode.hasName('panorama-hotspot-obje')) {
        markersPlugin.addMarker({
            id: targetNode ? 'marker-' + targetNode._id : 'marker-' + Math.random(),
            position: { yaw, pitch },
            image: 'assets/models/marker.png',
            size: { width: 32, height: 32 },
            anchor: 'bottom center',
            tooltip: targetNode ? (targetNode.getAttr('panorama') || 'Panoramaya Geç') : 'Generated pin',
            data: {
                generated: true,
                targetNodeId: targetNode ? targetNode._id : null,
                panoramaPath: targetNode ? targetNode.getAttr('panorama') : null,
                targetNodeRef: targetNode
            }
        });
    }
    else {
        markersPlugin.addMarker({
            id: targetNode ? 'marker-' + targetNode._id : 'marker-' + Math.random(),
            position: { yaw, pitch },
            image: 'assets/models/placeholder.jpg',
            size: { width: 32, height: 32 },
            anchor: 'bottom center',
            data: {
                generated: true,
                targetNodeId: targetNode ? targetNode._id : null,
                targetNodeRef: targetNode
            }
        });
    }
}

export function findRadiusForNode(centerNode) {
    const centerGroup = (typeof centerNode.findOne === 'function')
        ? centerNode
        : (centerNode.getParent() || centerNode);

    const visionCircle = (typeof centerGroup.findOne === 'function')
        ? centerGroup.findOne('.hotspot-vision')
        : null;

    const visionRadius = visionCircle
        ? visionCircle.radius() * visionCircle.getAbsoluteScale().x
        : VISION_RADIUS;
    return visionRadius;
}

function findMarkerLocations(centerNode) {

    const centerGroup = (typeof centerNode.findOne === 'function')
        ? centerNode
        : (centerNode.getParent() || centerNode);

    const centerPos = centerGroup.getAbsolutePosition();

    const visionRadius = findRadiusForNode(centerNode);
    const allHotspots = stage.find('.panorama-hotspot-obje').concat(stage.find('.object-obje'));
    const nearby = [];

    allHotspots.forEach((node) => {
        if (node === centerNode) return;

        const pos = node.getAbsolutePosition();

        const dx = pos.x - centerPos.x;
        const dy = pos.y - centerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= visionRadius && distance > 0) {
            // bearing from center node to this node, in radians
            // atan2(dy, dx): 0 = east, PI/2 = south (screen coords)
            // shift so 0 = "up/north" to feel more natural for a panorama yaw, adjust as needed
            const yaw = Math.atan2(dx, -dy); // 0 = up, clockwise positive

            // optional: push pitch down slightly for closer nodes, flatten for far ones
            const pitch = -0.1 - (1 - distance / visionRadius) * 0.3;
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


