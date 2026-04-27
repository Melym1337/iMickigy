import * as eventBus from './eventBus.js';
import { getPreviewUrl, getFormatUrl } from './memory.js';
import { downloadBlob } from './download.js';

const FORMAT_LABELS = { jpeg: 'JPEG', webp: 'WebP', png: 'PNG' };

export function createFileCard(fileData) {
  const card = document.createElement('div');
  card.dataset.fileId = fileData.id;
  card.className = 'file-card';
  _render(card, fileData);
  return card;
}

export function updateFileCard(card, fileData) {
  _render(card, fileData);
}

// ─────────────────────────────────────────────
function _render(card, item) {
  const preview = getPreviewUrl(item.id);
  const isAll   = _isAllMode(item);

  card.innerHTML = `
    <div class="card-header">
      <span class="card-status card-status--${item.status}">${_statusLabel(item.status)}</span>
      <button class="card-remove" data-action="remove" title="Удалить">✕</button>
    </div>

    <div class="card-preview">
      ${preview
        ? `<img src="${preview}" alt="${item.name}">`
        : `<div class="card-preview-placeholder">...</div>`}
    </div>

    <div class="card-name" title="${item.name}">${item.name}</div>
    <div class="card-original-size">${_kb(item.originalSize)} KB</div>

    ${isAll ? _renderAllFormats(item) : _renderSingleFormat(item)}
  `;

  card.onclick = (e) => _handleClick(e, item);
}

// ── Режим одного формата ─────────────────────
function _renderSingleFormat(item) {
  // Определяем какой формат сейчас активен
  // (берём первый ненулевой результат)
  const fmt = _activeFormat(item);
  const r   = fmt ? item.results[fmt] : null;

  if (!r || r.status !== 'done') {
    return `<div class="card-single card-single--waiting">
      ${r?.status === 'processing' ? 'сжимается...' : 'ожидает'}
    </div>`;
  }

  const savings = _savings(item.originalSize, r.size);
  return `
    <div class="card-single">
      <span class="card-fmt-label">${FORMAT_LABELS[fmt]}</span>
      <span class="card-size-info">${_kb(r.size)} KB</span>
      <span class="card-savings ${savings >= 0 ? 'savings--pos' : 'savings--neg'}">
        ${savings >= 0 ? '−' : '+'}${Math.abs(savings)}%
      </span>
    </div>
    <div class="card-actions">
      <button data-action="open-comparison" data-format="${fmt}">Сравнить</button>
      <button data-action="download" data-format="${fmt}">⬇ Скачать</button>
    </div>
  `;
}

// ── Режим Select All: строка форматов ────────
function _renderAllFormats(item) {
  const cols = ['jpeg', 'webp', 'png'].map(fmt => {
    const r = item.results[fmt];

    if (!r || r.status === 'pending') {
      return `<div class="fmt-col fmt-col--waiting">
        <span class="fmt-label">${FORMAT_LABELS[fmt]}</span>
        <span class="fmt-size">—</span>
      </div>`;
    }

    if (r.status === 'processing') {
      return `<div class="fmt-col fmt-col--processing">
        <span class="fmt-label">${FORMAT_LABELS[fmt]}</span>
        <span class="fmt-size">...</span>
      </div>`;
    }

    if (r.status === 'error') {
      return `<div class="fmt-col fmt-col--error">
        <span class="fmt-label">${FORMAT_LABELS[fmt]}</span>
        <span class="fmt-size">ошибка</span>
      </div>`;
    }

    const savings = _savings(item.originalSize, r.size);
    const sign    = savings >= 0 ? '−' : '+';
    const cls     = savings >= 0 ? 'savings--pos' : 'savings--neg';

    return `
      <div class="fmt-col fmt-col--done" data-action="download" data-format="${fmt}" title="Скачать ${FORMAT_LABELS[fmt]}">
        <span class="fmt-savings ${cls}">${sign}${Math.abs(savings)}%</span>
        <span class="fmt-label">${FORMAT_LABELS[fmt]}</span>
        <span class="fmt-size">${_kb(r.size)} KB</span>
        <button class="fmt-compare-btn" data-action="open-comparison" data-format="${fmt}">↔</button>
      </div>`;
  }).join('');

  return `<div class="card-all-formats">${cols}</div>`;
}

// ── Обработка кликов ─────────────────────────
function _handleClick(e, item) {
  const btn    = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const format = btn.dataset.format;

  if (action === 'remove') {
    eventBus.emit('ui:remove-file', { id: item.id });
    return;
  }

  if (action === 'open-comparison') {
    e.stopPropagation();
    eventBus.emit('comparison:open', { id: item.id, format });
    return;
  }

  if (action === 'download') {
    e.stopPropagation();
    const r = item.results[format];
    if (r?.blob) {
      const ext  = format === 'jpeg' ? 'jpg' : format;
      const name = item.name.replace(/\.[^.]+$/, '') + `_compressed.${ext}`;
      downloadBlob(r.blob, name);
    }
    return;
  }
}

// ── Хелперы ──────────────────────────────────
function _isAllMode(item) {
  // Если хотя бы два формата имеют результат — режим "all"
  return Object.values(item.results).filter(Boolean).length > 1
    || (item.results.jpeg && item.results.webp)
    || (item.results.jpeg && item.results.png)
    || (item.results.webp && item.results.png);
}

function _activeFormat(item) {
  for (const fmt of ['jpeg', 'webp', 'png']) {
    if (item.results[fmt]) return fmt;
  }
  return null;
}

function _savings(original, compressed) {
  return parseFloat(((1 - compressed / original) * 100).toFixed(1));
}

function _kb(bytes) {
  return (bytes / 1024).toFixed(0);
}

function _statusLabel(s) {
  return { pending: 'ожидает', processing: 'сжимается...', done: 'готово', error: 'ошибка' }[s] || s;
}
