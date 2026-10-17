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

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',');
export const MEGABYTE = 1024 * 1024;
export const IMAGE_MAX_BYTES = 5 * MEGABYTE;
export const BANNER_IMAGE_MAX_BYTES = 2 * MEGABYTE;
export const BANNER_IMAGE_MAX_DIMENSION = 1920;
export const IMAGE_SOURCE_MAX_BYTES = 20 * MEGABYTE;

export type ImageFileError = 'UNSUPPORTED_MEDIA_TYPE' | 'PAYLOAD_TOO_LARGE' | 'FILE_INVALID';

export function isAllowedImageType(type: string): boolean {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

export async function checkImageFile(
  file: File,
  maxBytes = IMAGE_SOURCE_MAX_BYTES,
): Promise<ImageFileError | null> {
  if (!isAllowedImageType(file.type)) {
    return 'UNSUPPORTED_MEDIA_TYPE';
  }
  if (file.size === 0) {
    return 'FILE_INVALID';
  }
  if (file.size > maxBytes) {
    return 'PAYLOAD_TOO_LARGE';
  }
  return (await hasImageSignature(file)) ? null : 'UNSUPPORTED_MEDIA_TYPE';
}

export function bytesToMegabytes(bytes: number): number {
  return Math.round((bytes / MEGABYTE) * 10) / 10;
}
