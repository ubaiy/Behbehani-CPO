import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import type {
  CustomerSignDto,
  PublicInspectionSummary,
} from '@behbehani-cpo/shared-types';
import {
  InspectionSignService,
  type FetchSignPageResult,
} from '../../data/inspection-sign.service';
import { SignaturePadComponent } from './signature-pad.component';

type ViewState =
  | { kind: 'loading' }
  | { kind: 'form'; data: PublicInspectionSummary; customerFirstName: string }
  | { kind: 'expired' }
  | { kind: 'revoked' }
  | { kind: 'already_signed' }
  | { kind: 'not_found' }
  | { kind: 'network_error' }
  | { kind: 'submitted' };

@Component({
  selector: 'app-inspection-sign-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, SignaturePadComponent],
  template: `
    <!-- Bare public layout — no app shell. The page is opened from an SMS
         link; the storefront's buy/sell nav would be confusing context. -->
    <div class="min-h-screen bg-surface-cool">
      <!-- ─── Public header (Behbehani Motors brand) ────────────────── -->
      <header class="border-b border-line bg-white">
        <div class="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <a [routerLink]="['/', currentLocale()]" class="inline-flex items-center" [attr.aria-label]="'app.company' | translate">
            <img src="assets/bm/logo.png" [alt]="'app.company' | translate" class="h-9 w-auto sm:h-10" />
          </a>
          <div class="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor" class="text-brand-600" aria-hidden="true"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            {{ 'inspectionSign.secure' | translate }}
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-2xl px-4 py-6 pb-32">
        <!-- LOADING -->
        @if (state().kind === 'loading') {
          <div class="rounded-2xl border border-line bg-white p-10 text-center text-sm text-muted">
            {{ 'inspectionSign.loading' | translate }}
          </div>
        }

        <!-- ERROR / TERMINAL STATES -->
        @if (terminalState(); as t) {
          <div class="mt-8 rounded-3xl border border-line bg-white p-8 text-center shadow-brand-sm">
            @switch (t) {
              @case ('expired') { <p class="sr-only">This signing link has expired.</p> }
              @case ('revoked') { <p class="sr-only">This signing link has been revoked.</p> }
              @case ('already_signed') { <p class="sr-only">This inspection has already been signed.</p> }
              @case ('submitted') { <p class="sr-only">Your signature has been submitted successfully.</p> }
              @case ('not_found') { <p class="sr-only">This signing link could not be found.</p> }
              @case ('network_error') { <p class="sr-only">We could not reach the inspection service.</p> }
            }
            <div class="mx-auto inline-grid h-14 w-14 place-items-center rounded-full" [class.bg-brand-50]="t === 'expired' || t === 'revoked' || t === 'network_error'" [class.text-brand-700]="t === 'expired' || t === 'revoked' || t === 'network_error'" [class.bg-brand-700]="t === 'already_signed' || t === 'submitted'" [class.text-white]="t === 'already_signed' || t === 'submitted'" [class.bg-surface-cool]="t === 'not_found'" [class.text-ink-3]="t === 'not_found'">
              @switch (t) {
                @case ('expired') { <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> }
                @case ('revoked') { <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/></svg> }
                @case ('already_signed') { <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg> }
                @case ('submitted') { <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg> }
                @case ('not_found') { <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg> }
                @case ('network_error') { <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 9a16 16 0 0118 0M6 12a11 11 0 0112 0M9 15a6 6 0 016 0M12 18.5h.01"/></svg> }
              }
            </div>
            <h1 class="mt-4 font-display text-[22px] font-bold tracking-[-0.025em] text-ink">
              {{ ('inspectionSign.states.' + terminalKey(t) + '.title') | translate }}
            </h1>
            <p class="mt-2 text-[14px] text-muted">
              {{ ('inspectionSign.states.' + terminalKey(t) + '.sub') | translate }}
            </p>
            @if (t === 'expired' || t === 'revoked' || t === 'network_error') {
              <a href="tel:+96522282282" class="mt-5 inline-flex items-center gap-2 rounded-pill bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                {{ ('inspectionSign.states.' + terminalKey(t) + '.cta') | translate }}
              </a>
            } @else {
              <a [routerLink]="['/', currentLocale()]" class="mt-5 inline-flex items-center gap-2 rounded-pill bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                {{ ('inspectionSign.states.' + terminalKey(t) + '.cta') | translate }}
              </a>
            }
          </div>
        }

        <!-- ACTIVE SIGNING FORM -->
        @if (formState(); as s) {
          <!-- Greeting -->
          <div class="mb-5 text-center">
            <h1 class="font-display text-[24px] font-bold tracking-[-0.025em] text-ink">
              {{ 'inspectionSign.greeting' | translate }}
            </h1>
            <p class="mt-1 text-[13px] text-muted">
              {{ 'inspectionSign.greetingSub' | translate: { name: s.customerFirstName } }}
            </p>
          </div>

          <!-- Vehicle + score banner -->
          <div class="mb-3 rounded-2xl border border-line bg-white p-4 shadow-brand-sm">
            <div class="flex items-center gap-4">
              <div class="relative h-20 w-20 flex-shrink-0">
                <svg viewBox="0 0 36 36" class="h-full w-full">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#E2E8F0" stroke-width="3"/>
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#2563eb" stroke-width="3" [attr.stroke-dasharray]="scoreDasharray(s.data.overallScore)" stroke-dashoffset="25" transform="rotate(-90 18 18)" stroke-linecap="round"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="font-display text-[20px] font-bold tabular-nums text-ink">{{ s.data.overallScore ?? '—' }}</span>
                  <span class="text-[10px] text-muted">{{ 'inspectionSign.score.of' | translate }}</span>
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[15px] font-bold leading-tight text-ink">{{ vehicleLabel(s.data) }}</p>
                @if (s.data.vehicle.vinMasked) {
                  <p class="mt-0.5 font-mono text-[11px] text-muted">{{ 'inspectionSign.score.vinMask' | translate }} {{ s.data.vehicle.vinMasked }}</p>
                }
                @if (s.data.inspectedAt) {
                  <p class="mt-1 text-[11px] text-muted">{{ 'inspectionSign.score.inspectedAt' | translate: { date: formatDate(s.data.inspectedAt) } }}</p>
                }
              </div>
            </div>
          </div>

          <!-- Section scores -->
          <div class="mb-3 rounded-2xl border border-line bg-white p-4 shadow-brand-sm">
            <p class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{{ 'inspectionSign.sectionScores' | translate }}</p>
            <div class="flex flex-col gap-2.5 text-[14px]">
              @for (entry of sectionEntries(s.data); track entry.key) {
                <div class="flex items-center gap-3">
                  <span class="flex-1 text-ink-2">{{ ('inspectionSign.sections.' + entry.key) | translate }}</span>
                  <div class="h-2 w-24 overflow-hidden rounded-pill bg-slate-200">
                    <div class="h-full bg-brand-700" [style.width.%]="entry.score"></div>
                  </div>
                  <span class="w-8 text-end font-semibold tabular-nums text-ink-2">{{ entry.score }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Items needing attention (slate for advisory, red for fail — NO amber) -->
          <div class="mb-3 rounded-2xl border border-line bg-white p-4 shadow-brand-sm">
            <p class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{{ 'inspectionSign.attention.title' | translate }}</p>
            @if (s.data.itemsNeedingAttention.length === 0) {
              <p class="text-[13px] text-muted">{{ 'inspectionSign.attention.empty' | translate }}</p>
            } @else {
              <ul class="flex flex-col gap-3">
                @for (item of s.data.itemsNeedingAttention; track item.itemId) {
                  <li class="flex items-start gap-2.5">
                    @if (item.status === 'fail') {
                      <span class="mt-0.5 inline-grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-red-100 text-[11px] font-bold text-red-700">!</span>
                    } @else {
                      <span class="mt-0.5 inline-grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-surface-cool text-[11px] font-bold text-ink-3">i</span>
                    }
                    <div class="min-w-0 flex-1">
                      <p class="text-[13px] font-medium text-ink">{{ currentLocale() === 'ar' ? item.labelAr : item.labelEn }}</p>
                      @if (item.notes) { <p class="mt-0.5 text-[12px] text-muted">{{ item.notes }}</p> }
                    </div>
                  </li>
                }
              </ul>
            }
          </div>

          <!-- PDF download link — server does not yet emit a PDF URL; show a friendly notice instead of a dead button. -->
          <div class="mb-5 block w-full rounded-2xl border border-line bg-white p-4 text-left shadow-brand-sm">
            <div class="flex items-center gap-3">
              <div class="inline-grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 12h6M9 16h6M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>
              </div>
              <div class="flex-1">
                <p class="text-[14px] font-semibold text-ink">{{ 'inspectionSign.pdf.title' | translate }}</p>
                <p class="text-[12px] text-muted-2">{{ 'inspectionSign.pdf.unavailable' | translate }}</p>
              </div>
            </div>
          </div>

          <!-- ════ SIGNATURE SECTION ════ -->
          <div class="mb-5 rounded-2xl border-2 border-brand-200 bg-white p-5 shadow-brand-sm">
            <p class="text-[15px] font-bold text-ink">{{ 'inspectionSign.signature.title' | translate }}</p>
            <p class="mt-0.5 text-[12px] text-muted">{{ 'inspectionSign.signature.sub' | translate }}</p>

            <div class="mt-4">
              <app-signature-pad
                [placeholder]="'inspectionSign.signature.placeholder' | translate"
                [clearLabel]="'inspectionSign.signature.clear' | translate"
                (signatureChange)="onSignature($event)"
              />
            </div>
            <p class="mt-2 text-[11px] text-muted-2">{{ 'inspectionSign.signature.savedNote' | translate }}</p>

            <label class="mt-4 flex flex-col gap-1.5">
              <span class="text-[12px] font-medium text-ink-3">{{ 'inspectionSign.signature.typedName' | translate }}</span>
              <input type="text" [(ngModel)]="typedName" name="typedName" [placeholder]="'inspectionSign.signature.typedNamePh' | translate" class="h-11 w-full rounded-xl border border-line bg-surface-soft px-3 text-[14px] text-ink outline-none transition-colors focus:border-brand-500 focus:bg-white" maxlength="200" autocomplete="name" />
            </label>

            <label class="mt-3 flex flex-col gap-1.5">
              <span class="text-[12px] font-medium text-ink-3">{{ 'inspectionSign.signature.civilId' | translate }}</span>
              <input type="text" inputmode="numeric" [(ngModel)]="civilId" name="civilId" [placeholder]="'inspectionSign.signature.civilIdPh' | translate" class="h-11 w-32 rounded-md border border-line bg-surface-soft px-3 font-mono tabular-nums text-[14px] text-ink outline-none transition-colors focus:border-brand-500 focus:bg-white" maxlength="4" pattern="\\d{4}" />
              <span class="text-[11px] text-muted-2">{{ 'inspectionSign.signature.civilIdHint' | translate }}</span>
            </label>

            <div class="mt-4 flex flex-col gap-2.5">
              @for (c of consentKeys; track c) {
                <label class="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-surface-soft">
                  <input type="checkbox" [(ngModel)]="consent[c]" [name]="'consent_' + c" class="mt-1 h-4 w-4 rounded border-line text-brand-700" />
                  <span class="text-[13px] leading-relaxed text-ink-2">{{ ('inspectionSign.signature.' + c) | translate }}</span>
                </label>
              }
            </div>

            @if (validationError()) {
              <div class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{{ validationError() }}</div>
            }

            <button type="button" (click)="submit()" [disabled]="submitting()" class="mt-5 w-full rounded-pill bg-brand-700 px-4 py-3 text-base font-semibold text-white shadow-brand-sm hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50">
              @if (submitting()) {
                <span class="inline-flex items-center justify-center gap-2">
                  <svg viewBox="0 0 24 24" width="16" height="16" class="animate-spin" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                  {{ 'inspectionSign.signature.submitting' | translate }}
                </span>
              } @else {
                {{ 'inspectionSign.signature.submit' | translate }}
              }
            </button>

            <p class="mt-3 text-center text-[11px] text-muted-2">{{ 'inspectionSign.signature.legal' | translate }}</p>
          </div>

          <!-- Link expiry footer -->
          @if (s.data.signLinkExpiresAt) {
            <div class="text-center text-[11px] text-muted-2">
              <p>{{ 'inspectionSign.linkExpiry' | translate: { date: formatDateTime(s.data.signLinkExpiresAt) } }}</p>
              <p class="mt-1">{{ 'inspectionSign.support' | translate: { phone: '+965 1808 100', email: 'concierge&#64;behbehani.com' } }}</p>
            </div>
          }
        }
      </main>

      <!-- Mobile sticky bottom-bar -->
      @if (formState()) {
        <div class="fixed inset-x-0 bottom-0 border-t border-line bg-white px-4 py-3 shadow-brand-lg sm:hidden">
          <button type="button" (click)="submit()" [disabled]="submitting()" class="w-full rounded-pill bg-brand-700 px-4 py-3.5 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50">
            {{ (submitting() ? 'inspectionSign.signature.submitting' : 'inspectionSign.signature.submitMobile') | translate }}
          </button>
        </div>
      }
    </div>
  `,
})
export class InspectionSignPageComponent implements OnInit {
  private readonly language = inject(LanguageService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(InspectionSignService);

  readonly currentLocale = computed(() => this.language.current());
  readonly arrowPath = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));

  readonly state = signal<ViewState>({ kind: 'loading' });
  readonly submitting = signal(false);
  readonly validationError = signal<string | null>(null);

  drawnSignatureSvg = '';
  typedName = '';
  civilId = '';
  consent: Record<'consent1' | 'consent2' | 'consent3', boolean> = {
    consent1: false,
    consent2: false,
    consent3: false,
  };
  readonly consentKeys: ReadonlyArray<'consent1' | 'consent2' | 'consent3'> = [
    'consent1',
    'consent2',
    'consent3',
  ];

  private token = '';

  ngOnInit(): void {
    const set = () => this.title.setTitle(this.translate.instant('inspectionSign.metaTitle'));
    set();
    this.translate.onLangChange.subscribe(set);
    /* Don't index this page. */
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.state.set({ kind: 'not_found' });
      return;
    }
    this.api.fetch$(this.token).subscribe((res) => this.applyFetch(res));
  }

  /* ─── State helpers ─────────────────────────────────────────────── */

  formState(): { data: PublicInspectionSummary; customerFirstName: string } | null {
    const s = this.state();
    return s.kind === 'form' ? { data: s.data, customerFirstName: s.customerFirstName } : null;
  }

  terminalState(): 'expired' | 'revoked' | 'already_signed' | 'not_found' | 'network_error' | 'submitted' | null {
    const s = this.state();
    if (
      s.kind === 'expired' ||
      s.kind === 'revoked' ||
      s.kind === 'already_signed' ||
      s.kind === 'not_found' ||
      s.kind === 'network_error' ||
      s.kind === 'submitted'
    ) {
      return s.kind;
    }
    return null;
  }

  terminalKey(t: 'expired' | 'revoked' | 'already_signed' | 'not_found' | 'network_error' | 'submitted'): string {
    switch (t) {
      case 'already_signed':   return 'signed';
      case 'submitted':        return 'signedConfirm';
      case 'not_found':        return 'notFound';
      case 'network_error':    return 'networkError';
      default:                 return t;
    }
  }

  /* ─── Event handlers ────────────────────────────────────────────── */

  onSignature(svg: string): void {
    this.drawnSignatureSvg = svg;
    if (this.validationError()) this.validationError.set(null);
  }

  submit(): void {
    if (!this.drawnSignatureSvg || this.drawnSignatureSvg.length < 20) {
      this.validationError.set(this.translate.instant('inspectionSign.signature.validation.drawRequired'));
      return;
    }
    if (this.typedName.trim().length < 2) {
      this.validationError.set(this.translate.instant('inspectionSign.signature.validation.nameRequired'));
      return;
    }
    if (this.civilId && !/^\d{4}$/.test(this.civilId)) {
      this.validationError.set(this.translate.instant('inspectionSign.signature.validation.civilIdFormat'));
      return;
    }
    if (!this.consent.consent1 || !this.consent.consent2 || !this.consent.consent3) {
      this.validationError.set(this.translate.instant('inspectionSign.signature.validation.consentRequired'));
      return;
    }

    const body: CustomerSignDto = {
      drawnSignatureSvg: this.drawnSignatureSvg,
      typedName: this.typedName.trim(),
      civilIdLast4: this.civilId || undefined,
      accepted: { owner: true, accurate: true, useForOffer: true },
    };

    this.submitting.set(true);
    this.validationError.set(null);
    this.api.submit$(this.token, body).subscribe((res) => {
      this.submitting.set(false);
      if (res.kind === 'ok') {
        this.state.set({ kind: 'submitted' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (res.kind === 'token_invalid') {
        this.state.set({ kind: 'expired' });
      } else if (res.kind === 'already_signed') {
        /* Server says someone (browser duplicate, second device) already
           submitted — surface the terminal "signed" card, not a form error. */
        this.state.set({ kind: 'already_signed' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        this.validationError.set(res.message);
      }
    });
  }

  /* ─── Render helpers ────────────────────────────────────────────── */

  vehicleLabel(data: PublicInspectionSummary): string {
    const v = data.vehicle;
    const parts = [v.year, v.brand, v.model].filter(Boolean).join(' ');
    return parts.trim() || '—';
  }

  sectionEntries(data: PublicInspectionSummary): ReadonlyArray<{ key: string; score: number }> {
    const order = ['exterior', 'interior', 'engine_drivetrain', 'electrical', 'safety', 'documentation'];
    return order
      .filter((k) => data.sectionScores[k] !== undefined)
      .map((k) => ({ key: k, score: data.sectionScores[k] }));
  }

  scoreDasharray(score: number | null): string {
    const v = Math.max(0, Math.min(100, score ?? 0));
    return `${v} 100`;
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(this.currentLocale() === 'ar' ? 'ar-KW' : 'en-KW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString(this.currentLocale() === 'ar' ? 'ar-KW' : 'en-KW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private applyFetch(res: FetchSignPageResult): void {
    switch (res.kind) {
      case 'ok':
        this.state.set({ kind: 'form', data: res.data, customerFirstName: res.customerFirstName });
        break;
      case 'expired':
      case 'revoked':
      case 'already_signed':
      case 'not_found':
      case 'network_error':
        this.state.set({ kind: res.kind });
        break;
    }
  }
}
