import { stage, layer, transformer, hotspottransformer, objecttransformer, visiontransformer } from './script.js';

export function applyTourData(tur) {
    // Eski çizimleri temizle (hotspot'larda boş grup kalmasın diye group'u siliyoruz)
    stage.find('.secilebilir-obje, .kilitli-obje, .gruplanmis-parca, .hotspot-group, .object-obje')
        .forEach(o => o.destroy());

    const children = tur.konva_data.children[0].children;
    children.forEach(data => {
        if (data.className === 'Transformer') return;
        // selectionRectangle gibi görünmez, isimsiz yardımcı nesneleri atla
        if (data.attrs?.visible === false && !data.attrs?.name) return;
        layer.add(Konva.Node.create(data));
    });

    // Panorama modunda kaydedilmiş olabilecek isim/koni kalıntılarını normalize et
    stage.find('.panorama-hotspot-obje').forEach(n => n.name('hotspot-obje'));
    stage.find('.vision-cone').forEach(n => n.destroy());

    [transformer, hotspottransformer, objecttransformer, visiontransformer].forEach(t => {
        t.nodes([]);
        t.moveToTop();
    });
    layer.draw();
}