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
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@behbehani-cpo/data-access';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import type { AddressDto } from '@behbehani-cpo/shared-types';
import { AddressesService } from '../../data/addresses.service';
import { SignInModalService } from '../auth/sign-in-modal.service';

// ─── Local types ──────────────────────────────────────────────────────────────

type KuwaitGovernorate = 'capital' | 'hawalli' | 'ahmadi' | 'jahra' | 'farwaniya' | 'mubarak_al_kabeer';

const GOV_OPTIONS: { value: KuwaitGovernorate; labelKey: string }[] = [
  { value: 'capital',           labelKey: 'account.addresses.governorate.capital' },
  { value: 'hawalli',           labelKey: 'account.addresses.governorate.hawalli' },
  { value: 'ahmadi',            labelKey: 'account.addresses.governorate.ahmadi' },
  { value: 'jahra',             labelKey: 'account.addresses.governorate.jahra' },
  { value: 'farwaniya',         labelKey: 'account.addresses.governorate.farwaniya' },
  { value: 'mubarak_al_kabeer', labelKey: 'account.addresses.governorate.mubarak_al_kabeer' },
];

interface AddressForm {
  label: string; governorate: KuwaitGovernorate;
  area: string; block: string; street: string; building: string; unit: string; isDefault: boolean;
}

const emptyForm = (): AddressForm =>
  ({ label: '', governorate: 'capital', area: '', block: '', street: '', building: '', unit: '', isDefault: false });

type PageState =
  | { kind: 'loading' }
  | { kind: 'ok'; addresses: AddressDto[] }
  | { kind: 'empty' }
  | { kind: 'error'; reason: 'unauthenticated' | 'network_error' };

interface ModalState {
  open: boolean; mode: 'create' | 'edit'; editingId?: string; formValues: AddressForm; saving: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-account-addresses',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    @if (!auth.isSignedIn()) {
      <!-- Hero — unauthenticated: rounded-3xl card -->
      <div class="container-page py-8 mx-auto max-w-4xl">
        <div class="rounded-3xl p-6 sm:p-8 text-white"
             style="background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%);">
          <h1 class="font-display text-[clamp(24px,3vw,38px)] font-extrabold leading-tight text-white">
            {{ 'account.addresses.signInRequired.title' | translate }}
          </h1>
          <p class="mt-2 text-[14px] text-white/80">{{ 'account.addresses.signInRequired.body' | translate }}</p>
        </div>
      </div>
    } @else {
      <!-- Back link -->
      <div class="container-page pt-6">
        <a [routerLink]="['/', locale(), 'account']" class="inline-flex items-center text-[13px] font-medium text-brand-700 hover:text-brand-900 hover:underline">
          {{ 'account.backToHub' | translate }}
        </a>
      </div>

      <!-- Hero — rounded-3xl framed card (not full-bleed) -->
      <div class="container-page py-8 mx-auto max-w-4xl">
        <div class="rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 text-white"
             style="background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%);">
          <div>
            <p class="text-white/70 text-[11px] font-semibold uppercase tracking-wider mb-1">{{ 'account.addresses.tab' | translate }}</p>
            <h1 class="font-display text-[clamp(24px,3vw,38px)] font-extrabold leading-tight text-white">{{ 'account.addresses.title' | translate }}</h1>
            <p class="mt-2 text-[14px] text-white/80">{{ 'account.addresses.sub' | translate }}</p>
          </div>
          <button type="button" (click)="openCreate()"
            class="inline-flex items-center gap-2 shrink-0 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors min-h-[44px]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            {{ 'account.addresses.addCta' | translate }}
          </button>
        </div>
      </div>

      <main class="container-page py-8 sm:py-10 mx-auto max-w-4xl">
        @if (pageState().kind === 'loading') {
          <div class="flex items-center justify-center py-20">
            <div class="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-700 animate-spin"></div>
          </div>
        }
        @if (pageState().kind === 'error') {
          <div class="rounded-2xl border border-line bg-white p-8 text-center shadow-brand-sm">
            <p class="text-[15px] font-semibold text-ink-2">{{ errorMessage() }}</p>
          </div>
        }
        @if (pageState().kind === 'empty') {
          <div class="rounded-2xl border border-dashed border-line bg-white p-10 text-center shadow-brand-sm">
            <div class="mx-auto mb-4 w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
              <svg class="w-8 h-8 text-brand-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
              </svg>
            </div>
            <p class="font-display font-semibold text-[16px] text-ink-2 mb-1">{{ 'account.addresses.empty.title' | translate }}</p>
            <p class="text-[13px] text-muted mb-5">{{ 'account.addresses.empty.body' | translate }}</p>
            <button type="button" (click)="openCreate()"
              class="inline-flex items-center gap-2 rounded-xl bg-brand-700 hover:bg-brand-800 px-6 py-3 text-[13px] font-semibold text-white transition-colors shadow-brand-sm min-h-[44px]">
              {{ 'account.addresses.empty.cta' | translate }}
            </button>
          </div>
        }
        @if (pageState().kind === 'ok') {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (addr of addresses(); track addr.id) {
              <div class="relative rounded-2xl border border-line bg-white p-5 shadow-brand-sm flex flex-col gap-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-display font-bold text-[14px] text-ink truncate">{{ addr.label }}</span>
                    @if (addr.isDefault) {
                      <span class="inline-flex items-center shrink-0 rounded-pill bg-brand-50 border border-brand-200 px-2 py-0.5 text-[11px] font-semibold text-brand-700">{{ 'account.addresses.card.defaultPill' | translate }}</span>
                    }
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button type="button" (click)="openEdit(addr)" [attr.aria-label]="'account.addresses.card.editAria' | translate"
                      class="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-muted hover:border-brand-300 hover:text-brand-700 transition-colors">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/></svg>
                    </button>
                    <button type="button" (click)="confirmDelete(addr)" [attr.aria-label]="'account.addresses.card.deleteAria' | translate"
                      class="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-muted hover:border-red-200 hover:text-red-500 transition-colors">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                    </button>
                  </div>
                </div>
                <div class="text-[13px] text-ink-2 space-y-0.5">
                  <p>{{ govLabel(addr.governorate) }}</p>
                  <p>{{ addr.area }}, {{ 'account.addresses.card.blockStreetBuilding' | translate:{block: addr.block, street: addr.street} }}</p>
                  <p>
                    {{ 'account.addresses.card.buildingOnly' | translate:{building: addr.building} }}@if (addr.unit) {<span>{{ 'account.addresses.card.unitSuffix' | translate:{unit: addr.unit} }}</span>}
                  </p>
                </div>
                <!-- Map placeholder — Google Maps integration in v1.4 -->
                <div class="rounded-2xl bg-slate-100 border border-brand-200 h-28 flex flex-col items-center justify-center gap-1.5">
                  <svg class="w-6 h-6 text-brand-300" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd"/></svg>
                  <span class="text-[11px] text-brand-700 font-medium">{{ 'account.addresses.card.mapComingSoon' | translate }}</span>
                </div>
                @if (!addr.isDefault) {
                  <button type="button" (click)="onSetDefault(addr.id)"
                    class="text-brand-700 text-[12px] font-semibold hover:underline text-start min-h-[44px] flex items-center">
                    {{ 'account.addresses.card.setDefaultCta' | translate }}
                  </button>
                }
              </div>
            }
          </div>
        }
        @if (toast()) {
          <div class="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 sm:w-auto z-50 flex items-center gap-3 rounded-2xl bg-ink px-5 py-3.5 shadow-brand-lg text-white text-[13px] font-medium" role="status" aria-live="polite">
            <svg class="w-4 h-4 text-brand-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            {{ toast() }}
          </div>
        }
      </main>
    }

    <!-- Add / Edit Modal -->
    @if (modal().open) {
      <div class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" (click)="closeModal()" aria-hidden="true"></div>
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
           role="dialog" aria-modal="true" [attr.aria-label]="modal().mode === 'create' ? ('account.addresses.modal.createTitle' | translate) : ('account.addresses.modal.editTitle' | translate)">
        <div class="w-full sm:max-w-xl max-h-[95dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-brand-lg">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-line sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl">
            <h2 class="font-display font-bold text-[16px] text-ink">
              {{ (modal().mode === 'create' ? ('account.addresses.modal.createTitle' | translate) : ('account.addresses.modal.editTitle' | translate)) }}
            </h2>
            <button type="button" (click)="closeModal()" aria-label="Close"
              class="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-muted hover:border-brand-300 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <!-- Body -->
          <div class="px-6 py-5 space-y-4">
            <!-- Label -->
            <div>
              <label class="block text-[13px] font-semibold text-ink-2 mb-2">{{ 'account.addresses.modal.labelLabel' | translate }}</label>
              <div class="flex gap-2 mb-2 flex-wrap">
                @for (preset of labelPresets; track preset.value) {
                  <button type="button" (click)="setLabel(preset.value)" [class]="labelBtnClass(preset.value)" class="min-h-[44px]">
                    {{ preset.labelKey | translate }}
                  </button>
                }
              </div>
              <input type="text" [value]="modal().formValues.label" (input)="patchForm({ label: $any($event.target).value })"
                [placeholder]="'account.addresses.modal.labelLabel' | translate"
                class="w-full rounded-xl border border-line px-4 py-2.5 text-[13px] text-ink placeholder-muted-2 focus:outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 min-h-[44px]"/>
            </div>
            <!-- Governorate -->
            <div>
              <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">{{ 'account.addresses.modal.governorateLabel' | translate }}</label>
              <select [value]="modal().formValues.governorate" (change)="patchForm({ governorate: $any($event.target).value })"
                class="w-full rounded-xl border border-line px-4 py-2.5 text-[13px] text-ink bg-white focus:outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 min-h-[44px]">
                @for (opt of governorateOptions; track opt.value) {
                  <option [value]="opt.value" [selected]="modal().formValues.governorate === opt.value">{{ opt.labelKey | translate }}</option>
                }
              </select>
            </div>
            <!-- Area / Block -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">{{ 'account.addresses.modal.areaLabel' | translate }}</label>
                <input type="text" [value]="modal().formValues.area" (input)="patchForm({ area: $any($event.target).value })" placeholder="e.g. Salmiya"
                  class="w-full rounded-xl border border-line px-4 py-2.5 text-[13px] text-ink placeholder-muted-2 focus:outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 min-h-[44px]"/>
              </div>
              <div>
                <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">{{ 'account.addresses.modal.blockLabel' | translate }}</label>
                <input type="text" [value]="modal().formValues.block" (input)="patchForm({ block: $any($event.target).value })" placeholder="e.g. 12"
                  class="w-full rounded-xl border border-line px-4 py-2.5 text-[13px] text-ink placeholder-muted-2 focus:outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 min-h-[44px]"/>
              </div>
            </div>
            <!-- Street / Building -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">{{ 'account.addresses.modal.streetLabel' | translate }}</label>
                <input type="text" [value]="modal().formValues.street" (input)="patchForm({ street: $any($event.target).value })" placeholder="e.g. 14"
                  class="w-full rounded-xl border border-line px-4 py-2.5 text-[13px] text-ink placeholder-muted-2 focus:outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 min-h-[44px]"/>
              </div>
              <div>
                <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">{{ 'account.addresses.modal.buildingLabel' | translate }}</label>
                <input type="text" [value]="modal().formValues.building" (input)="patchForm({ building: $any($event.target).value })" placeholder="e.g. 7"
                  class="w-full rounded-xl border border-line px-4 py-2.5 text-[13px] text-ink placeholder-muted-2 focus:outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 min-h-[44px]"/>
              </div>
            </div>
            <!-- Unit (optional) -->
            <div>
              <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">
                {{ 'account.addresses.modal.unitLabel' | translate }}
                <span class="font-normal text-muted ms-1">({{ 'account.addresses.modal.unitOptional' | translate }})</span>
              </label>
              <input type="text" [value]="modal().formValues.unit" (input)="patchForm({ unit: $any($event.target).value })" placeholder="e.g. Flat 3A"
                class="w-full rounded-xl border border-line px-4 py-2.5 text-[13px] text-ink placeholder-muted-2 focus:outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 min-h-[44px]"/>
            </div>
            <!-- Map placeholder — lat/lng stay null in v1.3; Google Maps in v1.4 -->
            <div>
              <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">{{ 'account.addresses.modal.mapPlaceholder' | translate }}</label>
              <div class="h-40 rounded-xl bg-slate-100 border border-brand-200 flex flex-col items-center justify-center gap-2 text-center px-4">
                <svg class="w-8 h-8 text-brand-300" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd"/></svg>
                <p class="text-[13px] font-semibold text-brand-700">{{ 'account.addresses.modal.mapPlaceholder' | translate }}</p>
                <!-- v1.3.6 §1 locked annotation tokens: bg-slate-100 text-brand-700 border-brand-200 -->
                <span class="inline-flex items-center rounded-full bg-slate-100 border border-brand-200 px-3 py-0.5 text-[11px] font-semibold text-brand-700">{{ 'account.addresses.modal.mapsComingSoon' | translate }}</span>
              </div>
            </div>
            <!-- Default checkbox -->
            <label class="flex items-center gap-2.5 cursor-pointer min-h-[44px]">
              <input type="checkbox" [checked]="modal().formValues.isDefault" (change)="patchForm({ isDefault: $any($event.target).checked })" class="w-4 h-4 rounded border-line accent-brand-700"/>
              <span class="text-[13px] font-medium text-ink-2">{{ 'account.addresses.modal.setDefaultLabel' | translate }}</span>
            </label>
          </div>
          <!-- Footer -->
          <div class="flex gap-3 px-6 pb-6 pt-2">
            <button type="button" (click)="saveAddress()" [disabled]="modal().saving"
              class="flex-1 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-60 px-5 py-3 text-[13px] font-semibold text-white transition-colors shadow-brand-sm min-h-[44px]">
              {{ modal().saving ? ('account.addresses.modal.savingCta' | translate) : ('account.addresses.modal.saveCta' | translate) }}
            </button>
            <button type="button" (click)="closeModal()" [disabled]="modal().saving"
              class="flex-1 rounded-xl border border-line hover:border-brand-300 disabled:opacity-60 px-5 py-3 text-[13px] font-semibold text-ink-3 transition-colors min-h-[44px]">
              {{ 'account.addresses.modal.cancelCta' | translate }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AccountAddressesComponent {
  readonly auth = inject(AuthService);
  private readonly addressesService = inject(AddressesService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly signInModal = inject(SignInModalService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);

  readonly locale = computed(() => this.language.current());
  readonly addresses = this.addressesService.addresses;
  readonly governorateOptions = GOV_OPTIONS;
  readonly labelPresets = [
    { value: 'home',   labelKey: 'account.addresses.modal.labelHome' },
    { value: 'office', labelKey: 'account.addresses.modal.labelOffice' },
    { value: 'other',  labelKey: 'account.addresses.modal.labelOther' },
  ];

  readonly pageState = signal<PageState>({ kind: 'loading' });

  readonly errorMessage = computed(() => {
    const s = this.pageState();
    if (s.kind !== 'error') return '';
    return s.reason === 'unauthenticated'
      ? this.translate.instant('account.addresses.signInRequired.title')
      : this.translate.instant('account.addresses.errors.network');
  });

  readonly modal = signal<ModalState>({
    open: false, mode: 'create', editingId: undefined, formValues: emptyForm(), saving: false,
  });
  readonly toast = signal<string | null>(null);

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Open sign-in modal if guest (SSR-safe)
    effect(() => {
      if (isPlatformBrowser(this.platformId) && !this.auth.isSignedIn()) this.signInModal.open();
    }, { allowSignalWrites: true });

    // Meta title
    effect(() => {
      this.translate.get('account.addresses.metaTitle').subscribe((t) => {
        this.titleService.setTitle(t);
        this.meta.updateTag({ name: 'description', content: t });
      });
    });

    // Load addresses once on browser
    effect(() => {
      if (!isPlatformBrowser(this.platformId) || !this.auth.isSignedIn()) {
        if (!this.auth.isSignedIn()) this.pageState.set({ kind: 'error', reason: 'unauthenticated' });
        return;
      }
      this.addressesService.list().subscribe((result) => {
        if (result.kind === 'ok') {
          this.pageState.set(result.addresses.length === 0 ? { kind: 'empty' } : { kind: 'ok', addresses: result.addresses });
        } else {
          this.pageState.set({ kind: 'error', reason: result.kind === 'unauthenticated' ? 'unauthenticated' : 'network_error' });
        }
      });
    }, { allowSignalWrites: true });

    // Sync pageState with addresses signal after mutations
    effect(() => {
      const items = this.addresses();
      const current = this.pageState();
      if (current.kind === 'loading' || current.kind === 'error') return;
      this.pageState.set(items.length === 0 ? { kind: 'empty' } : { kind: 'ok', addresses: items });
    }, { allowSignalWrites: true });
  }

  // ── Modal ────────────────────────────────────────────────────────────────────

  openCreate(): void {
    this.modal.set({ open: true, mode: 'create', editingId: undefined, formValues: emptyForm(), saving: false });
  }

  openEdit(addr: AddressDto): void {
    this.modal.set({
      open: true, mode: 'edit', editingId: addr.id, saving: false,
      formValues: { label: addr.label, governorate: addr.governorate as KuwaitGovernorate,
        area: addr.area, block: addr.block, street: addr.street, building: addr.building,
        unit: addr.unit ?? '', isDefault: addr.isDefault },
    });
  }

  closeModal(): void {
    if (!this.modal().saving) this.modal.update((m) => ({ ...m, open: false }));
  }

  patchForm(partial: Partial<AddressForm>): void {
    this.modal.update((m) => ({ ...m, formValues: { ...m.formValues, ...partial } }));
  }

  setLabel(value: string): void {
    this.patchForm({ label: value });
  }

  labelBtnClass(value: string): string {
    const active = this.modal().formValues.label === value;
    const base = 'px-3 py-1.5 rounded-lg border-2 text-[12px] font-semibold transition-colors';
    return active
      ? `${base} border-brand-700 bg-brand-50 text-brand-800`
      : `${base} border-line bg-white text-ink-3 hover:border-brand-300`;
  }

  govLabel(value: string): string {
    const opt = GOV_OPTIONS.find((o) => o.value === value);
    return opt ? this.translate.instant(opt.labelKey) : value;
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  saveAddress(): void {
    const m = this.modal();
    const f = m.formValues;
    if (!f.label || !f.area || !f.block || !f.street || !f.building) return;
    this.modal.update((s) => ({ ...s, saving: true }));
    const dto = { label: f.label, governorate: f.governorate, area: f.area, block: f.block,
      street: f.street, building: f.building, unit: f.unit || null, lat: null, lng: null, isDefault: f.isDefault };
    const call$ = m.mode === 'create'
      ? this.addressesService.create(dto)
      : this.addressesService.update(m.editingId!, dto);
    call$.subscribe((result) => {
      this.modal.update((s) => ({ ...s, saving: false }));
      if (result.kind === 'ok') {
        this.modal.update((s) => ({ ...s, open: false }));
        this.showToast(this.translate.instant('account.addresses.modal.savedToast'));
      } else {
        this.showToast(result.kind === 'validation_error'
          ? result.message
          : this.translate.instant('account.addresses.errors.network'));
      }
    });
  }

  confirmDelete(addr: AddressDto): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const msg = this.translate.instant('account.addresses.card.deleteConfirm', { label: addr.label });
    if (!window.confirm(msg)) return;
    this.addressesService.delete(addr.id).subscribe((result) => {
      this.showToast(result.kind === 'ok'
        ? this.translate.instant('account.addresses.modal.deletedToast')
        : this.translate.instant(result.kind === 'not_found'
            ? 'account.addresses.errors.notFound'
            : 'account.addresses.errors.network'));
    });
  }

  onSetDefault(id: string): void {
    this.addressesService.setDefault(id).subscribe((result) => {
      this.showToast(result.kind === 'ok'
        ? this.translate.instant('account.addresses.modal.defaultSetToast')
        : this.translate.instant(result.kind === 'not_found'
            ? 'account.addresses.errors.notFound'
            : 'account.addresses.errors.network'));
    });
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3500);
  }
}
