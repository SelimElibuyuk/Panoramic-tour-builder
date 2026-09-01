import { getViewer, getModelPlugin } from '/panoromic_visit_builder/frontend/js/panorama/panorama.js';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { stage } from '/panoromic_visit_builder/frontend/js/script.js';
import { openInfoPanel } from '/panoromic_visit_builder/frontend/js/panorama/informationPanel.js';

const VISION_RADIUS = 200; // pixels, adjust as needed
const Offset = 0.1; // radians, adjust to rotate the marker placement around the center node


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
            image: 'assets/icons/indir.png',
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
        // object-obje nodes become real 3D models instead of a flat placeholder image
        const modelPlugin = getModelPlugin();
        if (modelPlugin) {
            modelPlugin.clearAllModels();
        }
        if (!modelPlugin) {
            console.error('addMarker: model plugin not ready yet');
            return;
        }

        const modelUrl = targetNode.getAttr('modelUrl') || 'assets/3dmodels/box.glb'; // <-- this line must exist
        console.log('Placing model at yaw:', yaw, 'pitch:', pitch);
        modelPlugin.addModel({
            id: 'model-' + targetNode._id,
            url: modelUrl,
            yaw,
            pitch: -0.3,
            distance: 4,
            scale: targetNode.getAttr('modelScale') || 1,
            data: {
                targetNodeId: targetNode._id,
                targetNodeRef: targetNode,
                name: targetNode.getAttr('objectName') || 'Object'
            }
        });
        modelPlugin.addEventListener('select-model', (event) => {
            const { hotspotId, data } = event.detail;
            openInfoPanel(data.targetNodeRef);
            console.log('Model selected:', data);
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
            const yaw = Math.atan2(dx, -dy) + Offset; // 0 = up, clockwise positive

            // optional: push pitch down slightly for closer nodes, flatten for far ones
            const pitch = -0.3 - (1 - distance / visionRadius) * 0.3;
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
};


