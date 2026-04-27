const listeners = {};

export function on(event, handler) {
  if (!listeners[event]) listeners[event] = new Set();
  listeners[event].add(handler);
  return () => listeners[event].delete(handler);
}

export function emit(event, data) {
  if (!listeners[event]) return;
  listeners[event].forEach(handler => {
    try { handler(data); } catch (err) { console.error(`[EventBus] "${event}":`, err); }
  });
}
