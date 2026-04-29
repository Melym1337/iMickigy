// Все файлы и настройки хранятся здесь
export const state = {
  files: [],  // массив файлов
  settings: { quality: 0.7, format: 'jpeg' }, // jpeg | webp | png | all
  currentMode: 'compress', // compress | resize | collage
};

// Добавить файл
export function addFile(file) {
  const fileData = {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    originalSize: file.size,
    status: 'pending', // pending | processing | done | error
    results: { jpeg: null, webp: null, png: null }, // { blob, size, url }
  };
  state.files.push(fileData);
  return fileData;
}

// Найти файл по id
export function getFile(id) {
  return state.files.find(f => f.id === id);
}

// Удалить файл
export function removeFile(id) {
  state.files = state.files.filter(f => f.id !== id);
  // if (file.results.url) URL.revokeObjectURL(file.results.url);
}
