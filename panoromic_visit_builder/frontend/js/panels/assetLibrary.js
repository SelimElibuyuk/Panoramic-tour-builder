// Panorama / 3D model kütüphanesi: listeleme, yükleme, seçme, silme.
import { api } from '../core/api.js';
import { mediaUrl, fileLabel } from '../core/config.js';
import { h, toast, openModal, closeModal } from '../core/ui.js';
import { hotspots, objects } from '../editor/entities.js';

const modal = document.getElementById('asset-modal');
const title = document.getElementById('asset-modal-title');
const grid = document.getElementById('asset-grid');
const fileInput = document.getElementById('asset-file-input');
const hint = document.getElementById('asset-upload-hint');
const progress = document.getElementById('asset-upload-progress');

const KINDS = {
    panoramas: {
        title: 'Panorama kütüphanesi',
        accept: '.jpg,.jpeg,.png,.webp,.jfif',
        hint: 'Eşdikdörtgen (2:1) 360° fotoğraf · JPG/PNG/WEBP',
    },
    models: {
        title: '3D model kütüphanesi',
        accept: '.glb',
        hint: 'Tek dosya .glb modeli',
    },
};

let kind = null;
let onSelect = null;
let selectedUrl = null;

/**
 * @param {'panoramas'|'models'} assetKind
 * @param {{ selected?: string, onSelect: (url: string) => void }} opts
 */
export function openAssetLibrary(assetKind, opts) {
    kind = assetKind;
    onSelect = opts.onSelect;
    selectedUrl = opts.selected ?? null;
    title.textContent = KINDS[kind].title;
    fileInput.accept = KINDS[kind].accept;
    hint.textContent = KINDS[kind].hint;
    openModal(modal);
    refresh();
}

function usageCount(url) {
    const nodes = kind === 'panoramas' ? hotspots() : objects();
    const attr = kind === 'panoramas' ? 'panorama' : 'modelUrl';
    return nodes.filter((n) => n.getAttr(attr) === url).length;
}

async function refresh() {
    grid.replaceChildren(h('p', { class: 'grid-message' }, 'Yükleniyor…'));
    let assets;
    try {
        assets = await api.listAssets(kind);
    } catch (err) {
        grid.replaceChildren(h('p', { class: 'grid-message error' }, err.message));
        return;
    }
    if (!assets.length) {
        grid.replaceChildren(h('p', { class: 'grid-message' }, 'Henüz dosya yok. "Dosya yükle" ile ekleyin.'));
        return;
    }
    grid.replaceChildren(...assets.map(renderItem));
}

function renderItem(asset) {
    const thumb = kind === 'panoramas'
        ? h('img', { src: mediaUrl(asset.url), alt: '', loading: 'lazy' })
        : h('div', { class: 'model-thumb' }, h('span', { class: 'model-ico' }));

    const del = h('button', {
        class: 'asset-delete', type: 'button', title: 'Sil', 'aria-label': `${asset.filename} sil`,
        onclick: async (e) => {
            e.stopPropagation();
            const used = usageCount(asset.url);
            const warn = used ? `\n\nBu dosya açık turda ${used} yerde kullanılıyor.` : '';
            if (!confirm(`"${fileLabel(asset.url)}" kalıcı olarak silinsin mi?${warn}`)) return;
            try {
                await api.deleteAsset(kind, asset.filename);
                toast('Dosya silindi.', 'success');
                refresh();
            } catch (err) {
                toast(err.message, 'error');
            }
        },
    }, '×');

    return h('button', {
        class: 'asset-card' + (asset.url === selectedUrl ? ' selected' : ''),
        type: 'button',
        title: asset.filename,
        onclick: () => {
            onSelect?.(asset.url);
            closeModal(modal);
        },
    }, thumb, h('span', { class: 'asset-name' }, fileLabel(asset.url)), del);
}

fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file || !kind) return;
    progress.hidden = false;
    progress.value = 0;
    try {
        const result = await api.uploadAsset(kind, file, (p) => { progress.value = p; });
        toast('Dosya yüklendi.', 'success');
        selectedUrl = result.url;
        await refresh();
    } catch (err) {
        toast(err.message, 'error', 5000);
    } finally {
        progress.hidden = true;
    }
});
