// Obje bilgisi: builder'da Quill ile düzenleme, önizlemede yan panelde gösterim.
import { openModal, closeModal } from '../core/ui.js';

// ---------------------------------------------------------------- editör

const modal = document.getElementById('object-info-modal');
const nameInput = document.getElementById('object-name-input');
const saveBtn = document.getElementById('object-info-save');

let quill = null;
let editingNode = null;
let onSaved = null;

function ensureEditor() {
    quill ??= new Quill('#object-desc-editor', {
        theme: 'snow',
        placeholder: 'Obje hakkında bilgi yazın…',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ size: ['small', false, 'large', 'huge'] }],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['clean'],
            ],
        },
        formats: ['bold', 'italic', 'underline', 'size', 'list'],
    });
    return quill;
}

export function openObjectInfoEditor(node, { onSave } = {}) {
    editingNode = node;
    onSaved = onSave;
    openModal(modal);
    const q = ensureEditor();
    nameInput.value = node.getAttr('objectName') || '';
    const html = node.getAttr('objectDescription') || '';
    if (html) q.setContents(q.clipboard.convert({ html }), 'silent');
    else q.setText('', 'silent');
    nameInput.focus();
}

saveBtn.addEventListener('click', () => {
    if (!editingNode) return;
    const empty = quill.getText().trim() === '';
    editingNode.setAttr('objectName', nameInput.value.trim());
    editingNode.setAttr('objectDescription', empty ? '' : quill.getSemanticHTML());
    onSaved?.(editingNode);
    closeModal(modal);
});

modal.addEventListener('modal-close', () => { editingNode = null; });

// ---------------------------------------------------------------- gösterim

const panel = document.getElementById('object-info-panel');
const panelTitle = panel.querySelector('.info-title');
const panelBody = panel.querySelector('.info-description');

// Editörün ürettiği HTML'den yalnızca güvenli etiketleri ve boyut sınıflarını geçirir
const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SPAN', 'OL', 'UL', 'LI']);
const ALLOWED_CLASS = /^ql-size-(small|large|huge)$/;

function sanitizeInto(html, target) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    (function walk(src, dst) {
        src.childNodes.forEach((n) => {
            if (n.nodeType === Node.TEXT_NODE) {
                dst.append(n.textContent);
            } else if (n.nodeType === Node.ELEMENT_NODE) {
                if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
                if (ALLOWED_TAGS.has(n.tagName)) {
                    const el = document.createElement(n.tagName.toLowerCase());
                    n.classList.forEach((c) => { if (ALLOWED_CLASS.test(c)) el.classList.add(c); });
                    walk(n, el);
                    dst.append(el);
                } else {
                    walk(n, dst); // izin verilmeyen etiketi at, içeriğini koru
                }
            }
        });
    })(doc.body, target);
}

export function showObjectInfo(node) {
    panelTitle.textContent = node.getAttr('objectName') || 'İsimsiz obje';
    panelBody.replaceChildren();
    const html = node.getAttr('objectDescription');
    if (html?.trim()) sanitizeInto(html, panelBody);
    else panelBody.textContent = 'Bu obje için henüz açıklama eklenmemiş.';
    panel.classList.add('active');
}

export function hideObjectInfo() {
    panel.classList.remove('active');
}

document.getElementById('close-info-panel').addEventListener('click', hideObjectInfo);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('active')) hideObjectInfo();
});
