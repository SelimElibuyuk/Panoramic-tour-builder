// Küçük arayüz yardımcıları: güvenli DOM oluşturma, bildirim, modal.

/** innerHTML kullanmadan eleman oluşturur (XSS'e karşı güvenli). */
export function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (value == null || value === false) continue;
        if (key === 'class') el.className = value;
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
        else if (value === true) el.setAttribute(key, '');
        else el.setAttribute(key, value);
    }
    for (const child of children.flat()) {
        if (child == null || child === false) continue;
        el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
}

export function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
}

const toastBox = document.getElementById('toasts');

export function toast(message, type = 'info', ms = 3200) {
    const el = h('div', { class: `toast toast-${type}`, role: type === 'error' ? 'alert' : 'status' }, message);
    toastBox.append(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 250);
    }, ms);
}

// ---- Modallar ----
const openModals = [];

export function openModal(overlay) {
    overlay.classList.add('active');
    if (!openModals.includes(overlay)) openModals.push(overlay);
}

export function closeModal(overlay) {
    overlay.classList.remove('active');
    const i = openModals.indexOf(overlay);
    if (i >= 0) openModals.splice(i, 1);
    overlay.dispatchEvent(new CustomEvent('modal-close'));
}

export const anyModalOpen = () => openModals.length > 0;

document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) closeModal(overlay);
    });
    overlay.querySelectorAll('[data-close]').forEach((btn) =>
        btn.addEventListener('click', () => closeModal(overlay)));
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openModals.length) {
        e.stopImmediatePropagation();
        closeModal(openModals[openModals.length - 1]);
    }
}, true);

export function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Klavye kısayollarının yazı alanlarında tetiklenmemesi için. */
export function isTyping(e) {
    const t = e.target;
    return t instanceof HTMLElement &&
        (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
}
