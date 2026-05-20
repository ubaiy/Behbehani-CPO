import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription, takeUntil } from 'rxjs';

import type {
  InspectionItemResult,
  InspectionItemStatus,
  InspectionPhotoPresignResponse,
} from '@behbehani-cpo/shared-types';
import { INSPECTION_RUBRIC, INSPECTION_RUBRIC_TOTAL } from '@behbehani-cpo/shared-types';
import { AdminInspectionsService, type InspectionDetailDto } from '@behbehani-cpo/data-access';

import {
  KIND_CHIP_CLASS,
  KIND_LABELS,
  STATUS_CHIP_CLASS,
  STATUS_LABELS,
} from '../shared/inspection-labels';
import { InspectionItemRowComponent } from './inspection-item-row.component';
import { ConciergePreludeComponent } from './concierge-prelude.component';
import { InspectionSectionNavComponent, type SectionSummary } from './inspection-section-nav.component';
import { InspectionSectionCardComponent } from './inspection-section-card.component';

const AUTOSAVE_DEBOUNCE_MS = 800;
type AllowedContentType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';

@Component({
  selector: 'admin-inspection-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    InspectionItemRowComponent,
    ConciergePreludeComponent,
    InspectionSectionNavComponent,
    InspectionSectionCardComponent,
  ],
  template: `
    <div class="max-w-6xl mx-auto"><nav class="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
      <a routerLink=".." class="hover:text-slate-700">Inspections</a>
      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      <span class="text-slate-800 font-medium truncate">{{ detail()?.vehicleLabel ?? 'Inspection' }}@if (detail()?.kind === 'concierge') { · Concierge }</span>
    </nav>

    @if (error()) {
      <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
    }
    @if (loading()) {
      <div class="animate-pulse space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <div class="h-6 bg-slate-200 rounded w-64 mb-2"></div><div class="h-4 bg-slate-100 rounded w-80"></div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <div class="h-2 bg-slate-200 rounded-full w-full mb-3"></div><div class="flex gap-2">@for (i of [0,1,2]; track i) { <div class="h-4 bg-slate-100 rounded w-24"></div> }</div>
        </div>
        @for (i of [0,1,2]; track i) {
          <div class="bg-white rounded-xl border border-slate-200 p-5"><div class="h-5 bg-slate-200 rounded w-40 mb-3"></div><div class="space-y-2"><div class="h-4 bg-slate-100 rounded w-full"></div><div class="h-4 bg-slate-100 rounded w-3/4"></div></div></div>
        }
      </div>
    }

    @if (!loading() && detail(); as d) {

      <!-- Page header -->
      <div class="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div class="min-w-0">
          <h1 class="text-xl font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
            <span class="truncate">{{ d.vehicleLabel }}</span>
            <span
              class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold"
              [ngClass]="KIND_CHIP_CLASS[d.kind]"
            >{{ KIND_LABELS[d.kind] }}</span>
          </h1>
          <div class="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
            @if (d.vinMasked) { <span class="font-mono">VIN {{ d.vinMasked }}</span> }
            @if (d.kind === 'concierge' && d.customer) {
              <span class="text-slate-300">·</span>
              <span>{{ d.customer.fullName }}</span>
              @if (d.customer.mobile) { <span>· {{ d.customer.mobile }}</span> }
            }
            @if (d.kind === 'cpo' && d.listing) {
              <span class="text-slate-300">·</span>
              <span class="font-mono">#{{ d.listing.stockNumber }}</span>
            }
            <span class="text-slate-300">·</span>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
              [ngClass]="STATUS_CHIP_CLASS[d.status]"
            >{{ STATUS_LABELS[d.status] }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px]"
            (click)="goBack()"
          >Save &amp; close</button>
          <button
            type="button"
            class="rounded-md px-4 py-1.5 text-sm font-semibold min-h-[44px] transition-colors"
            [ngClass]="canProceed()
              ? 'bg-brand-600 text-white hover:bg-brand-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'"
            [disabled]="!canProceed()"
            [title]="canProceed() ? '' : 'All ' + TOTAL + ' items must be scored first'"
            (click)="proceedToSignoff()"
          >Proceed to sign-off →</button>
        </div>
      </div>

      <!-- Concierge post-signoff CTA — surfaces the offer step when the user
           opens a signed-off Concierge inspection via the queue's "Create
           offer" or "View report" link. Same banner appears on /signoff for
           the just-signed case; this one covers later returns. -->
      @if (d.kind === 'concierge' && d.status === 'signed_off') {
        <div class="bg-brand-50 rounded-xl border border-brand-200 p-5 mb-5 flex items-start gap-4 flex-wrap">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-brand-900">Inspection signed off — ready to make an offer</p>
            <p class="text-xs text-slate-700 mt-0.5">Send {{ d.customer?.fullName || 'the customer' }} a purchase offer based on this {{ d.overallScore || '—' }}/100 inspection score.</p>
          </div>
          <a [routerLink]="['/operations/inspections', inspectionId, 'offer', 'new']"
             class="rounded-md bg-brand-600 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-700 min-h-[44px] inline-flex items-center flex-shrink-0">
            Create buy offer →
          </a>
        </div>
      }
      @if (d.kind === 'concierge') { <admin-concierge-prelude [inspection]="d" /> }
      <div class="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex items-center gap-4 flex-wrap">
        <div class="flex-1 min-w-64">
          <div class="flex items-center justify-between mb-1.5">
            <p class="text-sm font-medium text-slate-700">Progress</p>
            <p class="text-xs text-slate-500 tabular-nums">
              <span class="font-semibold text-slate-700">{{ scoredCount() }}</span>
              of {{ TOTAL }} items ·
              <span class="font-semibold text-slate-700">{{ progressPercent() }}%</span>
            </p>
          </div>
          <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div class="h-full bg-brand-600 transition-all" [style.width.%]="progressPercent()"></div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 text-xs text-slate-500">
          @switch (saveState()) {
            @case ('saving') {
              <svg class="animate-spin w-3.5 h-3.5 text-brand-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Saving…
            }
            @case ('saved') {
              <svg class="w-3.5 h-3.5 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              {{ savedLabel() }}
            }
            @case ('error') {
              <span class="text-red-600">Save failed — retry on next change.</span>
            }
            @default { <span class="text-slate-400">Auto-saving on every change.</span> }
          }
        </div>
      </div>

      <admin-inspection-section-nav [sections]="sectionSummaries()" />

      @for (section of RUBRIC; track section.key) {
        <admin-inspection-section-card
          [sectionId]="'sec-' + section.key"
          [title]="section.labelEn"
          [summary]="sectionSummaryText(section.key, section.items.length)"
          [iconPath]="sectionIcon(section.key)"
          [open]="isSectionOpen(section.key)"
          [allScored]="sectionScoredCount(section.key) === section.items.length"
          (openChange)="toggleSection(section.key)"
        >
          @for (item of section.items; track item.id) {
            <admin-inspection-item-row
              [item]="item"
              [result]="resultFor(item.id)"
              [readonly]="readonly()"
              [uploading]="uploadingItemId() === item.id"
              [uploadError]="uploadErrorFor(item.id)"
              (statusChange)="onItemStatus(item.id, $event)"
              (notesChange)="onItemNotes(item.id, $event)"
              (photoPick)="onPhotoPick(item.id, $event)"
              (photoRemove)="onPhotoRemove(item.id, $event)"
            />
          }
        </admin-inspection-section-card>
      }
    }
    </div>
  `,
})
export class InspectionEditComponent implements OnInit, OnDestroy {
  private readonly service = inject(AdminInspectionsService);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  protected readonly RUBRIC = INSPECTION_RUBRIC;
  protected readonly TOTAL = INSPECTION_RUBRIC_TOTAL;
  protected readonly KIND_LABELS = KIND_LABELS;
  protected readonly KIND_CHIP_CLASS = KIND_CHIP_CLASS;
  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly STATUS_CHIP_CLASS = STATUS_CHIP_CLASS;

  protected readonly detail = signal<InspectionDetailDto | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  protected readonly lastSavedAt = signal<Date | null>(null);
  protected readonly uploadingItemId = signal<string | null>(null);
  protected readonly uploadErrors = signal<Record<string, string | null>>({});

  /** Which sections are currently open — default: first section open. */
  private readonly openSections = signal<Record<string, boolean>>({});

  private readonly itemsByIdSig = signal<Record<string, InspectionItemResult>>({});
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSave: Subscription | null = null;
  // protected (not private) so the signed-off Concierge CTA template can build
  // the routerLink to /operations/inspections/:id/offer/new
  protected inspectionId = '';

  protected readonly scoredCount = computed(() =>
    Object.values(this.itemsByIdSig()).filter((r) => !!r.status).length,
  );
  protected readonly progressPercent = computed(() =>
    this.TOTAL === 0 ? 0 : Math.round((this.scoredCount() / this.TOTAL) * 100),
  );
  protected readonly readonly = computed(() => {
    const status = this.detail()?.status;
    return status === 'signed_off' || status === 'awaiting_customer_signature';
  });
  protected readonly canProceed = computed(() =>
    !this.readonly() && this.scoredCount() === this.TOTAL && this.failsHaveNotes(),
  );

  protected readonly sectionSummaries = computed<SectionSummary[]>(() =>
    this.RUBRIC.map((section) => ({
      key: section.key,
      labelEn: section.labelEn,
      totalItems: section.items.length,
      scoredCount: this.sectionScoredCount(section.key),
    })),
  );

  ngOnInit(): void {
    this.inspectionId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.inspectionId) {
      this.error.set('Inspection ID is missing from the route.');
      this.loading.set(false);
      return;
    }
    // Open the first section by default
    if (this.RUBRIC.length > 0) {
      this.openSections.set({ [this.RUBRIC[0].key]: true });
    }
    this.service.get(this.inspectionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set((err as Error)?.message ?? 'Failed to load inspection.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.pendingSave?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected isSectionOpen(key: string): boolean {
    return this.openSections()[key] ?? false;
  }

  protected toggleSection(key: string): void {
    this.openSections.update((map) => ({ ...map, [key]: !map[key] }));
  }

  protected sectionScoredCount(sectionKey: string): number {
    const section = this.RUBRIC.find((s) => s.key === sectionKey);
    if (!section) return 0;
    const items = this.itemsByIdSig();
    return section.items.filter((it) => items[it.id]?.status).length;
  }

  protected sectionSummaryText(k: string, n: number): string {
    const s = this.sectionScoredCount(k);
    if (s === 0) return `${n} items · not started`;
    if (s === n) return `${n} items · all scored`;
    return `${s} of ${n} items scored`;
  }

  protected sectionIcon(key: string): string {
    const ICONS: Record<string, string> = {
      exterior: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      interior: 'M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM9 14H5v-4h4v4zm6 0h-4v-4h4v4zm5 0h-4v-4h4v4z',
      engine_drivetrain: 'M13 10V3L4 14h7v7l9-11h-7z',
      electrical: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
      safety: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      documentation: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    };
    return ICONS[key] ?? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
  }

  protected resultFor(itemId: string): InspectionItemResult | null {
    return this.itemsByIdSig()[itemId] ?? null;
  }

  protected uploadErrorFor(itemId: string): string | null {
    return this.uploadErrors()[itemId] ?? null;
  }

  protected onItemStatus(itemId: string, status: InspectionItemStatus): void {
    this.updateItem(itemId, (current) => ({
      itemId,
      status,
      notes: current?.notes,
      photoKeys: current?.photoKeys ?? [],
    }));
  }

  protected onItemNotes(itemId: string, notes: string): void {
    this.updateItem(itemId, (current) => ({
      itemId,
      status: current?.status ?? 'pass',
      notes: notes.length > 0 ? notes : undefined,
      photoKeys: current?.photoKeys ?? [],
    }));
  }

  protected onPhotoRemove(itemId: string, idx: number): void {
    this.updateItem(itemId, (current) => {
      const next = [...(current?.photoKeys ?? [])];
      next.splice(idx, 1);
      return {
        itemId,
        status: current?.status ?? 'pass',
        notes: current?.notes,
        photoKeys: next,
      };
    });
  }

  protected onPhotoPick(itemId: string, file: File): void {
    if (file.size > 5 * 1024 * 1024) {
      this.setUploadError(itemId, 'Photo too large — max 5 MB.');
      return;
    }
    const contentType = this.normalizeContentType(file.type);
    if (!contentType) {
      this.setUploadError(itemId, 'Unsupported image type. Use JPEG, PNG, WebP, or HEIC.');
      return;
    }
    this.uploadingItemId.set(itemId);
    this.setUploadError(itemId, null);

    this.service
      .presignPhoto(this.inspectionId, itemId, { itemId, contentType, byteSize: file.size })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (presign) => this.uploadAndAttach(itemId, presign, file),
        error: (err) => {
          this.uploadingItemId.set(null);
          this.setUploadError(itemId, (err as Error)?.message ?? 'Failed to start upload.');
        },
      });
  }

  protected proceedToSignoff(): void {
    if (!this.canProceed()) return;
    void this.router.navigate(['signoff'], { relativeTo: this.route });
  }

  protected goBack(): void {
    void this.router.navigate(['..'], { relativeTo: this.route });
  }

  protected savedLabel(): string {
    const at = this.lastSavedAt();
    if (!at) return 'Saved';
    const diffSec = Math.round((Date.now() - at.getTime()) / 1000);
    if (diffSec < 5) return 'Saved just now';
    if (diffSec < 60) return `Saved ${diffSec}s ago`;
    return `Saved at ${at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  }

  private applyDetail(detail: InspectionDetailDto): void {
    this.detail.set(detail);
    const map: Record<string, InspectionItemResult> = {};
    for (const it of detail.reportJson?.items ?? []) {
      map[it.itemId] = { ...it, photoKeys: it.photoKeys ?? [] };
    }
    this.itemsByIdSig.set(map);
  }

  private updateItem(
    itemId: string,
    mutator: (current: InspectionItemResult | null) => InspectionItemResult,
  ): void {
    if (this.readonly()) return;
    this.itemsByIdSig.update((map) => {
      const next = { ...map };
      next[itemId] = mutator(map[itemId] ?? null);
      return next;
    });
    this.scheduleAutosave();
  }

  private scheduleAutosave(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this.flushAutosave(), AUTOSAVE_DEBOUNCE_MS);
  }

  private flushAutosave(): void {
    const items = Object.values(this.itemsByIdSig()).map((it) => ({
      ...it,
      photoKeys: it.photoKeys ?? [],
    }));
    this.saveState.set('saving');
    this.pendingSave?.unsubscribe();
    this.pendingSave = this.service
      .saveProgress(this.inspectionId, { items })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (detail) => {
          this.detail.set({ ...detail });
          if (detail.reportJson) {
            const map: Record<string, InspectionItemResult> = {};
            for (const it of detail.reportJson.items) {
              map[it.itemId] = { ...it, photoKeys: it.photoKeys ?? [] };
            }
            this.itemsByIdSig.set(map);
          }
          this.saveState.set('saved');
          this.lastSavedAt.set(new Date());
        },
        error: (err) => {
          this.saveState.set('error');
          this.error.set((err as Error)?.message ?? 'Failed to save progress.');
        },
      });
  }

  private uploadAndAttach(
    itemId: string,
    presign: InspectionPhotoPresignResponse,
    file: File,
  ): void {
    this.http
      .put(presign.uploadUrl, file, { headers: { 'Content-Type': file.type } })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.uploadingItemId.set(null);
          // Store the publicUrl (not the raw S3 key) so the thumbnail can
          // render directly. The schema field is named `photoKeys` for
          // backwards-compat but accepts any string — URLs are valid.
          this.updateItem(itemId, (current) => ({
            itemId,
            status: current?.status ?? 'pass',
            notes: current?.notes,
            photoKeys: [...(current?.photoKeys ?? []), presign.publicUrl],
          }));
        },
        error: (err) => {
          this.uploadingItemId.set(null);
          this.setUploadError(itemId, (err as Error)?.message ?? 'Upload failed.');
        },
      });
  }

  private setUploadError(itemId: string, message: string | null): void {
    this.uploadErrors.update((map) => ({ ...map, [itemId]: message }));
  }

  private normalizeContentType(mime: string): AllowedContentType | null {
    switch (mime) {
      case 'image/jpeg':
      case 'image/jpg':
        return 'image/jpeg';
      case 'image/png':
        return 'image/png';
      case 'image/webp':
        return 'image/webp';
      case 'image/heic':
      case 'image/heif':
        return 'image/heic';
      default:
        return null;
    }
  }

  private failsHaveNotes(): boolean {
    return Object.values(this.itemsByIdSig()).every(
      (it) => it.status !== 'fail' || (it.notes ?? '').trim().length > 0,
    );
  }
}
