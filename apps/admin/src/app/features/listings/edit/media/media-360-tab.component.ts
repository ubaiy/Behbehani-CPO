import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import type { AdminRole, Media360Dto } from '@behbehani-cpo/shared-types';
import { AdminMediaService, type UploadProgress } from '@behbehani-cpo/data-access';
import { ConfirmModalService } from '@behbehani-cpo/shared-ui';

import { AdminRoleDirective } from '../../../../core/admin-role.directive';
import { MAX_360_BYTES, MEDIA_WRITE_ROLES, formatBytes } from './media-gallery.helpers';

/**
 * 360° asset sub-tab inside the media gallery. Owns its own load/upload state
 * and talks to AdminMediaService directly. Extracted to keep
 * media-gallery.component .ts/.html under the 500-line cap.
 */
@Component({
  selector: 'admin-media-360-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AdminRoleDirective],
  templateUrl: './media-360-tab.component.html',
})
export class Media360TabComponent implements OnInit, OnDestroy {
  @Input({ required: true }) listingId!: string;

  private readonly mediaService = inject(AdminMediaService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly destroy$ = new Subject<void>();

  readonly writeRoles: AdminRole[] = MEDIA_WRITE_ROLES;
  protected readonly formatBytes = formatBytes;

  readonly media360 = signal<Media360Dto | null>(null);
  readonly media360Loading = signal(true);
  readonly media360Uploading = signal(false);
  readonly media360UploadPct = signal(0);
  readonly media360Error = signal<string | null>(null);

  ngOnInit(): void {
    this.media360Loading.set(true);
    this.mediaService
      .get360(this.listingId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (m) => {
          this.media360.set(m);
          this.media360Loading.set(false);
        },
        error: () => this.media360Loading.set(false),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  on360FileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.upload360File(file);
  }

  on360DragOver(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  on360DragLeave(event: DragEvent): void {
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  on360Drop(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    const file = event.dataTransfer?.files[0];
    if (file) this.upload360File(file);
  }

  replace360(fileInput: HTMLInputElement): void {
    const existing = this.media360();
    if (!existing) return;
    this.confirmModal
      .open({
        title: 'Replace 360° asset',
        body: 'The current 360° asset will be permanently removed. Upload a new one to replace it.',
        confirmLabel: 'Replace',
        variant: 'destructive',
      })
      .then((confirmed) => {
        if (!confirmed) return;
        this.mediaService
          .delete360(this.listingId, existing.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.media360.set(null);
              fileInput.click();
            },
            error: () => this.media360Error.set('Failed to remove existing 360° asset.'),
          });
      });
  }

  remove360(): void {
    const existing = this.media360();
    if (!existing) return;
    this.confirmModal
      .open({
        title: 'Remove 360° asset',
        body: 'The 360° walk-around asset will be permanently deleted.',
        confirmLabel: 'Remove',
        variant: 'destructive',
      })
      .then((confirmed) => {
        if (!confirmed) return;
        this.mediaService
          .delete360(this.listingId, existing.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => this.media360.set(null),
            error: () => this.media360Error.set('Failed to remove 360° asset.'),
          });
      });
  }

  private upload360File(file: File): void {
    const allowed = ['application/zip', 'video/mp4'];
    if (!allowed.includes(file.type)) {
      this.media360Error.set('Only .zip or .mp4 files are accepted.');
      return;
    }
    if (file.size > MAX_360_BYTES) {
      this.media360Error.set('File exceeds the 250 MB limit.');
      return;
    }
    this.media360Error.set(null);
    this.media360Uploading.set(true);
    this.media360UploadPct.set(0);

    this.mediaService
      .presign360(this.listingId, {
        filename: file.name,
        contentType: file.type as 'application/zip' | 'video/mp4',
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
                this.media360UploadPct.set(progress.pct);
                if (progress.status === 'complete') {
                  this.mediaService
                    .confirm360(this.listingId, presignResp.media360Id, {})
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                      next: (m) => {
                        this.media360.set(m);
                        this.media360Uploading.set(false);
                      },
                      error: () => {
                        this.media360Uploading.set(false);
                        this.media360Error.set(
                          'Upload succeeded but confirm failed. Please retry.',
                        );
                      },
                    });
                }
              },
              error: () => {
                this.media360Uploading.set(false);
                this.media360Error.set('Upload to storage failed. Please retry.');
              },
            });
        },
        error: () => {
          this.media360Uploading.set(false);
          this.media360Error.set('Failed to obtain upload URL. Please retry.');
        },
      });
  }
}
