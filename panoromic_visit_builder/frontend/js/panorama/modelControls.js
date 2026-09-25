import { objecttransformer, objectsidebar } from '/panoromic_visit_builder/frontend/js/script.js';
import { getModelPlugin } from '/panoromic_visit_builder/frontend/js/panorama/panorama.js';

const DEFAULTS = { scale: 1, x: 0, y: 0, z: 0 };

const inputs = {
    scale: document.getElementById('model-scale'),
    x: document.getElementById('model-rot-x'),
    y: document.getElementById('model-rot-y'),
    z: document.getElementById('model-rot-z'),
};
const resetBtn = document.getElementById('model-reset');

function updateLabels() {
    document.getElementById('model-scale-val').textContent = Number(inputs.scale.value).toFixed(2) + '×';
    ['x', 'y', 'z'].forEach(k => {
        document.getElementById(`model-rot-${k}-val`).textContent = inputs[k].value + '°';
    });
}

// Seçilen objenin kayıtlı değerlerini kaydırıcılara yükle
export function syncModelControls(node) {
    inputs.scale.value = node.getAttr('modelScale') ?? DEFAULTS.scale;
    inputs.x.value = node.getAttr('modelRotX') ?? DEFAULTS.x;
    inputs.y.value = node.getAttr('modelRotY') ?? DEFAULTS.y;
    inputs.z.value = node.getAttr('modelRotZ') ?? DEFAULTS.z;
    updateLabels();
}

// Panoramadaki modele tıklanınca objeyi seç ve paneli aç
export function selectObjectNode(node) {
    if (!node) return;
    objecttransformer.nodes([node]);
    objectsidebar.style.visibility = 'visible';
    syncModelControls(node);
}

function applyToSelected() {
    const node = objecttransformer.nodes()[0];
    updateLabels();
    if (!node) return;

    const scale = parseFloat(inputs.scale.value);
    const rotation = { x: +inputs.x.value, y: +inputs.y.value, z: +inputs.z.value };

    node.setAttr('modelScale', scale);
    node.setAttr('modelRotX', rotation.x);
    node.setAttr('modelRotY', rotation.y);
    node.setAttr('modelRotZ', rotation.z);

    getModelPlugin()?.updateModel('model-' + node._id, { scale, rotation });
}

Object.values(inputs).forEach(el => el.addEventListener('input', applyToSelected));

resetBtn.addEventListener('click', () => {
    inputs.scale.value = DEFAULTS.scale;
    inputs.x.value = DEFAULTS.x;
    inputs.y.value = DEFAULTS.y;
    inputs.z.value = DEFAULTS.z;
    applyToSelected();
});