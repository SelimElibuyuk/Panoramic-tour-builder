import { stage, transformer, objecttransformer, visiontransformer, hotspottransformer } from '/panoromic_visit_builder/frontend/js/script.js';
import { exitPanoramaView } from '/panoromic_visit_builder/frontend/js/buttons.js';

const BACKEND_URL = 'http://127.0.0.1:8000';
const saveMapButton = document.getElementById('Save-tool');

function captureStagePreview() {
    return stage.toDataURL({ mimeType: 'image/png', pixelRatio: 0.4 });
}

export async function saveTour({ silent = false } = {}) {
    exitPanoramaView();
    stage.find('.hotspot-vision').forEach(v => v.visible(false));
    [transformer, objecttransformer, visiontransformer, hotspottransformer].forEach(t => t.nodes([]));

    if (!window.aktifTurId) {
        window.aktifTurAdi = prompt("Lütfen bu tur için bir isim girin:", "Yeni Showroom");
        if (!window.aktifTurAdi) return false;
        window.aktifTurId = "tour_" + Date.now();
    }

    const payload = {
        id: window.aktifTurId,
        name: window.aktifTurAdi,
        tarih: new Date().toLocaleString(),
        konva_data: JSON.parse(stage.toJSON()),
        preview_image_base64: captureStagePreview()
    };

    try {
        const response = await fetch(`${BACKEND_URL}/api/save-map`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const sonuc = await response.json();
        if (!silent) alert(sonuc.mesaj);
        return true;
    } catch (error) {
        console.error("Kaydetme hatası:", error);
        alert("Kaydedilemedi! Python sunucusunun açık olduğundan emin ol.");
        return false;
    }
}

saveMapButton.addEventListener('click', () => saveTour());