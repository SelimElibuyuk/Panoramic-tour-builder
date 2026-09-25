// --- 1. DOM Elementlerini Seçme ---
const infoPanel = document.getElementById('object-info-panel');
const closeInfoBtn = document.getElementById('close-info-panel');
const infoTitle = infoPanel.querySelector('.info-title');
const infoImage = infoPanel.querySelector('.info-image');
const infoDescription = infoPanel.querySelector('.info-description');
const infoDetailsContainer = infoPanel.querySelector('.info-details');

// Editörün ürettiği HTML'den yalnızca güvenli etiketleri ve boyut sınıflarını geçirir
const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SPAN', 'OL', 'UL', 'LI']);
const ALLOWED_CLASS = /^ql-size-(small|large|huge)$/;

function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out = document.createElement('div');

    (function walk(src, dst) {
        src.childNodes.forEach((n) => {
            if (n.nodeType === Node.TEXT_NODE) {
                dst.appendChild(document.createTextNode(n.textContent));
            } else if (n.nodeType === Node.ELEMENT_NODE) {
                if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
                if (ALLOWED_TAGS.has(n.tagName)) {
                    const el = document.createElement(n.tagName.toLowerCase());
                    n.classList.forEach((c) => { if (ALLOWED_CLASS.test(c)) el.classList.add(c); });
                    walk(n, el);
                    dst.appendChild(el);
                } else {
                    walk(n, dst); // izin verilmeyen etiketi at, içeriğini koru
                }
            }
        });
    })(doc.body, out);

    return out.innerHTML;
}

// --- 2. Paneli Kapatma İşlemleri ---
function closeInfoPanel() {
    infoPanel.classList.remove('active');
}

// X butonuna basınca kapat
closeInfoBtn.addEventListener('click', closeInfoPanel);

// ESC tuşuna basınca paneli kapat (kullanıcı deneyimi için iyidir)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && infoPanel.classList.contains('active')) {
        closeInfoPanel();
    }
});

// --- 3. Paneli Veri ile Doldurma ve Açma Fonksiyonu ---
/**
 * Obje verilerini alıp paneli günceller ve açar.
 * @param {Object} data - Obje verileri { title, image, description, attributes }
 */
export function openInfoPanel(data) {
    // 1. Başlığı ayarla
    infoTitle.textContent = data.title || 'İsimsiz obje';

    // 2. Görseli ayarla (Görsel yoksa elementi gizle)
    if (data.image) {
        infoImage.src = data.image;
        infoImage.style.display = 'block';
    } else {
        infoImage.style.display = 'none';
    }

    // 3. Açıklamayı ayarla
    if (data.descriptionHtml && data.descriptionHtml.trim()) {
        infoDescription.innerHTML = sanitizeHtml(data.descriptionHtml);
    } else {
        infoDescription.textContent = data.description || 'Bu obje için henüz açıklama eklenmemiş.';
    }

    // 4. Detaylar (Özellikler) listesini dinamik oluştur
    infoDetailsContainer.innerHTML = ''; // Eski verileri temizle

    if (data.attributes && Object.keys(data.attributes).length > 0) {
        infoDetailsContainer.style.display = 'block'; // Kutuyu göster

        for (const [key, value] of Object.entries(data.attributes)) {
            const row = document.createElement('div');
            row.className = 'info-row';
            row.innerHTML = `
                <span class="info-label">${key}:</span>
                <span class="info-value">${value}</span>
            `;
            infoDetailsContainer.appendChild(row);
        }
    } else {
        // Eğer objenin ekstra bir özelliği yoksa kutuyu gizle
        infoDetailsContainer.style.display = 'none';
    }

    // 5. Paneli ekranda göster
    infoPanel.classList.add('active');
}