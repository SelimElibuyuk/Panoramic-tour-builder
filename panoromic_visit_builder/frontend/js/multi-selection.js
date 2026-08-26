import { stage, sidebar2, transformer, hotspottransformer, objecttransformer, objectsidebar, visiontransformer, layer } from "./script.js";
import { switchToPanoramaView } from "./buttons.js";

stage.on('click tap', function (e) {

    const target = e.target;

    // Sahnedeki boş bir alana tıklanırsa tüm seçimi kaldır
    if (e.target === stage) {
        stage.find('.hotspot-vision').forEach(v => v.visible(false));
        transformer.nodes([]);
        hotspottransformer.nodes([]);
        visiontransformer.nodes([]);
        objecttransformer.nodes([]);
        sidebar2.style.visibility = 'hidden';
        objectsidebar.style.visibility = 'hidden';
        stage.draw();
        return;
    }

    const konvaKutusu = document.getElementById('konva-container');

    if (konvaKutusu.classList.contains('mini-map-modu')) {
        if (target.hasName('panorama-hotspot-obje')) {
            switchToPanoramaView([target]);
        }
        return;
    }

    if (target.hasName('object-obje')) {
        objecttransformer.nodes([target]);
        objectsidebar.style.visibility = 'visible';
    }

    if (target.hasName('secilebilir-obje')) {
        transformer.nodes([target]);
        sidebar2.style.visibility = 'visible';
    }

    if (target.hasName('hotspot-obje')) {
        stage.find('.hotspot-vision').forEach(v => v.visible(false));

        hotspottransformer.nodes([target]);
        sidebar2.style.visibility = 'visible';

        // show this node's own vision circle
        const parentGroup = target.getParent();
        const vision = parentGroup.findOne('.hotspot-vision');
        if (vision) {
            vision.visible(true);
            vision.moveToTop(); // so it's not hidden under other groups visually

            // attach a transformer to let the user resize it
            visiontransformer.nodes([vision]);
            visiontransformer.moveToTop();
            stage.draw();
        }

        stage.draw();
    }



    // Tıklanan şey bizim isimlendirdiğimiz objelerden biri değilse hiçbir şey yapma
    if (!target.hasName('secilebilir-obje') && !target.hasName('hotspot-obje')) {
        sidebar2.style.visibility = 'hidden';
        return;
    }



    const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    const activeTransformer = target.hasName('hotspot-obje') ? hotspottransformer : transformer;
    const isSelected = activeTransformer.nodes().indexOf(target) >= 0;

    if (!metaPressed && !isSelected) {
        // Tuşa basılmıyorsa: SADECE bu objeyi seç, diğer transformer'ı da temizle
        transformer.nodes([]);
        hotspottransformer.nodes([]);
        activeTransformer.nodes([target]);
    } else if (metaPressed && isSelected) {
        // Zaten seçiliyse: seçimden ÇIKAR
        const nodes = activeTransformer.nodes().slice();
        nodes.splice(nodes.indexOf(target), 1);
        activeTransformer.nodes(nodes);
    } else if (metaPressed && !isSelected) {
        // Seçili değilse: seçime EKLE
        const nodes = activeTransformer.nodes().concat([target]);
        activeTransformer.nodes(nodes);
    }
});
