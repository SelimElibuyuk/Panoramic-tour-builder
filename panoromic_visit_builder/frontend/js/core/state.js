import { emit } from './events.js';

// Uygulamanın paylaşılan durumu (eskiden window.aktifTurId gibi globallerdeydi)
export const state = {
    tourId: null,
    tourName: 'Yeni tur',
    mode: new URLSearchParams(location.search).has('tour') ? 'viewer' : 'builder',
    shared: new URLSearchParams(location.search).has('tour'),
    savedScene: null,  // son kaydedilen sahnenin JSON metni
    savedName: 'Yeni tur',
    currentScene: null,
    saving: false,
};

export function setState(patch) {
    Object.assign(state, patch);
    emit('state', state);
}

export function isDirty() {
    return state.currentScene !== state.savedScene || state.tourName !== state.savedName;
}

export const isViewer = () => state.mode === 'viewer';
