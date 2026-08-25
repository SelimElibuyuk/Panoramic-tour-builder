import { stage, sidebar2, transformer, hotspottransformer, } from "./script.js";
import { switchToPanoramaView } from "./buttons.js";



stage.on('click tap', function (e) {

    const target = e.target;

    // Sahnedeki boş bir alana tıklanırsa tüm seçimi kaldır
    if (e.target === stage) {
        transformer.nodes([]);
        hotspottransformer.nodes([]);
        sidebar2.style.visibility = 'hidden';
        return;
    }

    if (target.hasName('secilebilir-obje')) {
        transformer.nodes([target]);
        sidebar2.style.visibility = 'visible';
    }

    if (target.hasName('hotspot-obje')) {
        hotspottransformer.nodes([target]);
        sidebar2.style.visibility = 'visible';
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
