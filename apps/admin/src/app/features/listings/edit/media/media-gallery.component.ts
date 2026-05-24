import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import type {
  PhotoDto,
  Media360Dto,
  VideoDto,
  AdminRole,
} from '@behbehani-cpo/shared-types';
import {
  AdminMediaService,
  type UploadProgress,
} from '@behbehani-cpo/data-access';
import { ConfirmModalService } from '@behbehani-cpo/shared-ui';
import { AdminRoleDirective } from '../../../../core/admin-role.directive';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MEDIA_WRITE_ROLES,
  formatBytes,
  formatDuration,
  readImageDims,
  type MediaSubTab,
  type PendingPhoto,
} from './media-gallery.helpers';
import { Media360TabComponent } from './media-360-tab.component';

@Component({
  selector: 'app-media-gallery',
  standalone: true,
  imports: [CommonModule, AdminRoleDirective, Media360TabComponent],
  templateUrl: './media-gallery.component.html',
})
export class MediaGalleryComponent implements OnInit, OnDestroy {
  @Input({ required: true }) listingId!: string;

  private readonly mediaService = inject(AdminMediaService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly destroy$ = new Subject<void>();

  // ── Sub-tab state ─────────────────────────────────────────────────────────
  readonly activeSubTab = signal<MediaSubTab>('photos');

  // ── Write-role list exposed to template for *adminRole binding ────────────
  readonly writeRoles: AdminRole[] = MEDIA_WRITE_ROLES;

  // ── Photos state ──────────────────────────────────────────────────────────
  readonly photos = signal<PhotoDto[]>([]);
  readonly pendingPhotos = signal<PendingPhoto[]>([]);
  readonly photosLoading = signal(true);
  readonly photoValidationError = signal<string | null>(null);

  // Derived: count of confirmed-only photos.
  readonly photoCount = computed(
    () => this.photos().filter((p) => p.uploadStatus === 'complete').length,
  );

  // ── Video state ───────────────────────────────────────────────────────────
  readonly video = signal<VideoDto | null>(null);
  readonly videoLoading = signal(true);
  readonly videoUploading = signal(false);
  readonly videoUploadPct = signal(0);
  readonly videoError = signal<string | null>(null);

  // ── HTML5 drag-reorder state ──────────────────────────────────────────────
  private dragSourceIndex: number | null = null;

  ngOnInit(): void {
    this.loadPhotos();
    this.loadVideo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    for (const p of this.pendingPhotos()) {
      URL.revokeObjectURL(p.previewUrl);
    }
  }

  // ── Sub-tab navigation ───────────────────────────────────────────────────
  setSubTab(tab: MediaSubTab): void {
    this.activeSubTab.set(tab);
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  private loadPhotos(): void {
    this.photosLoading.set(true);
    this.mediaService
      .listPhotos(this.listingId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (photos) => {
          this.photos.set([...photos].sort((a, b) => a.sortOrder - b.sortOrder));
          this.photosLoading.set(false);
        },
        error: () => this.photosLoading.set(false),
      });
  }

  private loadVideo(): void {
    this.videoLoading.set(true);
    this.mediaService
      .getVideo(this.listingId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (v) => {
          this.video.set(v);
          this.videoLoading.set(false);
        },
        error: () => this.videoLoading.set(false),
      });
  }

  // ── Photo drag-and-drop upload ────────────────────────────────────────────
  onDropzoneClick(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.handlePhotoFiles(files);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.handlePhotoFiles(files);
    input.value = ''; // Reset so same file can be re-selected after failure.
  }

  private handlePhotoFiles(files: File[]): void {
    this.photoValidationError.set(null);
    const errors: string[] = [];
    const valid: File[] = [];

    for (const file of files) {
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        errors.push(`${file.name}: unsupported type (JPEG/PNG/WebP only)`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        errors.push(`${file.name}: exceeds 10 MB limit`);
        continue;
      }
      valid.push(file);
    }

    if (errors.length > 0) {
      this.photoValidationError.set(errors.join('. '));
    }

    for (const file of valid) {
      this.uploadPhoto(file);
    }
  }

  private uploadPhoto(file: File): void {
    const localId = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);

    this.pendingPhotos.update((prev) => [
      ...prev,
      { localId, file, previewUrl, status: 'uploading', pct: 0 },
    ]);

    // Dimension decode runs in parallel with presign + S3 PUT.
    // The Promise resolves before or around the time the upload completes,
    // so confirm() receives real dimensions without serialising on image decode.
    const dimsPromise = readImageDims(file);

    this.mediaService
      .presignPhoto(this.listingId, {
        filename: file.name,
        contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
        byteSize: file.size,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (presignResp) => {
          this.mediaService
            .uploadToS3(presignResp, file)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (progress: UploadProgress) => {
                this.updatePending(localId, { pct: progress.pct });

                if (progress.status === 'complete') {
                  // Await dims (already resolving in parallel) then confirm.
                  dimsPromise.then((dims) => {
                    this.mediaService
                      .confirmPhoto(this.listingId, presignResp.photoId, {
                        width: dims.width || undefined,
                        height: dims.height || undefined,
                      })
                      .pipe(takeUntil(this.destroy$))
                      .subscribe({
                        next: (photo) => {
                          this.removePending(localId);
                          this.photos.update((prev) =>
                            [...prev, photo].sort(
                              (a, b) => a.sortOrder - b.sortOrder,
                            ),
                          );
                        },
                        error: () =>
                          this.updatePending(localId, {
                            status: 'error',
                            pct: 0,
                          }),
                      });
                  });
                }
              },
              error: () =>
                this.updatePending(localId, { status: 'error', pct: 0 }),
            });
        },
        error: () =>
          this.updatePending(localId, { status: 'error', pct: 0 }),
      });
  }

  retryPhoto(pending: PendingPhoto): void {
    this.removePending(pending.localId);
    this.uploadPhoto(pending.file);
  }

  private updatePending(localId: string, patch: Partial<PendingPhoto>): void {
    this.pendingPhotos.update((prev) =>
      prev.map((p) => (p.localId === localId ? { ...p, ...patch } : p)),
    );
  }

  private removePending(localId: string): void {
    this.pendingPhotos.update((prev) => {
      const found = prev.find((p) => p.localId === localId);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  }

  // ── Set primary photo (optimistic) ────────────────────────────────────────
  setPrimaryPhoto(photo: PhotoDto): void {
    if (photo.isHero) return;
    this.photos.update((prev) =>
      prev.map((p) => ({ ...p, isHero: p.id === photo.id })),
    );
    this.mediaService
      .setPrimary(this.listingId, photo.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.photos.update((prev) =>
            prev.map((p) =>
              p.id === updated.id ? updated : { ...p, isHero: false },
            ),
          );
        },
        error: () => this.loadPhotos(),
      });
  }

  // ── Delete photo (confirm modal, destructive) ─────────────────────────────
  deletePhoto(photo: PhotoDto): void {
    this.confirmModal
      .open({
        title: 'Remove photo',
        body: 'This photo will be permanently deleted from the listing.',
        confirmLabel: 'Remove',
        variant: 'destructive',
      })
      .then((confirmed) => {
        if (!confirmed) return;
        this.photos.update((prev) => prev.filter((p) => p.id !== photo.id));
        this.mediaService
          .deletePhoto(this.listingId, photo.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({ error: () => this.loadPhotos() });
      });
  }

  // ── Photo HTML5 drag-to-reorder ───────────────────────────────────────────
  onPhotoDragStart(index: number): void {
    this.dragSourceIndex = index;
  }

  onPhotoDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.dragSourceIndex === null || this.dragSourceIndex === index) return;
    const arr = [...this.photos()];
    const [moved] = arr.splice(this.dragSourceIndex, 1);
    arr.splice(index, 0, moved);
    this.photos.set(arr);
    this.dragSourceIndex = index;
  }

  onPhotoDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragSourceIndex = null;
    const ids = this.photos().map((p) => p.id);
    this.mediaService
      .reorderPhotos(this.listingId, ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ error: () => this.loadPhotos() });
  }

  // ── Video upload ──────────────────────────────────────────────────────────
  onVideoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.uploadVideoFile(file);
  }

  onVideoDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  onVideoDragLeave(event: DragEvent): void {
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  onVideoDrop(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    const file = event.dataTransfer?.files[0];
    if (file) this.uploadVideoFile(file);
  }

  replaceVideo(fileInput: HTMLInputElement): void {
    const existing = this.video();
    if (!existing) return;
    this.confirmModal
      .open({
        title: 'Replace video',
        body: 'The current walk-around video will be permanently removed. Upload a new one to replace it.',
        confirmLabel: 'Replace',
        variant: 'destructive',
      })
      .then((confirmed) => {
        if (!confirmed) return;
        this.mediaService
          .deleteVideo(this.listingId, existing.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.video.set(null);
              fileInput.click();
            },
            error: () => this.videoError.set('Failed to remove existing video.'),
          });
      });
  }

  removeVideo(): void {
    const existing = this.video();
    if (!existing) return;
    this.confirmModal
      .open({
        title: 'Remove video',
        body: 'The walk-around video will be permanently deleted.',
        confirmLabel: 'Remove',
        variant: 'destructive',
      })
      .then((confirmed) => {
        if (!confirmed) return;
        this.mediaService
          .deleteVideo(this.listingId, existing.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => this.video.set(null),
            error: () => this.videoError.set('Failed to remove video.'),
          });
      });
  }

  private uploadVideoFile(file: File): void {
    const allowed = ['video/mp4', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      this.videoError.set('Only MP4 or MOV files are accepted.');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      this.videoError.set('File exceeds the 100 MB limit.');
      return;
    }
    this.videoError.set(null);
    this.videoUploading.set(true);
    this.videoUploadPct.set(0);

    this.mediaService
      .presignVideo(this.listingId, {
        filename: file.name,
        contentType: file.type as 'video/mp4' | 'video/quicktime',
        byteSize: file.size,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (presignResp) => {
          this.mediaService
            .uploadToS3(presignResp, file)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (progress: UploadProgress) => {
                this.videoUploadPct.set(progress.pct);
                if (progress.status === 'complete') {
                  this.mediaService
                    .confirmVideo(this.listingId, presignResp.videoId, {})
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                      next: (v) => {
                        this.video.set(v);
                        this.videoUploading.set(false);
                      },
                      error: () => {
                        this.videoUploading.set(false);
                        this.videoError.set(
                          'Upload succeeded but confirm failed. Please retry.',
                        );
                      },
                    });
                }
              },
              error: () => {
                this.videoUploading.set(false);
                this.videoError.set('Upload to storage failed. Please retry.');
              },
            });
        },
        error: () => {
          this.videoUploading.set(false);
          this.videoError.set('Failed to obtain upload URL. Please retry.');
        },
      });
  }

  // ── Image fallback ────────────────────────────────────────────────────────

  /**
   * Swap a broken CDN image to a branded SVG placeholder.
   * Guard flag prevents an infinite loop if the data-URI itself fails.
   */
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallbackApplied'] === 'true') return;
    img.dataset['fallbackApplied'] = 'true';
    img.src =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 40">' +
        '<rect width="64" height="40" fill="#dbeafe"/>' +
        '<path d="M10 28 L16 18 Q17 16 19 16 L45 16 Q47 16 48 18 L54 28 Q55 30 53 30 L11 30 Q9 30 10 28Z" fill="#93c5fd"/>' +
        '<rect x="14" y="30" width="6" height="4" rx="2" fill="#1d4ed8"/>' +
        '<rect x="44" y="30" width="6" height="4" rx="2" fill="#1d4ed8"/>' +
        '<rect x="20" y="18" width="10" height="8" rx="1" fill="#bfdbfe"/>' +
        '<rect x="34" y="18" width="10" height="8" rx="1" fill="#bfdbfe"/>' +
        '</svg>',
      );
  }

  // ── Template helpers ──────────────────────────────────────────────────────
  protected readonly formatBytes = formatBytes;
  protected readonly formatDuration = formatDuration;

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  trackByLocalId(_: number, item: PendingPhoto): string {
    return item.localId;
  }
}
