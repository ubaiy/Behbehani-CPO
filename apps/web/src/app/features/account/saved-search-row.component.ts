import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { SavedSearchDto, SavedSearchQueryPayload } from '@behbehani-cpo/shared-types';

// ── Pure helpers (kept here so the row can render independently) ────────────

function relativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minutes ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hours ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return `${months} months ago`;
  } catch {
    return '';
  }
}

function filterSummary(payload: SavedSearchQueryPayload): string {
  const parts: string[] = [];
  if (payload.brands?.length) parts.push(payload.brands.slice(0, 2).join(', '));
  if (payload.year_min || payload.year_max) {
    const min = payload.year_min ?? '—';
    const max = payload.year_max ?? '—';
    parts.push(`${min}–${max}`);
  }
  if (payload.price_min_fils !== undefined || payload.price_max_fils !== undefined) {
    const minKwd = payload.price_min_fils !== undefined
      ? `KWD ${(payload.price_min_fils / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
      : null;
    const maxKwd = payload.price_max_fils !== undefined
      ? `KWD ${(payload.price_max_fils / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
      : null;
    if (minKwd && maxKwd) parts.push(`${minKwd}–${maxKwd}`);
    else if (minKwd) parts.push(`From ${minKwd}`);
    else if (maxKwd) parts.push(`Up to ${maxKwd}`);
  }
  if (parts.length === 0 && payload.body_types?.length) parts.push(payload.body_types[0]);
  if (parts.length === 0 && payload.fuel_types?.length) parts.push(payload.fuel_types[0]);
  return parts.slice(0, 3).join(' · ') || 'All filters';
}

function payloadToQueryParams(payload: SavedSearchQueryPayload): Record<string, string | string[]> {
  const p: Record<string, string | string[]> = {};
  if (payload.brands?.length) p['brands'] = payload.brands;
  if (payload.models?.length) p['models'] = payload.models;
  if (payload.year_min !== undefined) p['year_min'] = String(payload.year_min);
  if (payload.year_max !== undefined) p['year_max'] = String(payload.year_max);
  if (payload.price_min_fils !== undefined) p['price_min_fils'] = String(payload.price_min_fils);
  if (payload.price_max_fils !== undefined) p['price_max_fils'] = String(payload.price_max_fils);
  if (payload.body_types?.length) p['body_types'] = payload.body_types;
  if (payload.transmissions?.length) p['transmissions'] = payload.transmissions;
  if (payload.fuel_types?.length) p['fuel_types'] = payload.fuel_types;
  if (payload.exterior_colors?.length) p['exterior_colors'] = payload.exterior_colors;
  if (payload.regional_specs?.length) p['regional_specs'] = payload.regional_specs;
  if (payload.inspection_flag !== undefined) p['inspection_flag'] = String(payload.inspection_flag);
  if (payload.warranty_flag !== undefined) p['warranty_flag'] = String(payload.warranty_flag);
  if (payload.sort_by) p['sort_by'] = payload.sort_by;
  if (payload.mileage_min_km !== undefined) p['mileage_min_km'] = String(payload.mileage_min_km);
  if (payload.mileage_max_km !== undefined) p['mileage_max_km'] = String(payload.mileage_max_km);
  return p;
}

/**
 * Single saved-search card row.
 * Presentational: parent owns the list state and rename buffer; this child
 * just emits user intents (toggle notify, open rename, submit rename,
 * cancel rename, type into rename input, open delete confirm).
 */
@Component({
  selector: 'app-saved-search-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div
      class="rounded-2xl border border-line bg-white p-4 shadow-brand-sm hover:shadow-brand hover:border-brand-200 transition-all duration-200"
    >
      <!-- Top row: name + notify toggle -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          @if (renaming) {
            <!-- Inline rename input -->
            <div class="flex items-center gap-2">
              <input
                type="text"
                [value]="renameValue"
                (input)="renameInput.emit($event)"
                class="flex-1 rounded-lg border border-brand-300 px-3 py-1.5 text-[14px] text-ink focus:border-brand-700 focus:outline-none"
                [attr.placeholder]="'account.savedSearches.rename.placeholder' | translate"
              />
              <button
                type="button"
                (click)="submitRename.emit(search)"
                [disabled]="savingRename"
                class="min-h-[36px] rounded-lg bg-brand-700 px-3 py-1 text-[13px] font-medium text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {{ 'account.savedSearches.rename.save' | translate }}
              </button>
              <button
                type="button"
                (click)="cancelRename.emit()"
                class="min-h-[36px] rounded-lg border border-line px-3 py-1 text-[13px] text-ink-2 hover:bg-gray-50"
              >
                {{ 'account.savedSearches.rename.cancel' | translate }}
              </button>
            </div>
          } @else {
            <h3 class="text-[15px] font-bold text-ink truncate">{{ search.name }}</h3>
            <p class="mt-1 text-[12px] text-muted">{{ summary }}</p>
          }
        </div>
        <!-- Notify toggle -->
        <button
          type="button"
          (click)="toggleNotify.emit(search)"
          [attr.aria-label]="(search.notifyOnMatch ? 'account.savedSearches.card.notifyOn' : 'account.savedSearches.card.notifyOff') | translate"
          [attr.aria-pressed]="search.notifyOnMatch"
          class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 mt-0.5"
          [class]="search.notifyOnMatch ? 'bg-brand-700' : 'bg-slate-200'"
        >
          <span
            class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
            [class]="search.notifyOnMatch ? 'translate-x-6' : 'translate-x-1'"
          ></span>
        </button>
      </div>

      <!-- Match info -->
      <p class="mt-3 text-[13px] text-brand-700">
        <strong>{{ search.matchCountAtCreation ?? 0 }}</strong>
        {{ 'account.savedSearches.card.matchesWhenSaved' | translate }}
        @if (search.lastNotifiedAt) {
          <span class="text-muted">
            &nbsp;·&nbsp;{{ 'account.savedSearches.card.lastChecked' | translate }} {{ lastChecked }}
          </span>
        }
      </p>

      <!-- Actions row -->
      <div class="mt-4 flex items-center gap-2 flex-wrap">
        <a
          [routerLink]="['/', locale, 'browse']"
          [queryParams]="queryParams"
          class="inline-flex items-center gap-1 rounded-full bg-brand-700 text-white px-4 py-1.5 text-[13px] font-semibold hover:bg-brand-800 min-h-[44px] transition-colors"
        >
          {{ 'account.savedSearches.card.viewResults' | translate }}
        </a>
        <button
          type="button"
          (click)="openRename.emit(search)"
          class="text-[13px] text-brand-700 hover:text-brand-900 hover:underline min-h-[44px] px-2"
        >
          {{ 'account.savedSearches.card.rename' | translate }}
        </button>
        <button
          type="button"
          (click)="openDelete.emit(search)"
          class="text-[13px] text-red-600 hover:text-red-700 hover:underline min-h-[44px] px-2"
        >
          {{ 'account.savedSearches.card.delete' | translate }}
        </button>
      </div>
    </div>
  `,
})
export class SavedSearchRowComponent {
  @Input({ required: true }) search!: SavedSearchDto;
  @Input({ required: true }) locale!: string;
  /** True when THIS row is currently in inline-rename mode. */
  @Input() renaming = false;
  /** Current rename buffer (only meaningful while `renaming` is true). */
  @Input() renameValue = '';
  /** True while a rename PATCH is in flight (disables the save button). */
  @Input() savingRename = false;

  @Output() toggleNotify = new EventEmitter<SavedSearchDto>();
  @Output() openRename = new EventEmitter<SavedSearchDto>();
  @Output() cancelRename = new EventEmitter<void>();
  @Output() submitRename = new EventEmitter<SavedSearchDto>();
  @Output() renameInput = new EventEmitter<Event>();
  @Output() openDelete = new EventEmitter<SavedSearchDto>();

  get summary(): string {
    return filterSummary(this.search.queryPayload);
  }

  get queryParams(): Record<string, string | string[]> {
    return payloadToQueryParams(this.search.queryPayload);
  }

  get lastChecked(): string {
    return this.search.lastNotifiedAt ? relativeTime(this.search.lastNotifiedAt) : '';
  }
}
