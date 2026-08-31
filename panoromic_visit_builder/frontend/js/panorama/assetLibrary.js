const modal = document.getElementById('asset-library-modal');
const title = document.getElementById('asset-library-title');
const closeBtn = document.getElementById('close-asset-library-modal');
const fileInput = document.getElementById('asset-file-input');
const grid = document.getElementById('asset-library-grid');

let currentMode = null; // 'panorama' or 'model'
let onSelectCallback = null;

closeBtn.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
});

/**
 * Opens the library modal.
 * @param {'panorama' | 'model'} mode
 * @param {(url: string, filename: string) => void} onSelect - called when user picks an asset
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
        ? 'http://127.0.0.1:8000/api/list-panoramas'
        : 'http://127.0.0.1:8000/api/list-models';

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
            item.className = currentMode === 'model' ? 'asset-item model-item' : 'asset-item';

            const thumbSrc = currentMode === 'panorama'
                ? `http://127.0.0.1:8000${asset.url}`
                : 'assets/icons/3d-model-icon.png'; // placeholder icon for .glb files — add one, or swap for any icon you like

            item.innerHTML = `
                <img src="${thumbSrc}" alt="${asset.filename}" />
                <div class="asset-name">${asset.filename}</div>
            `;

            item.addEventListener('click', () => {
                const fullUrl = `http://127.0.0.1:8000${asset.url}`;
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
        ? 'http://127.0.0.1:8000/api/upload-panorama'
        : 'http://127.0.0.1:8000/api/upload-model';

    const formData = new FormData();
    formData.append('file', file);

    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">Yükleniyor...</p>';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        console.log(result.mesaj);

        fileInput.value = ''; // reset so selecting the same file again still fires 'change'
        loadAssetList(); // refresh grid to show the newly uploaded file
    } catch (error) {
        console.error('Yükleme hatası:', error);
        alert('Dosya yüklenemedi!');
    }
});