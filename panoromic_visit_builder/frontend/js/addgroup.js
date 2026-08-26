import { layer, sidebar2, transformer, gridbound } from "./script.js";



export function getGroup(selectedObjects) {
    const seciliObjeler = selectedObjects;

    if (seciliObjeler.length < 2) {
        console.log("Birleştirme yapmak için en az 2 obje seçmelisiniz.");
        return;
    }

    let birlesikCokgen = null;

    // 1. Seçili objelerin tüm köşelerini dinamik olarak topla
    seciliObjeler.forEach(function (obje) {
        let yerelNoktalar = [];

        // DURUM A: Obje henüz birleştirilmemiş saf bir Dikdörtgense (Rect)
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
        // DURUM B: Obje daha önceden birleştirilmiş bir Çokgense/Blob (Line)
        else if (obje.getClassName() === 'Line') {
            // points() bize [x1, y1, x2, y2, ...] şeklinde düz bir dizi verir
            const noktalar = obje.points();
            for (let i = 0; i < noktalar.length; i += 2) {
                yerelNoktalar.push({ x: noktalar[i], y: noktalar[i + 1] });
            }
        }
        // DURUM C: Obje bir Çemberse (Circle)
        else if (obje.getClassName() === 'Circle') {
            const yaricap = obje.radius();
            const koseSayisi = 32; // Gözün yuvarlak algılaması için 32 köşe yeterlidir

            for (let i = 0; i < koseSayisi; i++) {
                // Çember etrafındaki 32 farklı açıyı radyan cinsinden hesaplıyoruz
                const aci = (i * 2 * Math.PI) / koseSayisi;

                // Konva'da çemberin merkezi yerel olarak (0,0) kabul edilir.
                // Trigonometri ile çemberin çizgisindeki noktaları (X, Y) buluyoruz:
                yerelNoktalar.push({
                    x: yaricap * Math.cos(aci),
                    y: yaricap * Math.sin(aci)
                });
            }
        }

        // 2. Yerel noktaları objenin dönüş/büyüklük açılarına göre Sahnede Mutlak (Absolute) konuma çevir
        const transform = obje.getAbsoluteTransform();

        const bolge = yerelNoktalar.map(p => {
            const mutlakNokta = transform.point(p);
            // Çoklu birleşmelerde PolyBool'un çökmemesi için koordinatları yuvarlıyoruz
            return [
                Math.round(mutlakNokta.x * 100) / 100,
                Math.round(mutlakNokta.y * 100) / 100
            ];
        });

        const yeniCokgen = { regions: [bolge], inverted: false };

        // 3. Çokgenleri PolyBool ile eriyik hale getir
        if (!birlesikCokgen) {
            birlesikCokgen = yeniCokgen;
        } else {
            // PolyBool zincirleme (chain) olarak hepsini bir öncekine katarak eritir
            birlesikCokgen = PolyBool.union(birlesikCokgen, yeniCokgen);
        }
    });

    // 4. PolyBool'dan gelen YENİ bölge(ler) ile ekrana nihai Blob'u çiz
    // Not: Objeler birbirine değmiyorsa PolyBool birden fazla ayrı parça döndürebilir, bu döngü onu da çözer.
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
            closed: true, // Uçları kapatıp içini boya
            draggable: true,
            name: 'secilebilir-obje', // Transform'un tanıması için
            dragBoundFunc: function (pos) {
                return {
                    // Objeyi serbest bırakmayıp, en yakın 20'nin katına yuvarlıyoruz
                    x: Math.round(pos.x / gridbound) * gridbound,
                    y: Math.round(pos.y / gridbound) * gridbound,
                };
            }
        });

        layer.add(yeniBlob);
    });

    // 5. Eski parçaları sahneden tamamen sil!
    seciliObjeler.forEach(function (obje) {
        obje.destroy();
    });

    // 6. Seçimi temizle ve ekranı güncelle
    sidebar2.style.visibility = 'hidden';
    transformer.nodes([]);
    layer.draw();
    console.log(layer.getChildren());
};
