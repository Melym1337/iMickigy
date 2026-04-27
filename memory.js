// registry: fileId → { preview, results: { jpeg, webp, png } }
const registry = new Map();

export function setPreviewUrl(fileId, file) {
  const entry = _entry(fileId);
  if (entry.preview) URL.revokeObjectURL(entry.preview);
  entry.preview = URL.createObjectURL(file);
  return entry.preview;
}

export function setFormatUrl(fileId, format, blob) {
  const entry = _entry(fileId);
  if (!entry.results) entry.results = {};
  if (entry.results[format]) URL.revokeObjectURL(entry.results[format]);
  entry.results[format] = URL.createObjectURL(blob);
  return entry.results[format];
}

export function getPreviewUrl(fileId) {
  return registry.get(fileId)?.preview || null;
}

export function getFormatUrl(fileId, format) {
  return registry.get(fileId)?.results?.[format] || null;
}

export function revokeAll(fileId) {
  const entry = registry.get(fileId);
  if (!entry) return;
  if (entry.preview) URL.revokeObjectURL(entry.preview);
  if (entry.results) Object.values(entry.results).forEach(u => u && URL.revokeObjectURL(u));
  registry.delete(fileId);
}

function _entry(fileId) {
  if (!registry.has(fileId)) registry.set(fileId, { preview: null, results: {} });
  return registry.get(fileId);
}

window.addEventListener('beforeunload', () => {
  for (const id of registry.keys()) revokeAll(id);
});
