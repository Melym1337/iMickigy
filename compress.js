import { WorkerPool } from './workerPool.js';
import { setFormatUrl } from './memory.js';
import * as state from './state.js';
import * as eventBus from './eventBus.js';

const pool = new WorkerPool(
  new URL('./compress.worker.js', import.meta.url).href,
  3
);

let debounceTimer = null;

/**
 * Сжать файл в один конкретный формат.
 */
async function compressOneFormat(fileId, format) {
  const item = state.getFile(fileId);
  if (!item) return;

  const taskId = `${fileId}:${format}`;
  pool.cancel(taskId);

  // Отмечаем этот формат как "в процессе"
  state.updateFormatResult(fileId, format, { status: 'processing', blob: null, url: null, size: null });

  try {
    const { quality } = state.getSettings();
    const result = await pool.run(taskId, { file: item.file, quality, format });

    const url = setFormatUrl(fileId, format, result.blob);

    state.updateFormatResult(fileId, format, {
      status: 'done',
      blob: result.blob,
      url,
      size: result.compressedSize,
    });
  } catch (err) {
    if (err.message === 'cancelled') return;
    state.updateFormatResult(fileId, format, {
      status: 'error',
      blob: null,
      url: null,
      size: null,
      error: err.message,
    });
  }
}

/**
 * Запустить сжатие файла — в один формат или во все три параллельно.
 */
export function compressFile(fileId) {
  const { format } = state.getSettings();

  if (format === 'all') {
    // Параллельно все три
    ['jpeg', 'webp', 'png'].forEach(f => compressOneFormat(fileId, f));
  } else {
    compressOneFormat(fileId, format);
  }
}

/**
 * Пересжать все файлы при смене настроек (с дебаунсом).
 */
function recompressAll() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    state.getQueue().forEach(item => compressFile(item.id));
  }, 400);
}

// Новый файл → сразу сжать
eventBus.on('file:added', ({ fileData }) => compressFile(fileData.id));

// Настройки изменились → пересжать всё
eventBus.on('settings:changed', () => recompressAll());
