import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export interface VisionImageData {
  base64: string;
  mimeType: string;
}

/** Guess MIME type from a file URI. */
export function mimeTypeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function readViaFetch(uri: string): Promise<VisionImageData> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not read image (${response.status})`);
  }

  const blob = await response.blob();
  const mimeType =
    blob.type && blob.type.startsWith('image/') ? blob.type : mimeTypeFromUri(uri);

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const comma = dataUrl.indexOf(',');
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : '');
    };
    reader.onerror = () => reject(new Error('Failed to encode image as base64'));
    reader.readAsDataURL(blob);
  });

  return { base64, mimeType };
}

/** Read a local or web image URI as base64 + MIME type for vision API requests. */
export async function readImageForVision(imageUri: string): Promise<VisionImageData> {
  const needsFetch =
    Platform.OS === 'web' ||
    imageUri.startsWith('blob:') ||
    imageUri.startsWith('data:') ||
    imageUri.startsWith('http://') ||
    imageUri.startsWith('https://');

  if (needsFetch) {
    return readViaFetch(imageUri);
  }

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { base64, mimeType: mimeTypeFromUri(imageUri) };
}

/** Read a local image URI as base64 for vision API requests. */
export async function readImageAsBase64(imageUri: string): Promise<string> {
  return (await readImageForVision(imageUri)).base64;
}
