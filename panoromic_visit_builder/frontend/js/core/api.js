import { API_BASE } from './config.js';

async function request(path, options = {}) {
    let res;
    try {
        res = await fetch(API_BASE + path, options);
    } catch {
        throw new Error('Sunucuya bağlanılamadı. Backend çalışıyor mu?');
    }
    if (!res.ok) {
        let message = `İstek başarısız (HTTP ${res.status})`;
        try {
            const body = await res.json();
            if (typeof body.detail === 'string') message = body.detail;
        } catch { /* gövde JSON değil */ }
        throw new Error(message);
    }
    return res.status === 204 ? null : res.json();
}

const json = (method, body) => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});

/** İlerleme bildirimi için XHR ile dosya yükler. */
function upload(path, file, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', API_BASE + path);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
            let body = null;
            try { body = JSON.parse(xhr.responseText); } catch { /* boş */ }
            if (xhr.status >= 200 && xhr.status < 300) resolve(body);
            else reject(new Error(body?.detail && typeof body.detail === 'string'
                ? body.detail : `Yükleme başarısız (HTTP ${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Sunucuya bağlanılamadı.'));
        const form = new FormData();
        form.append('file', file);
        xhr.send(form);
    });
}

export const api = {
    listTours: () => request('/api/tours'),
    getTour: (id) => request(`/api/tours/${encodeURIComponent(id)}`),
    createTour: (data) => request('/api/tours', json('POST', data)),
    updateTour: (id, data) => request(`/api/tours/${encodeURIComponent(id)}`, json('PUT', data)),
    deleteTour: (id) => request(`/api/tours/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    listAssets: (kind) => request(`/api/assets/${kind}`),
    uploadAsset: (kind, file, onProgress) => upload(`/api/assets/${kind}`, file, onProgress),
    deleteAsset: (kind, filename) =>
        request(`/api/assets/${kind}/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
};
