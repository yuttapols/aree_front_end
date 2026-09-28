const DEFAULT_MAX_SIZE = 960;
const DEFAULT_QUALITY = 0.82;

export function compressImage(
  file: File,
  maxSize = DEFAULT_MAX_SIZE,
  quality = DEFAULT_QUALITY,
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return Promise.resolve(file);
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(
            blob
              ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
              : file,
          );
        },
        'image/jpeg',
        quality,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    image.src = url;
  });
}
