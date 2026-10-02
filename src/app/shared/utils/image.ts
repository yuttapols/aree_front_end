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

const IMAGE_SIGNATURES: number[][] = [
  [0xff, 0xd8, 0xff],
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];
const WEBP_MARKER_OFFSET = 8;
const SIGNATURE_BYTES = 12;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

export async function hasImageSignature(file: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, SIGNATURE_BYTES).arrayBuffer());
  return (
    IMAGE_SIGNATURES.some((signature) => startsWith(bytes, signature)) ||
    (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, WEBP_MARKER_OFFSET))
  );
}
