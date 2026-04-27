import * as eventBus from './eventBus.js';
import { getPreviewUrl, setPreviewUrl, getFormatUrl } from './memory.js';
import * as state from './state.js';

let els = {};
let currentFileId = null;
let currentFormat = null;

export function initSlider({ container, before, after, slider }) {
  els = { container, before, after, slider };

  slider.addEventListener('input', () => {
    els.before.style.clipPath = `inset(0 ${100 - slider.value}% 0 0)`;
  });

  container.style.display = 'none';

  eventBus.on('comparison:open', ({ id, format }) => openForFile(id, format));

  eventBus.on('file:updated', ({ id }) => {
    if (id !== currentFileId || !currentFormat) return;
    const url = getFormatUrl(id, currentFormat);
    if (url) els.after.src = url;
  });
}

export function openForFile(fileId, format) {
  const item = state.getFile(fileId);
  if (!item) return;

  const resultUrl = getFormatUrl(fileId, format);
  if (!resultUrl) return;

  currentFileId = fileId;
  currentFormat = format;

  let preview = getPreviewUrl(fileId);
  if (!preview) preview = setPreviewUrl(fileId, item.file);

  els.before.src = preview;
  els.after.src  = resultUrl;
  els.slider.value = 50;
  els.before.style.clipPath = 'inset(0 50% 0 0)';
  els.container.style.display = 'block';
}
