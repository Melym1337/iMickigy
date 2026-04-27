/**
 * router.js — переключение между режимами.
 *
 * Каждый режим — это объект с методами:
 *   mount(container)   — отрисовать UI режима в контейнер
 *   unmount()          — убрать UI (но не трогать state/файлы)
 *
 * Файлы в state.js живут независимо от режима.
 * Переключение режима не удаляет файлы.
 */

const modes = {};         // name → { mount, unmount }
let   active = null;      // имя текущего режима
let   contentEl = null;   // DOM-контейнер для контента режима

/**
 * Инициализировать роутер.
 * @param {HTMLElement} container — куда монтируются режимы
 * @param {string} defaultMode   — какой режим открыть первым
 */
export function initRouter(container, defaultMode) {
  contentEl = container;
  if (defaultMode) switchTo(defaultMode);
}

/**
 * Зарегистрировать режим.
 * @param {string} name
 * @param {{ mount: Function, unmount: Function }} mode
 */
export function registerMode(name, mode) {
  modes[name] = mode;
}

/**
 * Переключиться на режим.
 * Сохраняет контекст — state и файлы не трогает.
 */
export function switchTo(name) {
  if (!modes[name]) {
    console.warn(`[router] Режим "${name}" не зарегистрирован`);
    return;
  }
  if (active && modes[active]?.unmount) {
    modes[active].unmount();
  }

  active = name;
  contentEl.innerHTML = ''; // чистим контейнер
  modes[name].mount(contentEl);

  // Подсвечиваем активный таб
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.classList.toggle('tab--active', btn.dataset.mode === name);
  });
}

export function getActive() {
  return active;
}
