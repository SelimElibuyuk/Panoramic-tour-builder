// Modüller arası basit olay yolu. Modüllerin birbirini doğrudan import
// etmesinden doğan döngüsel bağımlılıkları önler.
const listeners = new Map();

export function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event).delete(fn);
}

export function emit(event, payload) {
    listeners.get(event)?.forEach((fn) => {
        try { fn(payload); } catch (err) { console.error(`[${event}]`, err); }
    });
}
