export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadZip(files, zipName = 'iMickigy_export.zip') {
  if (typeof fflate === 'undefined') {
    // fflate не загрузился — скачиваем по одному
    files.forEach((f, i) => setTimeout(() => downloadBlob(f.blob, f.filename), i * 300));
    return;
  }
  const zipData = {};
  await Promise.all(files.map(async f => {
    zipData[f.filename] = new Uint8Array(await f.blob.arrayBuffer());
  }));
  const blob = new Blob([fflate.zipSync(zipData, { level: 0 })], { type: 'application/zip' });
  downloadBlob(blob, zipName);
}
