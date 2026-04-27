/**
 * app.js — точка входа.
 * Инициализирует роутер, регистрирует режимы, запускает первый.
 * Вся логика режимов — в своих файлах (*-mode.js).
 */

import { initRouter, registerMode, switchTo } from './router.js';
import { compressMode } from './compress-mode.js';
import { resizeMode }   from './resize-mode.js';

// Регистрируем режимы
registerMode('compress', compressMode);
registerMode('resize',   resizeMode);
// registerMode('collage', collageMode);  ← добавишь когда будет готов

// Навешиваем клики на табы в шапке
document.querySelectorAll('[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    if (btn.classList.contains('tab--disabled')) return; // заблокированный таб
    switchTo(mode);
  });
});

// Запускаем роутер с контейнером и начальным режимом
initRouter(
  document.getElementById('mode-content'),
  'compress'
);
