const modal = document.getElementById('asset-library-modal');
const title = document.getElementById('asset-library-title');
const closeBtn = document.getElementById('close-asset-library-modal');
const fileInput = document.getElementById('asset-file-input');
const grid = document.getElementById('asset-library-grid');

const BACKEND_URL = 'http://127.0.0.1:8000';

let currentMode = null; // 'panorama' or 'model'
let onSelectCallback = null;

const MODEL_ICON_SVG = `
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#747d8c" stroke-width="1.5">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
</svg>`;

closeBtn.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
});

/**
 * Opens the asset library modal.
 * @param {'panorama' | 'model'} mode
 * @param {(url: string, filename: string) => void} onSelect
 */
export function openAssetLibrary(mode, onSelect) {
    currentMode = mode;
    onSelectCallback = onSelect;
    title.textContent = mode === 'panorama' ? 'Panorama Kütüphanesi' : '3D Model Kütüphanesi';
    modal.classList.add('active');
    loadAssetList();
}

async function loadAssetList() {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">Yükleniyor...</p>';

    const endpoint = currentMode === 'panorama'
        ? `${BACKEND_URL}/api/list-panoramas`
        : `${BACKEND_URL}/api/list-models`;

    try {
        const response = await fetch(endpoint);
        const assets = await response.json();

        grid.innerHTML = '';

        if (assets.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888;">Henüz dosya yok.</p>';
            return;
        }

        assets.forEach(asset => {
            const item = document.createElement('div');
            item.className = 'asset-item';

            const thumbHtml = currentMode === 'panorama'
                ? `<img src="${BACKEND_URL}${asset.url}" alt="${asset.filename}" />`
                : `<div class="model-icon">${MODEL_ICON_SVG}</div>`;

            item.innerHTML = `
                ${thumbHtml}
                <div class="asset-name">${asset.filename}</div>
            `;

            item.addEventListener('click', (e) => {
                e.preventDefault();
                const fullUrl = `${BACKEND_URL}${asset.url}`;
                if (onSelectCallback) onSelectCallback(fullUrl, asset.filename);
                modal.classList.remove('active');
            });

            grid.appendChild(item);
        });

    } catch (error) {
        console.error('Kütüphane yüklenirken hata:', error);
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:red;">Sunucuya bağlanılamadı.</p>';
    }
}

fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    const endpoint = currentMode === 'panorama'
        ? `${BACKEND_URL}/api/upload-panorama`
        : `${BACKEND_URL}/api/upload-model`;

    const formData = new FormData();
    formData.append('file', file);

    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">Yükleniyor...</p>';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);

        const result = await response.json();
        console.log(result.mesaj);

        fileInput.value = ''; // reset so re-selecting the same file still fires 'change'
        loadAssetList();
    } catch (error) {
        console.error('Yükleme hatası:', error);
        alert('Dosya yüklenemedi!');
    }
});