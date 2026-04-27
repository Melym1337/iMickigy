/**
 * resize-mode.js — режим изменения размера (заглушка).
 * Файлы из state доступны — можно начать работу в любой момент.
 */

import * as state from '../state.js';

export const resizeMode = {
  mount(container) {
    const queue = state.getQueue();

    container.innerHTML = `
      <div class="mode-placeholder">
        <div class="placeholder-icon">⇲</div>
        <div class="placeholder-title">Resize — скоро</div>
        <div class="placeholder-desc">
          Изменение размера изображений без потери качества.
        </div>
        ${queue.length > 0 ? `
          <div class="placeholder-files">
            ${queue.length} файл(ов) уже загружено — будут доступны здесь
          </div>
        ` : ''}
      </div>
    `;
  },

  unmount() {},
};
