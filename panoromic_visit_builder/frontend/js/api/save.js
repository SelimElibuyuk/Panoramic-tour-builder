import { stage } from '/panoromic_visit_builder/frontend/js/script.js';


export let aktifTurId = null;
export let aktifTurAdi = null;

const saveMapButton = document.getElementById('Save-tool');

saveMapButton.addEventListener('click', function () {
    console.log("Save button clicked. Preparing to save the map...");
});

function captureStagePreview() {
    // renders the current stage to a PNG data URL for use as a thumbnail
    // pixelRatio controls resolution/size — lower = smaller file, blurrier image
    return stage.toDataURL({
        mimeType: 'image/png',
        pixelRatio: 0.4
    });
}

saveMapButton.addEventListener('click', async function () {
    // 1. Eğer bu yepyeni bir tursa (henüz ID'si yoksa) kullanıcıdan isim isteyelim
    if (!window.aktifTurId) {
        window.aktifTurAdi = prompt("Lütfen bu tur için bir isim girin:", "Yeni Showroom");

        // Eğer kullanıcı isim girmezse veya iptale basarsa kaydetmeyi iptal et
        if (!window.aktifTurAdi) return;

        // Zaman damgası kullanarak eşsiz (unique) bir ID üretiyoruz
        window.aktifTurId = "tour_" + Date.now();
    }

    // 2. Sahnenin anlık görüntüsünü (thumbnail) yakalıyoruz
    const previewImageBase64 = captureStagePreview();

    // 3. Veriyi doğrudan yollamak yerine bir zarfın (JSON) içine koyuyoruz
    const payload = {
        id: window.aktifTurId,
        name: window.aktifTurAdi,
        tarih: new Date().toLocaleString(),
        // stage.toJSON() bize string döner, onu tekrar objeye çeviriyoruz ki 
        // Python tarafında temiz bir JSON ağacı olarak kaydedilsin
        konva_data: JSON.parse(stage.toJSON()),
        // önizleme görselini base64 olarak yolluyoruz, backend bunu dosyaya çevirip
        // yolunu (path) tour_data.json içine kaydedecek
        preview_image_base64: previewImageBase64
    };

    console.log("Gönderilen Veri Paketi:", payload);

    try {
        const response = await fetch('http://127.0.0.1:8000/api/save-map', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // Zarfı paketleyip (stringify) yolluyoruz
            body: JSON.stringify(payload)
        });

        const sonuc = await response.json();
        console.log("Backend'den gelen cevap:", sonuc);
        alert(sonuc.mesaj); // Backend'in "yeni eklendi" veya "güncellendi" mesajını göster

    } catch (error) {
        console.error("Kaydetme hatası:", error);
        alert("Kaydedilemedi! Python sunucusunun açık olduğundan emin ol.");
    }
});