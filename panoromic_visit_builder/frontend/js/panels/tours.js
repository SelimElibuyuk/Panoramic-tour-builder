// Tur kaydetme, açma, silme, paylaşma ve "Turlarım" penceresi.
import { api } from '../core/api.js';
import { state, setState, isDirty } from '../core/state.js';
import { mediaUrl } from '../core/config.js';
import { h, toast, openModal, closeModal, formatDate } from '../core/ui.js';
import { serializeScene, loadScene, capturePreview, resetHistory } from '../editor/scene.js';
import { exitPanorama } from '../panorama/navigation.js';

const modal = document.getElementById('tours-modal');
const grid = document.getElementById('tours-grid');

function setEditParam(id) {
    const url = new URL(location.href);
    if (id) url.searchParams.set('edit', id);
    else url.searchParams.delete('edit');
    history.replaceState(null, '', url);
}

export function shareLink(id) {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('tour', id);
    return url.toString();
}

export async function saveTour({ quiet = false } = {}) {
    if (state.saving) return false;
    const name = state.tourName.trim() || 'İsimsiz tur';
    const scene = serializeScene();
    const sceneText = JSON.stringify(scene);
    const payload = { name, scene, preview: capturePreview() };

    setState({ saving: true });
    try {
        const saved = state.tourId
            ? await api.updateTour(state.tourId, payload)
            : await api.createTour(payload);
        setState({ tourId: saved.id, tourName: saved.name, savedName: saved.name, savedScene: sceneText, currentScene: sceneText });
        setEditParam(saved.id);
        if (!quiet) toast('Tur kaydedildi.', 'success');
        return true;
    } catch (err) {
        toast(`Kaydedilemedi: ${err.message}`, 'error', 6000);
        return false;
    } finally {
        setState({ saving: false });
    }
}

export function confirmDiscard() {
    return !isDirty() || confirm('Kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?');
}

export function newTour() {
    if (!confirmDiscard()) return;
    exitPanorama();
    loadScene(null);
    setState({ tourId: null, tourName: 'Yeni tur', savedName: 'Yeni tur' });
    resetHistory();
    setEditParam(null);
}

export async function openTour(id, { quiet = false } = {}) {
    const tour = await api.getTour(id);
    exitPanorama();
    loadScene(tour.scene);
    setState({ tourId: tour.id, tourName: tour.name, savedName: tour.name });
    resetHistory();
    if (!state.shared) setEditParam(tour.id);
    if (!quiet) toast(`"${tour.name}" açıldı.`, 'success');
    return tour;
}

export async function shareTour() {
    if (!state.tourId || isDirty()) {
        const ok = await saveTour({ quiet: true });
        if (!ok) return;
    }
    const link = shareLink(state.tourId);
    try {
        await navigator.clipboard.writeText(link);
        toast('Paylaşım linki panoya kopyalandı.', 'success');
    } catch {
        prompt('Paylaşım linkini kopyalayın:', link);
    }
}

// ---------------------------------------------------------------- liste

export async function openToursModal() {
    openModal(modal);
    grid.replaceChildren(h('p', { class: 'grid-message' }, 'Yükleniyor…'));
    let tours;
    try {
        tours = await api.listTours();
    } catch (err) {
        grid.replaceChildren(h('p', { class: 'grid-message error' }, err.message));
        return;
    }
    if (!tours.length) {
        grid.replaceChildren(h('p', { class: 'grid-message' }, 'Henüz kaydedilmiş bir tur yok.'));
        return;
    }
    grid.replaceChildren(...tours.map(renderCard));
}

function renderCard(tour) {
    const isCurrent = tour.id === state.tourId;
    const open = async () => {
        if (isCurrent && !isDirty()) { closeModal(modal); return; }
        if (!confirmDiscard()) return;
        try {
            await openTour(tour.id);
            closeModal(modal);
        } catch (err) {
            toast(err.message, 'error');
        }
    };
    const remove = async (e) => {
        e.stopPropagation();
        if (!confirm(`"${tour.name}" turu kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
        try {
            await api.deleteTour(tour.id);
            if (isCurrent) {
                setState({ tourId: null, savedScene: null });
                setEditParam(null);
            }
            toast('Tur silindi.', 'success');
            openToursModal();
        } catch (err) {
            toast(err.message, 'error');
        }
    };
    const copyLink = async (e) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(shareLink(tour.id));
            toast('Paylaşım linki kopyalandı.', 'success');
        } catch {
            prompt('Paylaşım linkini kopyalayın:', shareLink(tour.id));
        }
    };

    return h('article', { class: 'tour-card' + (isCurrent ? ' current' : '') },
        h('button', { class: 'tour-thumb', type: 'button', onclick: open, 'aria-label': `${tour.name} aç` },
            tour.preview_url
                ? h('img', { src: mediaUrl(tour.preview_url), alt: '', loading: 'lazy' })
                : h('span', { class: 'tour-thumb-empty' }, 'Önizleme yok')),
        h('div', { class: 'tour-meta' },
            h('h4', {}, tour.name, isCurrent ? h('span', { class: 'badge' }, 'Açık') : null),
            h('p', {}, formatDate(tour.updated_at))),
        h('div', { class: 'tour-actions' },
            h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: open }, 'Aç'),
            h('button', { class: 'btn btn-sm', type: 'button', onclick: copyLink }, 'Link'),
            h('button', { class: 'btn btn-danger btn-sm', type: 'button', onclick: remove }, 'Sil')));
}
