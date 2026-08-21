import {stage, layer, transformer, hotspottransformer, sidebar2} from './script.js';

const removegroupebutton = document.getElementById('Group-remove-tool');

removegroupebutton.addEventListener('click', function () {
    const objects = transformer.nodes();

    if (objects.length > 0) {
        objects.forEach(function (obje) {
            obje.setAttr('grup_id', null);
        });
        transformer.nodes([]);
    }

});