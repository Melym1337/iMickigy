import * as eventBus from './eventBus.js';

let filesQueue = [];
let settings = { quality: 0.7, format: 'jpeg' }; // format: 'jpeg'|'webp'|'png'|'all'

export function addFile(file) {
  const fileData = {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    originalSize: file.size,
    status: 'pending', // pending | processing | done | error
    // Результаты по каждому формату: { blob, url, size, status }
    results: { jpeg: null, webp: null, png: null },
    error: null,
  };
  filesQueue.push(fileData);
  eventBus.emit('file:added', { fileData });
  return fileData;
}

export function updateFile(id, changes) {
  const item = filesQueue.find(f => f.id === id);
  if (!item) return;
  Object.assign(item, changes);
  eventBus.emit('file:updated', { id, changes });
}

/**
 * Обновить результат одного формата и пересчитать общий статус карточки.
 */
export function updateFormatResult(id, format, result) {
  const item = filesQueue.find(f => f.id === id);
  if (!item) return;

  item.results[format] = result;

  // Какие форматы активны сейчас
  const active = settings.format === 'all'
    ? ['jpeg', 'webp', 'png']
    : [settings.format];

  const statuses = active.map(f => item.results[f]?.status || 'pending');

  if (statuses.every(s => s === 'done'))           item.status = 'done';
  else if (statuses.some(s => s === 'error'))      item.status = 'error';
  else if (statuses.some(s => s === 'processing')) item.status = 'processing';
  else                                             item.status = 'pending';

  eventBus.emit('file:updated', { id, changes: { results: item.results, status: item.status } });
}

export function removeFile(id) {
  filesQueue = filesQueue.filter(f => f.id !== id);
  eventBus.emit('file:removed', { id });
}

export function getFile(id)    { return filesQueue.find(f => f.id === id) || null; }
export function getQueue()     { return [...filesQueue]; }
export function getSelected()  { return filesQueue.filter(f => f.isSelected); }
export function getDone()      { return filesQueue.filter(f => f.status === 'done'); }
export function getSettings()  { return { ...settings }; }

export function updateSettings(changes) {
  Object.assign(settings, changes);
  eventBus.emit('settings:changed', { ...settings });
}
