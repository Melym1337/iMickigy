export function initDropZone({ zone, input, onFiles }) {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dropzone--active');
  });

  zone.addEventListener('dragleave', (e) => {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove('dropzone--active');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dropzone--active');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onFiles(files);
  });

  input.addEventListener('change', () => {
    const files = Array.from(input.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onFiles(files);
    input.value = '';
  });
}
