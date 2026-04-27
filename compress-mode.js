/**
 * compress-mode.js — режим компрессии.
 *
 * mount()   — вставляет свой UI в контейнер и подписывается на события
 * unmount() — отписывается (но файлы в state остаются)
 */

import * as state    from './state.js';
import * as eventBus from './eventBus.js';
import { setPreviewUrl, revokeAll } from './memory.js';
import { downloadZip }              from './download.js';
import { initDropZone }             from './DropZone.js';
import { createFileCard, updateFileCard } from './FileCard.js';
import { initSlider }               from './Slider.js';
import './compress.js'; // регистрирует обработчики file:added / settings:changed

// Отписчики — сохраняем чтобы убрать при unmount
const _unsubs = [];

export const compressMode = {

  mount(container) {
    container.innerHTML = _html();

    // DOM
    const workspaceEl    = container.querySelector('#workspace');
    const uploadInput    = container.querySelector('#upload');
    const qualityRange   = container.querySelector('#qualityRange');
    const qualityOutput  = container.querySelector('#qualityOutput');
    const downloadAllBtn = container.querySelector('#downloadAllBtn');
    const formatBtns     = container.querySelectorAll('.format-btn');
    const fileListEl     = container.querySelector('#fileList');

    // Формат
    let activeFormat = state.getSettings().format || 'jpeg';
    _setFormat(activeFormat, formatBtns);

    formatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        _setFormat(btn.dataset.format, formatBtns);
        activeFormat = btn.dataset.format;
        state.updateSettings({ format: btn.dataset.format });
      });
    });

    // Качество
    qualityRange.value = state.getSettings().quality;
    if (qualityOutput) qualityOutput.value = parseFloat(qualityRange.value).toFixed(2);
    qualityRange.addEventListener('input', () => {
      const val = parseFloat(qualityRange.value);
      if (qualityOutput) qualityOutput.value = val.toFixed(2);
      state.updateSettings({ quality: val });
    });

    // Скачать всё
    downloadAllBtn.addEventListener('click', () => {
      const files = [];
      state.getDone().forEach(item => {
        const fmts = activeFormat === 'all' ? ['jpeg', 'webp', 'png'] : [activeFormat];
        fmts.forEach(fmt => {
          const r = item.results[fmt];
          if (r?.blob) files.push({ blob: r.blob, filename: _outName(item.name, fmt) });
        });
      });
      if (files.length) downloadZip(files);
    });

    // Drop зона
    initDropZone({
      zone: workspaceEl,
      input: uploadInput,
      onFiles: (newFiles) => newFiles.forEach(f => {
        const fileData = state.addFile(f);
        setPreviewUrl(fileData.id, fileData.file);
      }),
    });

    // Слайдер
    initSlider({
      container: container.querySelector('#comparison-container'),
      before:    container.querySelector('#view-before'),
      after:     container.querySelector('#view-after'),
      slider:    container.querySelector('#compare-slider'),
    });

    // Восстановить карточки файлов которые уже были в state
    // (на случай если пользователь переключился и вернулся)
    state.getQueue().forEach(item => {
      fileListEl.appendChild(createFileCard(item));
    });

    // Подписки
    _unsubs.push(
      eventBus.on('file:added', ({ fileData }) => {
        fileListEl.appendChild(createFileCard(fileData));
      }),
      eventBus.on('file:updated', ({ id }) => {
        const card = fileListEl.querySelector(`[data-file-id="${id}"]`);
        const item = state.getFile(id);
        if (card && item) updateFileCard(card, item);
      }),
      eventBus.on('file:removed', ({ id }) => {
        fileListEl.querySelector(`[data-file-id="${id}"]`)?.remove();
        revokeAll(id);
      }),
      eventBus.on('queue:cleared', () => { fileListEl.innerHTML = ''; }),
      eventBus.on('ui:remove-file', ({ id }) => state.removeFile(id)),
    );
  },

  unmount() {
    // Отписываемся от событий
    _unsubs.forEach(unsub => unsub());
    _unsubs.length = 0;
    // DOM чистит router.js через innerHTML = ''
  },
};

// ── Вспомогательные ──────────────────────────

function _setFormat(fmt, btns) {
  btns.forEach(b => b.classList.toggle('active', b.dataset.format === fmt));
}

function _outName(name, fmt) {
  const ext = fmt === 'jpeg' ? 'jpg' : fmt;
  return name.replace(/\.[^.]+$/, '') + '_compressed.' + ext;
}

function _html() {
  return `
    <div id="compress-controls" class="mode-controls">
      <div class="format-group">
        <button class="format-btn" data-format="jpeg">JPEG</button>
        <button class="format-btn" data-format="webp">WebP</button>
        <button class="format-btn" data-format="png">PNG</button>
        <div class="format-divider"></div>
        <button class="format-btn" data-format="all">Select All</button>
      </div>

      <label class="quality-label">
        Качество:
        <input type="range" id="qualityRange" min="0.1" max="1.0" step="0.05" value="0.7">
        <output id="qualityOutput">0.70</output>
      </label>

      <input type="file" id="upload" multiple accept="image/*" style="display:none">
      <button onclick="this.closest('.mode-controls').querySelector('#upload').click()">
        + Добавить фото
      </button>

      <button id="downloadAllBtn">⬇ Скачать всё (zip)</button>
    </div>

    <section id="workspace" class="dropzone">
      <div id="drop-hint" class="drop-hint">
        Перетащите фото сюда или нажмите «+ Добавить фото»
      </div>
      <div id="comparison-container" style="display:none; position:absolute; inset:0; background:#111; border-radius:8px; overflow:hidden;">
        <img id="view-after"  alt="после" style="position:absolute;width:100%;height:100%;object-fit:contain;">
        <img id="view-before" alt="до"    style="position:absolute;width:100%;height:100%;object-fit:contain;z-index:2;clip-path:inset(0 50% 0 0);">
        <input type="range" id="compare-slider" min="0" max="100" value="50"
          style="position:absolute;bottom:16px;left:10%;width:80%;z-index:5;">
        <button style="position:absolute;top:8px;right:8px;z-index:6;background:rgba(0,0,0,.5);color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;"
          onclick="this.closest('#comparison-container').style.display='none'">
          ✕ закрыть
        </button>
      </div>
    </section>

    <div id="fileList" class="file-list"></div>
  `;
}
