import type { AdminRole } from '@behbehani-cpo/shared-types';

/**
 * Pure helpers + constants for media-gallery.component.ts. Extracted so the
 * component file stays under the 500-line cap.
 *
 * Size caps mirror the server's MAX_PHOTO_BYTES / MAX_360_BYTES /
 * MAX_VIDEO_BYTES env values. These are client-side hints only — the server
 * is authoritative (apps/api/src/media/media.service.ts).
 */

export type MediaSubTab = 'photos' | '360' | 'video';

export interface PendingPhoto {
  localId: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'complete' | 'error';
  pct: number;
  photoId?: string;
}

export const MEDIA_WRITE_ROLES: AdminRole[] = [
  'operations_manager',
  'content_editor',
  'general_manager',
  'super_admin',
];

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 10_485_760; // 10 MB
export const MAX_360_BYTES = 262_144_000; // 250 MB
export const MAX_VIDEO_BYTES = 104_857_600; // 100 MB

/**
 * Read image dimensions from a File without blocking the upload pipeline.
 * A separate object URL is created and revoked after decode; this runs
 * concurrently with the presign + S3 PUT so it adds ~0 wall-clock overhead.
 */
export function readImageDims(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
