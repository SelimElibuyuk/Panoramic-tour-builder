import { objecttransformer } from '/panoromic_visit_builder/frontend/js/script.js';

const modal = document.getElementById('object-info-modal');
const nameInput = document.getElementById('object-name-input');
const openBtn = document.getElementById('Set-info-tool');
const saveBtn = document.getElementById('object-info-save');
const cancelBtn = document.getElementById('object-info-cancel');
const closeBtn = document.getElementById('close-object-info-modal');


let quill = null;
let editingNode = null;

function ensureEditor() {
    if (quill) return quill;
    quill = new Quill('#object-desc-editor', {
        theme: 'snow',
        placeholder: 'Obje hakkında bilgi yazın…',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ size: ['small', false, 'large', 'huge'] }],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['clean']
            ]
        },
        formats: ['bold', 'italic', 'underline', 'size', 'list']
    });
    return quill;
}

function closeModal() {
    modal.classList.remove('active');
    editingNode = null;
}

openBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const node = objecttransformer.nodes()[0];
    if (!node) return;
    editingNode = node;

    modal.classList.add('active');
    const q = ensureEditor();

    nameInput.value = node.getAttr('objectName') || '';
    const html = node.getAttr('objectDescription') || '';
    if (html) {
        q.setContents(q.clipboard.convert({ html }), 'silent');
    } else {
        q.setText('', 'silent');
    }
    nameInput.focus();
});

saveBtn.addEventListener('click', () => {
    if (!editingNode) return;
    const isEmpty = quill.getText().trim() === '';
    editingNode.setAttr('objectName', nameInput.value.trim());
    editingNode.setAttr('objectDescription', isEmpty ? '' : quill.getSemanticHTML());
    closeModal();
});

cancelBtn.addEventListener('click', closeModal);
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
});