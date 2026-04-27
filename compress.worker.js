self.onmessage = async (e) => {
  const { id, file, quality, format } = e.data;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    bitmap.close();

    const mime = format === 'png' ? 'image/png' : `image/${format}`;
    const opts = format === 'png' ? { type: mime } : { type: mime, quality };
    const blob = await canvas.convertToBlob(opts);

    self.postMessage({ id, status: 'success', blob, compressedSize: blob.size });
  } catch (err) {
    self.postMessage({ id, status: 'error', message: err.message });
  }
};
