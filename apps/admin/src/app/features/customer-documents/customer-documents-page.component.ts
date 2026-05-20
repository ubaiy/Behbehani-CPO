import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  firstValueFrom,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';

import type {
  DocumentKind,
  DocumentSummaryDto,
  AdminDocumentListQueryDto,
  AdminDocumentListResponseDto,
} from '@behbehani-cpo/shared-types';
import { AdminDocumentsService } from '@behbehani-cpo/data-access';

// ── Constants ────────────────────────────────────────────────────────────────

const DOCUMENT_KINDS: DocumentKind[] = [
  'inspection_report',
  'sale_contract',
  'insurance_policy',
  'warranty',
  'invoice',
  'other',
];

const KIND_LABELS: Record<DocumentKind, string> = {
  inspection_report: 'Inspection Report',
  sale_contract:     'Sale Contract',
  insurance_policy:  'Insurance Policy',
  warranty:          'Warranty',
  invoice:           'Invoice',
  other:             'Other',
};

const ACCEPTED_MIME_TYPES =
  'application/pdf,image/jpeg,image/png,image/webp,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Component ────────────────────────────────────────────────────────────────

type UploadStep = 'idle' | 'uploading' | 'success' | 'error';

@Component({
  selector: 'admin-customer-documents-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-5xl mx-auto">

      <!-- ── Page header ─────────────────────────────────────────────────── -->
      <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 class="text-xl font-semibold text-slate-800">
            Documents —
            <span class="font-normal text-slate-500">
              Customer {{ customerId().slice(0, 8) }}…
              <!-- TODO: fetch customer name/email from admin customers API when available -->
            </span>
          </h1>
          <p class="text-sm text-slate-500 mt-0.5">
            @if (loading()) { Loading… }
            @else { {{ total() }} document{{ total() === 1 ? '' : 's' }} }
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 min-h-[44px]"
          (click)="openUploadPanel()"
          [disabled]="showUploadPanel()"
          aria-label="Upload a new document for this customer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0L8 8m4-4l4 4"/>
          </svg>
          Upload document
        </button>
      </div>

      <!-- ── Upload panel (inline) ───────────────────────────────────────── -->
      @if (showUploadPanel()) {
        <div class="bg-white rounded-xl border border-brand-200 p-6 mb-5 shadow-sm" role="region" aria-label="Upload document form">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-slate-800">Upload new document</h2>
            <button
              type="button"
              class="text-slate-400 hover:text-slate-600 min-h-[36px] min-w-[36px] flex items-center justify-center rounded"
              (click)="closeUploadPanel()"
              aria-label="Close upload form"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <form [formGroup]="uploadForm" (ngSubmit)="submitUpload()" novalidate>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

              <!-- Kind picker -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1" for="doc-kind">
                  Document type <span class="text-red-500" aria-hidden="true">*</span>
                </label>
                <select
                  id="doc-kind"
                  formControlName="kind"
                  class="w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                  aria-required="true"
                >
                  <option value="" disabled>Select a type…</option>
                  @for (k of KINDS; track k) {
                    <option [value]="k">{{ KIND_LABELS[k] }}</option>
                  }
                </select>
                @if (uploadForm.get('kind')?.invalid && uploadForm.get('kind')?.touched) {
                  <p class="mt-1 text-xs text-red-600">Document type is required.</p>
                }
              </div>

              <!-- Title -->
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1" for="doc-title">
                  Title <span class="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="doc-title"
                  type="text"
                  formControlName="title"
                  placeholder="e.g. CPO Inspection Report — April 2025"
                  class="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                  aria-required="true"
                  maxlength="200"
                />
                @if (uploadForm.get('title')?.invalid && uploadForm.get('title')?.touched) {
                  <p class="mt-1 text-xs text-red-600">Title is required (max 200 characters).</p>
                }
              </div>
            </div>

            <!-- File input -->
            <div class="mb-5">
              <label class="block text-sm font-medium text-slate-700 mb-1" for="doc-file">
                File <span class="text-red-500" aria-hidden="true">*</span>
                <span class="font-normal text-slate-400 ml-1">— PDF, JPEG, PNG, DOCX · max 50 MB</span>
              </label>
              <input
                id="doc-file"
                type="file"
                [accept]="ACCEPTED_MIME_TYPES"
                class="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-600 file:text-white hover:file:bg-brand-700 file:min-h-[40px] file:cursor-pointer cursor-pointer"
                (change)="onFileChange($event)"
                aria-required="true"
              />
              @if (selectedFile()) {
                <p class="mt-1 text-xs text-slate-500">
                  Selected: {{ selectedFile()!.name }} ({{ formatBytes(selectedFile()!.size) }})
                </p>
              }
              @if (fileError()) {
                <p class="mt-1 text-xs text-red-600">{{ fileError() }}</p>
              }
            </div>

            <!-- Upload progress / error -->
            @if (uploadStep() === 'uploading') {
              <div class="mb-4 rounded-lg bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-brand-700 flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ uploadStatusMessage() }}
              </div>
            }
            @if (uploadStep() === 'error') {
              <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {{ uploadError() }}
              </div>
            }
            @if (uploadStep() === 'success') {
              <div class="mb-4 rounded-lg bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-brand-700">
                Document uploaded successfully.
              </div>
            }

            <!-- Form actions -->
            <div class="flex items-center gap-3 justify-end">
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 min-h-[44px]"
                (click)="closeUploadPanel()"
                [disabled]="uploadStep() === 'uploading'"
              >Cancel</button>
              <button
                type="submit"
                class="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                [disabled]="uploadForm.invalid || !selectedFile() || uploadStep() === 'uploading'"
              >
                @if (uploadStep() === 'uploading') {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                }
                Upload
              </button>
            </div>
          </form>
        </div>
      }

      <!-- ── Kind filter chips ────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium text-slate-500 mr-1">Filter:</span>
          <button
            type="button"
            class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium min-h-[36px]"
            [class.bg-brand-600]="!activeKind()"
            [class.text-white]="!activeKind()"
            [class.bg-slate-100]="!!activeKind()"
            [class.text-slate-600]="!!activeKind()"
            (click)="setKind(undefined)"
          >
            All · {{ total() }}
          </button>
          @for (k of KINDS; track k) {
            <button
              type="button"
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium min-h-[36px]"
              [class.bg-brand-600]="activeKind() === k"
              [class.text-white]="activeKind() === k"
              [class.bg-slate-100]="activeKind() !== k"
              [class.text-slate-600]="activeKind() !== k"
              (click)="setKind(k)"
            >
              {{ KIND_LABELS[k] }}
            </button>
          }
        </div>
      </div>

      <!-- ── Error banner ─────────────────────────────────────────────────── -->
      @if (listError()) {
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ listError() }}
        </div>
      }

      <!-- ── Documents table ─────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">

        <!-- Loading skeleton -->
        @if (loading()) {
          <div class="divide-y divide-slate-100">
            @for (n of [1,2,3,4,5]; track n) {
              <div class="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div class="w-8 h-8 rounded-md bg-slate-200 shrink-0"></div>
                <div class="flex-1 min-w-0 space-y-2">
                  <div class="h-3 bg-slate-200 rounded w-1/2"></div>
                  <div class="h-3 bg-slate-100 rounded w-1/3"></div>
                </div>
                <div class="h-5 w-20 bg-slate-100 rounded-full shrink-0"></div>
                <div class="h-3 w-24 bg-slate-100 rounded shrink-0 hidden sm:block"></div>
              </div>
            }
          </div>
        }

        <!-- Empty state -->
        @if (!loading() && items().length === 0) {
          <div class="p-16 flex flex-col items-center justify-center text-center">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 class="text-base font-semibold text-slate-700 mb-1">No documents found</h3>
            <p class="text-sm text-slate-400 max-w-xs mb-5">
              @if (activeKind()) {
                No {{ KIND_LABELS[activeKind()!] }} documents for this customer yet.
              } @else {
                This customer has no documents yet. Upload one to get started.
              }
            </p>
            @if (activeKind()) {
              <button type="button" class="text-sm font-medium text-brand-600 hover:underline" (click)="setKind(undefined)">
                Clear filter
              </button>
            }
          </div>
        }

        <!-- Document rows -->
        @if (!loading() && items().length > 0) {
          <div class="divide-y divide-slate-100" role="list" aria-label="Document list">
            @for (doc of items(); track doc.id) {
              <div class="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors" role="listitem">

                <!-- File icon -->
                <div class="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center shrink-0" aria-hidden="true">
                  <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>

                <!-- Title + meta -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-800 truncate">{{ doc.title }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    {{ doc.mimeType }} · {{ formatBytes(doc.fileSizeBytes) }}
                  </p>
                </div>

                <!-- Kind badge -->
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 whitespace-nowrap shrink-0">
                  {{ KIND_LABELS[doc.kind] }}
                </span>

                <!-- Upload date -->
                <p class="text-xs text-slate-400 shrink-0 hidden sm:block whitespace-nowrap">
                  {{ doc.uploadedAt | date: 'dd MMM yyyy' }}
                </p>
              </div>
            }
          </div>

          <!-- ── Pagination footer ─────────────────────────────────────────── -->
          <div class="flex items-center justify-between px-4 py-3 border-t border-slate-200 flex-wrap gap-2">
            <p class="text-xs text-slate-500">
              {{ (currentPage() - 1) * currentPageSize() + 1 }}–{{ Math.min(currentPage() * currentPageSize(), total()) }}
              of {{ total() }}
            </p>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 min-h-[36px]"
                [disabled]="currentPage() <= 1"
                (click)="goToPage(currentPage() - 1)"
                aria-label="Previous page"
              >‹</button>
              @for (pg of pageNumbers(); track pg) {
                @if (pg === -1) {
                  <span class="px-1 text-xs text-slate-400">…</span>
                } @else {
                  <button
                    type="button"
                    class="px-2.5 py-1 text-xs rounded border font-semibold min-h-[36px] min-w-[36px]"
                    [class.border-brand-600]="pg === currentPage()"
                    [class.bg-brand-600]="pg === currentPage()"
                    [class.text-white]="pg === currentPage()"
                    [class.border-slate-300]="pg !== currentPage()"
                    [class.bg-white]="pg !== currentPage()"
                    [class.text-slate-700]="pg !== currentPage()"
                    (click)="goToPage(pg)"
                    [attr.aria-current]="pg === currentPage() ? 'page' : null"
                  >{{ pg }}</button>
                }
              }
              <button
                type="button"
                class="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[36px]"
                [disabled]="currentPage() >= totalPages()"
                (click)="goToPage(currentPage() + 1)"
                aria-label="Next page"
              >›</button>
            </div>
          </div>
        }
      </div>
    </div><!-- /max-w-5xl -->
  `,
})
export class CustomerDocumentsPageComponent implements OnInit, OnDestroy {
  private readonly docsService = inject(AdminDocumentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();

  // ── Public constants for template ──────────────────────────────────────────
  protected readonly KINDS = DOCUMENT_KINDS;
  protected readonly KIND_LABELS = KIND_LABELS;
  protected readonly ACCEPTED_MIME_TYPES = ACCEPTED_MIME_TYPES;
  protected readonly formatBytes = formatBytes;
  protected readonly Math = Math;

  // ── Route param ────────────────────────────────────────────────────────────
  protected readonly customerId = signal<string>('');

  // ── List state ─────────────────────────────────────────────────────────────
  protected readonly activeKind = signal<DocumentKind | undefined>(undefined);
  protected readonly currentPage = signal<number>(1);
  protected readonly currentPageSize = signal<number>(20);
  protected readonly items = signal<DocumentSummaryDto[]>([]);
  protected readonly total = signal<number>(0);
  protected readonly loading = signal<boolean>(true);
  protected readonly listError = signal<string | null>(null);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.currentPageSize())),
  );

  protected readonly pageNumbers = computed<number[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
      pages.push(p);
    }
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  });

  // ── Upload panel state ─────────────────────────────────────────────────────
  protected readonly showUploadPanel = signal<boolean>(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly uploadStep = signal<UploadStep>('idle');
  protected readonly uploadError = signal<string | null>(null);
  protected readonly uploadStatusMessage = signal<string>('Uploading…');

  // ── Upload form ────────────────────────────────────────────────────────────
  protected readonly uploadForm = this.fb.group({
    kind:  ['', Validators.required],
    title: ['', [Validators.required, Validators.maxLength(200)]],
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('customerId') ?? '';
    this.customerId.set(id);

    // Re-fetch whenever activeKind or currentPage changes.
    toObservable(this.activeKind, { injector: this.injector })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.fetchList();
      });

    toObservable(this.currentPage, { injector: this.injector })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchList());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── List actions ───────────────────────────────────────────────────────────

  protected setKind(kind: DocumentKind | undefined): void {
    this.activeKind.set(kind);
  }

  protected goToPage(page: number): void {
    this.currentPage.set(page);
  }

  // ── Upload panel actions ───────────────────────────────────────────────────

  protected openUploadPanel(): void {
    this.uploadForm.reset({ kind: '', title: '' });
    this.selectedFile.set(null);
    this.fileError.set(null);
    this.uploadStep.set('idle');
    this.uploadError.set(null);
    this.showUploadPanel.set(true);
  }

  protected closeUploadPanel(): void {
    if (this.uploadStep() === 'uploading') return;
    this.showUploadPanel.set(false);
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileError.set(null);

    if (!file) {
      this.selectedFile.set(null);
      return;
    }

    const MAX_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      this.fileError.set(`File exceeds the 50 MB limit (${formatBytes(file.size)}).`);
      this.selectedFile.set(null);
      input.value = '';
      return;
    }

    this.selectedFile.set(file);
  }

  protected async submitUpload(): Promise<void> {
    if (this.uploadForm.invalid || !this.selectedFile()) return;

    const file = this.selectedFile()!;
    const { kind, title } = this.uploadForm.getRawValue() as { kind: DocumentKind; title: string };

    this.uploadStep.set('uploading');
    this.uploadError.set(null);
    this.uploadStatusMessage.set('Requesting upload URL…');

    try {
      // Step 1: get pre-signed PUT URL
      const presign = await firstValueFrom(
        this.docsService.getUploadUrl({
          customerId:    this.customerId(),
          kind,
          mimeType:      file.type || 'application/octet-stream',
          fileSizeBytes: file.size,
          title,
        }),
      );

      // Step 2: PUT file to S3
      this.uploadStatusMessage.set('Uploading file…');
      await firstValueFrom(
        this.docsService.uploadFile(
          presign.uploadUrl,
          file,
          file.type || 'application/octet-stream',
        ),
      );

      // Step 3: finalize Document row
      this.uploadStatusMessage.set('Finalizing…');
      await firstValueFrom(
        this.docsService.finalizeUpload({
          fileKey:       presign.fileKey,
          customerId:    this.customerId(),
          kind,
          title,
          mimeType:      file.type || 'application/octet-stream',
          fileSizeBytes: file.size,
        }),
      );

      this.uploadStep.set('success');
      this.selectedFile.set(null);
      this.uploadForm.reset({ kind: '', title: '' });
      // Refresh list after a brief moment so the user sees the success state
      setTimeout(() => {
        this.showUploadPanel.set(false);
        this.uploadStep.set('idle');
        this.fetchList();
      }, 1200);
    } catch (err: unknown) {
      const message =
        (err as { error?: { message?: string }; message?: string })?.error?.message ??
        (err as { message?: string })?.message ??
        'Upload failed. Please try again.';
      this.uploadStep.set('error');
      this.uploadError.set(message);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private fetchList(): void {
    const cid = this.customerId();
    if (!cid) return;

    this.loading.set(true);
    this.listError.set(null);

    const query: Partial<AdminDocumentListQueryDto> = {
      page:     this.currentPage(),
      pageSize: this.currentPageSize(),
    };
    if (this.activeKind()) {
      query.kind = this.activeKind();
    }

    this.docsService
      .listCustomerDocuments(cid, query)
      .pipe(
        catchError((err: unknown) => {
          const msg =
            (err as { error?: { message?: string }; message?: string })?.error?.message ??
            (err as { message?: string })?.message ??
            'Failed to load documents.';
          this.listError.set(msg);
          return of<AdminDocumentListResponseDto>({
            items: [],
            total: 0,
            page: this.currentPage(),
            pageSize: this.currentPageSize(),
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      });
  }
}
