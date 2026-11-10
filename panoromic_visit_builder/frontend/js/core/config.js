// API adresi: <meta name="api-base"> doluysa o, VS Code Live Server (5500)
// ile açıldıysa yerel backend, aksi halde sayfanın kendi adresi kullanılır.
function detectApiBase() {
    const meta = document.querySelector('meta[name="api-base"]')?.content?.trim();
    if (meta) return meta;
    if (location.port === '5500' || location.protocol === 'file:') return 'http://127.0.0.1:8000';
    return '';
}

export const API_BASE = detectApiBase().replace(/\/$/, '');

// Kat planı tuvalinin mantıksal boyutu (CSS ile aynı olmalı)
export const CANVAS_W = 1200;
export const CANVAS_H = 800;
export const GRID = 10;

export const DEFAULT_RANGE = 200;
export const DEFAULT_MODEL_URL = 'assets/3dmodels/box.glb';

// Haritadaki yön ile panorama yaw'ı arasındaki sabit fark (radyan)
export const YAW_OFFSET = 0.1;

/** Backend'in döndürdüğü '/media/...' gibi göreli adresleri tam adrese çevirir. */
export function mediaUrl(url) {
    if (!url) return url;
    if (/^(https?:|data:|blob:)/.test(url)) return url;
    if (url.startsWith('/')) return API_BASE + url;
    return url; // 'assets/...' gibi frontend'e göreli adresler
}

/** Adresten okunabilir dosya adı çıkarır. */
export function fileLabel(url) {
    if (!url) return '';
    const name = decodeURIComponent(url.split('?')[0].split('/').pop());
    return name.replace(/-[0-9a-f]{6}(\.[a-z0-9]+)$/i, '$1');
}
