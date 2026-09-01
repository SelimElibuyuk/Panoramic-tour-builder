import { layer, sidebar2, transformer, gridbound } from "./script.js";


export function getAbsoluteBoundaryPoints(obje) {
    let yerelNoktalar = [];

    // DURUM A: Rect
    if (obje.getClassName() === 'Rect') {
        const w = obje.width();
        const h = obje.height();
        yerelNoktalar = [
            { x: 0, y: 0 },
            { x: w, y: 0 },
            { x: w, y: h },
            { x: 0, y: h }
        ];
    }
    // DURUM B: Line (Çokgen)
    else if (obje.getClassName() === 'Line') {
        const noktalar = obje.points();
        for (let i = 0; i < noktalar.length; i += 2) {
            yerelNoktalar.push({ x: noktalar[i], y: noktalar[i + 1] });
        }
    }
    // DURUM C: Circle
    else if (obje.getClassName() === 'Circle') {
        const yaricap = obje.radius();
        const koseSayisi = 32;

        for (let i = 0; i < koseSayisi; i++) {
            const aci = (i * 2 * Math.PI) / koseSayisi;
            yerelNoktalar.push({
                x: yaricap * Math.cos(aci),
                y: yaricap * Math.sin(aci)
            });
        }
    }

    // Yerel noktaları objenin dönüş/büyüklük açılarına göre Sahnede Mutlak konuma çevir
    const transform = obje.getAbsoluteTransform();

    return yerelNoktalar.map(p => {
        const mutlakNokta = transform.point(p);
        // PolyBool'un çökmemesi için koordinatları yuvarlıyoruz
        return [
            Math.round(mutlakNokta.x * 100) / 100,
            Math.round(mutlakNokta.y * 100) / 100
        ];
    });
}

export function getGroup(selectedObjects) {
    const seciliObjeler = selectedObjects;

    if (seciliObjeler.length < 2) {
        console.log("Birleştirme yapmak için en az 2 obje seçmelisiniz.");
        return;
    }

    let birlesikCokgen = null;

    // 1. Yeni yazdığımız fonksiyon ile objelerin sınırlarını al ve PolyBool ile birleştir
    seciliObjeler.forEach(function (obje) {
        const bolge = getAbsoluteBoundaryPoints(obje); // <-- AYRILAN KISIM BURADA KULLANILIYOR
        const yeniCokgen = { regions: [bolge], inverted: false };

        if (!birlesikCokgen) {
            birlesikCokgen = yeniCokgen;
        } else {
            birlesikCokgen = PolyBool.union(birlesikCokgen, yeniCokgen);
        }
    });

    // 2. PolyBool'dan gelen YENİ bölge(ler) ile ekrana nihai Blob'u çiz
    birlesikCokgen.regions.forEach(function (bolge) {
        const noktalar = [];
        bolge.forEach(function (nokta) {
            noktalar.push(nokta[0], nokta[1]);
        });

        const yeniBlob = new Konva.Line({
            points: noktalar,
            fill: '#87CEFA',
            stroke: 'black',
            strokeWidth: 1,
            closed: true,
            draggable: true,
            name: 'secilebilir-obje',
            dragBoundFunc: function (pos) {
                return {
                    x: Math.round(pos.x / gridbound) * gridbound,
                    y: Math.round(pos.y / gridbound) * gridbound,
                };
            }
        });

        layer.add(yeniBlob);
    });

    // 3. Eski parçaları sahneden sil!
    seciliObjeler.forEach(function (obje) {
        obje.destroy();
    });

    // 4. Seçimi temizle ve ekranı güncelle
    sidebar2.style.visibility = 'hidden';
    transformer.nodes([]);
    layer.draw();
    console.log(layer.getChildren());
}
