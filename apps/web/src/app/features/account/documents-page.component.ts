import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@behbehani-cpo/data-access';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { SignInModalService } from '../auth/sign-in-modal.service';
import { DocumentsService } from '../../data/documents.service';
import { UiSelectComponent, type SelectOption } from '../../shared/ui-select.component';
import type { DocumentKind, DocumentListResponseDto } from '@behbehani-cpo/shared-types';

// ── Kind filter chip data ────────────────────────────────────────────────────

const KIND_CHIPS: { label: string; value: DocumentKind | null }[] = [
  { label: 'account.documents.kindAll', value: null },
  { label: 'account.documents.kind.inspection_report', value: 'inspection_report' },
  { label: 'account.documents.kind.sale_contract', value: 'sale_contract' },
  { label: 'account.documents.kind.insurance_policy', value: 'insurance_policy' },
  { label: 'account.documents.kind.warranty', value: 'warranty' },
  { label: 'account.documents.kind.invoice', value: 'invoice' },
  { label: 'account.documents.kind.other', value: 'other' },
];

// ── Kind icon SVG paths (inline, no external dependency) ─────────────────────

const KIND_ICON: Record<string, string> = {
  inspection_report: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  sale_contract:     'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  insurance_policy:  'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  warranty:          'M12 2a10 10 0 100 20A10 10 0 0012 2zm1 14.93V17a1 1 0 11-2 0v-.07A8.001 8.001 0 014 9a8 8 0 1116 0 8.001 8.001 0 01-7 7.93z',
  invoice:           'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  other:             'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-documents-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule, UiSelectComponent],
  template: `
    <!-- Compact hero header (Part C.4) -->
      <header class="mb-6 rounded-3xl bg-gradient-to-br from-brand-50 via-white to-brand-50/40 border border-brand-100 px-6 py-5 flex items-center gap-4">
        <span class="inline-grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand-700 text-white shadow-brand-sm" aria-hidden="true">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
        </span>
        <div class="min-w-0">
          <h1 class="font-display text-[22px] sm:text-[26px] font-bold text-ink mb-0.5 tracking-[-0.02em]">
            {{ 'account.shell.page.documents.title' | translate }}
          </h1>
          <p class="text-[13px] text-muted">
            {{ 'account.shell.page.documents.sub' | translate }}
          </p>
        </div>
      </header>

      <!-- v1.5-D8: chip row REPLACED with single-select dropdown per user feedback.
           NOTE: NO overflow-hidden wrapper here — ui-select opens its panel as an
           absolutely-positioned child, and overflow-hidden on the parent would
           clip the panel (bug caught in v1.5-D8 follow-up). -->
      <div class="pb-4 max-w-xs">
        <div class="rounded-2xl border border-line bg-white">
          <app-ui-select
            [label]="'account.documents.filterLabel' | translate"
            [options]="kindOptions()"
            [value]="selectedKind() ?? ''"
            [placeholder]="'account.documents.kindAll' | translate"
            (valueChange)="onKindFromDropdown($event)"
          />
        </div>
      </div>

      <!-- Content area -->
      <main class="pb-4">
        <div class="flex flex-col gap-3">

          @if (listState().kind === 'loading') {
            <!-- Skeleton rows -->
            @for (_ of skeletons; track $index) {
              <div class="rounded-2xl border border-line bg-white p-4 shadow-brand-sm animate-pulse">
                <div class="flex items-center gap-4">
                  <div class="h-10 w-10 flex-shrink-0 rounded-xl bg-brand-50"></div>
                  <div class="flex flex-1 flex-col gap-2">
                    <div class="h-3.5 w-2/5 rounded bg-gray-200"></div>
                    <div class="h-3 w-1/4 rounded bg-gray-100"></div>
                  </div>
                  <div class="h-9 w-16 flex-shrink-0 rounded-lg bg-gray-100"></div>
                </div>
              </div>
            }
          } @else if (listState().kind === 'error') {
            <!-- Error state -->
            <div class="rounded-2xl border border-line bg-white p-10 text-center shadow-brand-sm">
              <p class="text-[14px] text-muted">{{ 'account.documents.error.body' | translate }}</p>
              <button
                type="button"
                (click)="reload()"
                class="mt-4 min-h-[44px] rounded-lg border border-brand-200 bg-brand-50 px-5 py-2 text-[14px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
              >
                {{ 'account.documents.error.retry' | translate }}
              </button>
            </div>
          } @else if (listState().kind === 'ok') {
            @let resp = okValue();
            @if (resp && resp.items.length === 0) {
              <!-- Empty state (illustrated SVG: folder + arrow) -->
              <div class="rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft/40 p-12 text-center shadow-brand-sm">
                <div class="mx-auto mb-5 w-20 h-20 rounded-3xl bg-brand-100 flex items-center justify-center">
                  <svg class="w-10 h-10 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 12v6m0 0l-2-2m2 2l2-2"/>
                  </svg>
                </div>
                <h2 class="font-display font-bold text-[18px] text-ink mb-2">{{ 'account.documents.empty.title' | translate }}</h2>
                <p class="text-[14px] text-muted max-w-md mx-auto">{{ 'account.documents.empty.body' | translate }}</p>
              </div>
            } @else if (resp) {
              <!-- Document cards -->
              @for (doc of resp.items; track doc.id) {
                <article class="rounded-2xl border border-line bg-white p-4 shadow-brand-sm hover:shadow-brand hover:border-brand-200 transition-all duration-200">
                  <div class="flex items-center gap-4">
                    <!-- Kind icon -->
                    <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50" aria-hidden="true">
                      <svg class="h-5 w-5 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="iconPath(doc.kind)" />
                      </svg>
                    </div>
                    <!-- Info -->
                    <div class="flex flex-1 flex-col min-w-0">
                      <span class="truncate text-[14px] font-semibold text-ink">{{ doc.title }}</span>
                      <span class="mt-0.5 text-[12px] text-muted">
                        {{ kindLabel(doc.kind) | translate }}
                        &nbsp;·&nbsp;{{ formatSize(doc.fileSizeBytes) }}
                        &nbsp;·&nbsp;{{ relativeDate(doc.uploadedAt) }}
                      </span>
                    </div>
                    <!-- Open CTA -->
                    <button
                      type="button"
                      (click)="openDocument(doc.id)"
                      [disabled]="openingId() === doc.id"
                      class="min-h-[44px] flex-shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      @if (openingId() === doc.id) {
                        <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" aria-hidden="true"></span>
                      } @else {
                        {{ 'account.documents.openCta' | translate }}
                      }
                    </button>
                  </div>
                </article>
              }

              <!-- Pagination -->
              @if (totalPages() > 1) {
                <div class="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    (click)="prevPage()"
                    [disabled]="currentPage() <= 1"
                    class="min-h-[44px] rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {{ 'account.documents.pagination.prev' | translate }}
                  </button>
                  <span class="text-[13px] text-muted">
                    {{ 'account.documents.pagination.pageOf' | translate: { page: currentPage(), total: totalPages() } }}
                  </span>
                  <button
                    type="button"
                    (click)="nextPage()"
                    [disabled]="currentPage() >= totalPages()"
                    class="min-h-[44px] rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {{ 'account.documents.pagination.next' | translate }}
                  </button>
                </div>
              }
            }
          }
        </div>
      </main>
  `,
})
export class DocumentsPageComponent {
  readonly auth = inject(AuthService);
  private readonly docsService = inject(DocumentsService);
  private readonly language = inject(LanguageService);
  private readonly signInModal = inject(SignInModalService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly translate = inject(TranslateService);
  readonly locale = computed(() => this.language.current());
  readonly kindChips = KIND_CHIPS;
  readonly skeletons = [1, 2, 3];

  /**
   * v1.5-D8: translated option list for `<app-ui-select>`. Computed re-runs
   * when locale changes so labels switch EN↔AR. The "All" option uses `''`
   * because ui-select can't bind null directly; `onKindFromDropdown` maps
   * `''` back to `null` for the actual filter.
   */
  readonly kindOptions = computed<ReadonlyArray<SelectOption>>(() => {
    this.language.current(); // dep for re-translation
    return KIND_CHIPS.map((chip) => ({
      value: chip.value ?? '',
      label: this.translate.instant(chip.label),
    }));
  });

  readonly selectedKind = signal<DocumentKind | null>(null);
  readonly currentPage = signal(1);
  readonly listState = signal<{ kind: 'loading' } | { kind: 'ok'; value: DocumentListResponseDto } | { kind: 'error'; code: string }>({ kind: 'loading' });
  readonly openingId = signal<string | null>(null);

  readonly okValue = computed(() => {
    const s = this.listState();
    return s.kind === 'ok' ? s.value : null;
  });

  readonly totalPages = computed(() => {
    const v = this.okValue();
    if (!v) return 1;
    return Math.ceil(v.total / v.pageSize) || 1;
  });

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId) && !this.auth.isSignedIn()) {
        this.signInModal.open();
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const kind = this.selectedKind();
      const page = this.currentPage();
      if (!this.auth.isSignedIn()) return;
      this.listState.set({ kind: 'loading' });
      this.docsService.list(kind ?? undefined, page).subscribe((s) => this.listState.set(s as never));
    }, { allowSignalWrites: true });
  }

  selectKind(kind: DocumentKind | null): void {
    this.selectedKind.set(kind);
    this.currentPage.set(1);
  }

  /** v1.5-D8: bridge ui-select's string emit → DocumentKind|null. */
  onKindFromDropdown(value: string): void {
    this.selectKind((value === '' ? null : (value as DocumentKind)));
  }

  reload(): void {
    const kind = this.selectedKind();
    const page = this.currentPage();
    this.listState.set({ kind: 'loading' });
    this.docsService.list(kind ?? undefined, page).subscribe((s) => this.listState.set(s as never));
  }

  prevPage(): void {
    const p = this.currentPage();
    if (p > 1) this.currentPage.set(p - 1);
  }

  nextPage(): void {
    const p = this.currentPage();
    if (p < this.totalPages()) this.currentPage.set(p + 1);
  }

  openDocument(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.openingId.set(id);
    this.docsService.getDownloadUrl(id).subscribe((s) => {
      if (s.kind === 'ok') {
        window.open(s.value.downloadUrl, '_blank');
      }
      if (s.kind !== 'loading') {
        this.openingId.set(null);
      }
    });
  }

  iconPath(kind: string): string {
    return KIND_ICON[kind] ?? KIND_ICON['other'];
  }

  kindLabel(kind: string): string {
    return `account.documents.kind.${kind}`;
  }

  formatSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  relativeDate(iso: string): string {
    return relativeTime(iso);
  }
}
