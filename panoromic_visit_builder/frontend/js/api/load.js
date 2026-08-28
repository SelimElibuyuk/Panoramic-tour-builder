import { stage, layer, transformer, hotspottransformer, sidebar2, objectsidebar, objecttransformer, visiontransformer } from '/panoromic_visit_builder/frontend/js/script.js';

const btnLoadTours = document.getElementById('btn-load-tours');
const modalOverlay = document.getElementById('tours-modal');
const btnCloseModal = document.getElementById('close-tours-modal');
const toursListContainer = document.getElementById('tours-list-container');

// Modalı kapatma işlemleri
btnCloseModal.addEventListener('click', () => modalOverlay.classList.remove('active'));
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('active');
});

// "Kayıtlı Turlarım" butonuna tıklandığında çalışacak ana kod
btnLoadTours.addEventListener('click', async function () {
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

            // Yükle ve Sil butonlarını aynı div (tour-actions) içine alıyoruz
            card.innerHTML = `
                <div class="tour-info">
                    <h4>${tur.name}</h4>
                    <p>Son Güncelleme: ${tur.tarih}</p>
                </div>
                <div class="tour-actions">
                    <button class="btn-load-tour" data-id="${tur.id}">Yükle</button>
                    <button class="btn-delete-tour" data-id="${tur.id}">Sil</button>
                </div>
            `;

            const yukleBtn = card.querySelector('.btn-load-tour');
            yukleBtn.addEventListener('click', () => {
                console.log("Seçilen Tur Verisi:", tur);

                // 1. Proje Kimliğini Güncelle (Çok Önemli!)
                // Bu sayede projeyi yükleyip tekrar "Kaydet"e bastığında yeni proje oluşturmaz, mevcudu günceller.
                window.aktifTurId = tur.id;
                window.aktifTurAdi = tur.name;

                // 2. Mevcut Sahneyi Temizle (Sadece Çizimleri)
                // Transformer'a ve görünmez seçim kutusuna zarar vermemek için sadece kendi isimlendirdiğimiz objeleri siliyoruz
                const eskiCizimler = stage.find('.secilebilir-obje, .kilitli-obje, .gruplanmis-parca, .panorama-hotspot-obje');
                eskiCizimler.forEach(obje => obje.destroy());

                // Transformer'ın hafızasında kalanları temizle
                transformer.nodes([]);

                // 3. JSON'dan Gelen Veriyi Katmana (Layer) Enjekte Et
                // Konva JSON hiyerarşisi: Stage -> Layer (children[0]) -> Şekiller (children[0].children)
                const kaydedilmisSekiller = tur.konva_data.children[0].children;

                kaydedilmisSekiller.forEach(sekilVerisi => {
                    // Kaydedilmiş eski Transformer kalıntılarını sahneye tekrar basmamak için filtreliyoruz
                    if (sekilVerisi.className !== 'Transformer') {

                        // JSON verisini gerçek, fiziksel Konva objesine dönüştür
                        const yeniObje = Konva.Node.create(sekilVerisi);

                        // Objeyi mevcut katmanımıza (layer) ekle
                        layer.add(yeniObje);
                    }
                });

                // 4. Ekrana Çizdir ve Modalı Kapat
                layer.draw();
                modalOverlay.classList.remove('active');

                // (Opsiyonel) Sidebar'a projenin adını yazdırabilirsin
                // document.getElementById('sidebar-baslik').textContent = aktifTurAdi;

                alert(`'${tur.name}' projesi başarıyla yüklendi!`);
            });

            toursListContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Turları çekerken hata:", error);
        toursListContainer.innerHTML = '<p style="color:red; text-align:center;">Sunucuya bağlanılamadı. Backend açık mı?</p>';
    }
});