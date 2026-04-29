import { state, addFile, getFile, removeFile } from './state.js';

// ═══════════════════════════════════════════════════════════
// 1. ВОРКЕР
// ═══════════════════════════════════════════════════════════
const worker = new Worker('./compress.worker.js');
const pending = new Map(); // taskId → resolve/reject

worker.onmessage = (e) => {
  const { id, status, blob, size } = e.data;
  const cb = pending.get(id);
  if (cb) {
    status === 'success' ? cb.resolve({ blob, size }) : cb.reject(e.data.message);
    pending.delete(id);
  }
};

// Запустить сжатие (возвращает Promise)
function compress(fileId, format) {
  const file = getFile(fileId);
  if (!file) return Promise.reject('File not found');
  
  const taskId = `${fileId}:${format}`;
  return new Promise((resolve, reject) => {
    pending.set(taskId, { resolve, reject });
    worker.postMessage({
      id: taskId,
      file: file.file,
      quality: state.settings.quality,
      format,
    });
  });
}

// ═══════════════════════════════════════════════════════════
// 2. ПАМЯТЬ (ObjectURL)
// ═══════════════════════════════════════════════════════════
const urls = new Map(); // fileId → { preview, results: { jpeg, webp, png } }

function getUrls(fileId) {
  if (!urls.has(fileId)) urls.set(fileId, { preview: null, results: {} });
  return urls.get(fileId);
}

function setPreview(fileId, file) {
  const entry = getUrls(fileId);
  if (entry.preview) URL.revokeObjectURL(entry.preview);
  entry.preview = URL.createObjectURL(file);
  return entry.preview;
}

function setResult(fileId, format, blob) {
  const entry = getUrls(fileId);
  if (entry.results[format]) URL.revokeObjectURL(entry.results[format]);
  entry.results[format] = URL.createObjectURL(blob);
  return entry.results[format];
}

function revokeAll(fileId) {
  const entry = urls.get(fileId);
  if (!entry) return;
  if (entry.preview) URL.revokeObjectURL(entry.preview);
  Object.values(entry.results).forEach(u => u && URL.revokeObjectURL(u));
  urls.delete(fileId);
}

// ═══════════════════════════════════════════════════════════
// 3. ЛОГИКА СЖАТИЯ
// ═══════════════════════════════════════════════════════════
async function processFile(fileId) {
  const file = getFile(fileId);
  if (!file) return;
  
  const formats = state.settings.format === 'all' ? ['jpeg', 'webp', 'png'] : [state.settings.format];
  
  file.status = 'processing';
  renderUI();
  
  // Сжимаем параллельно
  await Promise.all(formats.map(async (fmt) => {
    try {
      const result = await compress(fileId, fmt);
      file.results[fmt] = {
        blob: result.blob,
        size: result.size,
        url: setResult(fileId, fmt, result.blob),
      };
    } catch (err) {
      file.results[fmt] = { error: err };
    }
  }));
  
  file.status = 'done';
  renderUI();
}

// ═══════════════════════════════════════════════════════════
// 4. UI
// ═══════════════════════════════════════════════════════════
const fileListEl = document.getElementById('fileList');

function renderUI() {
  fileListEl.innerHTML = '';
  state.files.forEach(file => {
    const card = createCard(file);
    fileListEl.appendChild(card);
  });
}

function createCard(file) {
  const div = document.createElement('div');
  div.className = 'card';
  
  const preview = getUrls(file.id).preview;
  const isAll = state.settings.format === 'all';
  
  div.innerHTML = `
    <div class="card-header">
      <span class="status">${file.status}</span>
      <button onclick="window.removeFileById('${file.id}')">✕</button>
    </div>
    ${preview ? `<img src="${preview}" class="preview">` : '<div class="preview">...</div>'}
    <div class="name">${file.name}</div>
    <div class="size">${kb(file.originalSize)} KB</div>
    ${isAll ? renderAllFormats(file) : renderSingleFormat(file)}
  `;
  return div;
}

function renderSingleFormat(file) {
  const fmt = state.settings.format;
  const r = file.results[fmt];
  if (!r || !r.blob) return '<div class="waiting">...</div>';
  
  const savings = ((1 - r.size / file.originalSize) * 100).toFixed(1);
  return `
    <div class="single">
      <b>${fmt.toUpperCase()}</b> ${kb(r.size)} KB <span class="savings">${savings > 0 ? '−' : '+'}${Math.abs(savings)}%</span>
    </div>
    <button onclick="window.download('${file.id}', '${fmt}')">⬇ Скачать</button>
  `;
}

function renderAllFormats(file) {
  return `<div class="formats">
    ${['jpeg', 'webp', 'png'].map(fmt => {
      const r = file.results[fmt];
      if (!r || !r.blob) return `<div class="fmt">${fmt.toUpperCase()}<br>...</div>`;
      const savings = ((1 - r.size / file.originalSize) * 100).toFixed(1);
      return `<div class="fmt" onclick="window.download('${file.id}', '${fmt}')">
        <b>${savings > 0 ? '−' : '+'}${Math.abs(savings)}%</b><br>
        ${fmt.toUpperCase()}<br>
        ${kb(r.size)} KB
      </div>`;
    }).join('')}
  </div>`;
}

function kb(bytes) { return (bytes / 1024).toFixed(0); }

// ═══════════════════════════════════════════════════════════
// 5. СОБЫТИЯ
// ═══════════════════════════════════════════════════════════
// Drag & Drop
const workspace = document.getElementById('workspace');
workspace.ondragover = (e) => { e.preventDefault(); workspace.classList.add('active'); };
workspace.ondragleave = () => workspace.classList.remove('active');
workspace.ondrop = (e) => {
  e.preventDefault();
  workspace.classList.remove('active');
  handleFiles(e.dataTransfer.files);
};

// Input
document.getElementById('upload').onchange = (e) => handleFiles(e.target.files);

function handleFiles(fileList) {
  Array.from(fileList).forEach(f => {
    if (!f.type.startsWith('image/')) return;
    const fileData = addFile(f);
    setPreview(fileData.id, f);
    processFile(fileData.id);
  });
  renderUI();
}

// Формат
document.querySelectorAll('.format-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.settings.format = btn.dataset.format;
    // Пересжать все файлы
    state.files.forEach(f => processFile(f.id));
  };
});

// Качество
const qualityRange = document.getElementById('quality');
qualityRange.oninput = () => {
  state.settings.quality = parseFloat(qualityRange.value);
  document.getElementById('qualityValue').textContent = qualityRange.value;
};

// Глобальные функции для onclick в HTML
window.removeFileById = (id) => {
  removeFile(id);
  revokeAll(id);
  renderUI();
};

window.download = (fileId, format) => {
  const file = getFile(fileId);
  const r = file.results[format];
  if (!r?.blob) return;
  
  const url = URL.createObjectURL(r.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name.replace(/\.[^.]+$/, '') + `_compressed.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Скачать всё
document.getElementById('downloadAll').onclick = async () => {
  if (typeof fflate === 'undefined') return alert('fflate не загружен');
  
  const zipData = {};
  state.files.forEach(file => {
    const formats = state.settings.format === 'all' ? ['jpeg', 'webp', 'png'] : [state.settings.format];
    formats.forEach(fmt => {
      const r = file.results[fmt];
      if (r?.blob) {
        const name = file.name.replace(/\.[^.]+$/, '') + `_${fmt}.${fmt}`;
        // fflate работает с ArrayBuffer — конвертируем
        r.blob.arrayBuffer().then(buf => {
          zipData[name] = new Uint8Array(buf);
        });
      }
    });
  });
  
  // Ждём загрузки всех blob
  await new Promise(r => setTimeout(r, 300));
  const zipped = fflate.zipSync(zipData, { level: 0 });
  const blob = new Blob([zipped], { type: 'application/zip' });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'iMickigy_export.zip';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Табы режимов
document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    const mode = tab.dataset.mode;
    if (tab.classList.contains('disabled')) return;
    
    state.currentMode = mode;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Показываем/скрываем разные секции
    document.querySelectorAll('.mode-content').forEach(c => c.style.display = 'none');
    document.getElementById(`mode-${mode}`).style.display = 'block';
  };
});
