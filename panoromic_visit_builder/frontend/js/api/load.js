import { stage, layer, transformer, hotspottransformer, sidebar2, objectsidebar, objecttransformer, visiontransformer } from '/panoromic_visit_builder/frontend/js/script.js';

const btnLoadTours = document.getElementById('btn-load-tours');
const modalOverlay = document.getElementById('tours-modal');
const btnCloseModal = document.getElementById('close-tours-modal');
const toursListContainer = document.getElementById('tours-list-container');

// preview modal elements
const previewModal = document.getElementById('tour-preview-modal');
const btnClosePreview = document.getElementById('close-preview-modal');
const previewName = document.getElementById('preview-tour-name');
const previewImage = document.getElementById('preview-tour-image');
const previewDate = document.getElementById('preview-tour-date');
const previewBtnLoad = document.getElementById('preview-btn-load');
const previewBtnDelete = document.getElementById('preview-btn-delete');

let activeTour = null; // the tour object currently shown in the preview modal

// Modalı kapatma işlemleri
btnCloseModal.addEventListener('click', () => modalOverlay.classList.remove('active'));
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('active');
});

btnClosePreview.addEventListener('click', () => previewModal.classList.remove('active'));
previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) previewModal.classList.remove('active');
});

function openPreviewModal(tur) {
    activeTour = tur;
    previewName.textContent = tur.name;
    previewDate.textContent = `Son Güncelleme: ${tur.tarih}`;

    // build the full URL to the backend, since preview_image is a relative path
    previewImage.src = tur.preview_image
        ? `http://127.0.0.1:8000${tur.preview_image}`
        : '';

    previewModal.classList.add('active');
}

function loadTour(tur) {
    console.log("Seçilen Tur Verisi:", tur);

    window.aktifTurId = tur.id;
    window.aktifTurAdi = tur.name;

    const eskiCizimler = stage.find('.secilebilir-obje, .kilitli-obje, .gruplanmis-parca, .panorama-hotspot-obje');
    eskiCizimler.forEach(obje => obje.destroy());

    transformer.nodes([]);

    const kaydedilmisSekiller = tur.konva_data.children[0].children;

    kaydedilmisSekiller.forEach(sekilVerisi => {
        if (sekilVerisi.className !== 'Transformer') {
            const yeniObje = Konva.Node.create(sekilVerisi);
            layer.add(yeniObje);
        }
    });

    layer.draw();
    modalOverlay.classList.remove('active');
    previewModal.classList.remove('active');

    alert(`'${tur.name}' projesi başarıyla yüklendi!`);
}

async function deleteTour(tur) {
    if (!confirm(`'${tur.name}' adlı showroomu silmek istediğinize emin misiniz?`)) return;

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/delete-tour/${tur.id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Silme işlemi başarısız oldu');

        previewModal.classList.remove('active');
        loadToursList();
    } catch (error) {
        console.error("Tur silinirken hata:", error);
        alert("Showroom silinirken bir hata oluştu.");
    }
}

previewBtnLoad.addEventListener('click', () => {
    if (activeTour) loadTour(activeTour);
});

previewBtnDelete.addEventListener('click', () => {
    if (activeTour) deleteTour(activeTour);
});

async function loadToursList() {
    modalOverlay.classList.add('active');
    toursListContainer.innerHTML = '<p style="text-align:center; color:#333;">Turlar yükleniyor...</p>';

    try {
        const response = await fetch('http://127.0.0.1:8000/api/get-tours');
        const turlar = await response.json();

        toursListContainer.innerHTML = '';

        if (turlar.length === 0) {
            toursListContainer.innerHTML = '<p style="text-align:center; color:#888;">Henüz kaydedilmiş bir turunuz bulunmuyor.</p>';
            return;
        }

        turlar.forEach(tur => {
            const card = document.createElement('div');
            card.className = 'tour-card';

            card.innerHTML = `
                <div class="tour-info">
                    <h4>${tur.name}</h4>
                    <p>Son Güncelleme: ${tur.tarih}</p>
                </div>
            `;

            card.addEventListener('click', () => {
                openPreviewModal(tur);
            });

            toursListContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Turları çekerken hata:", error);
        toursListContainer.innerHTML = '<p style="color:red; text-align:center;">Sunucuya bağlanılamadı. Backend açık mı?</p>';
    }
}

// "Kayıtlı Turlarım" butonuna tıklandığında çalışacak ana kod
btnLoadTours.addEventListener('click', loadToursList);