import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService, fmtDate } from '@behbehani-cpo/shared-i18n';
import type { PublicInspectionSummary, RubricSectionKey } from '@behbehani-cpo/shared-types';
import { OffersService, type GetInspectionReportResult } from '../../../data/offers.service';

type ReportState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: PublicInspectionSummary }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'network_error' };

const SECTION_KEYS: RubricSectionKey[] = [
  'exterior',
  'interior',
  'engine_drivetrain',
  'electrical',
  'safety',
  'documentation',
];

const SECTION_I18N: Record<RubricSectionKey, string> = {
  exterior: 'sell.offer.inspectionReport.categories.exterior',
  interior: 'sell.offer.inspectionReport.categories.interior',
  engine_drivetrain: 'sell.offer.inspectionReport.categories.engineDrivetrain',
  electrical: 'sell.offer.inspectionReport.categories.electrical',
  safety: 'sell.offer.inspectionReport.categories.safety',
  documentation: 'sell.offer.inspectionReport.categories.documentation',
};

@Component({
  selector: 'app-cpo-inspection-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <!-- ─── HERO ─────────────────────────────────────────────────────── -->
    <header class="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
      <div class="container-page py-10 sm:py-14 mx-auto max-w-4xl">
        <a
          [routerLink]="['/', locale(), 'sell', 'concierge', 'offer', token()]"
          class="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/80 hover:text-white mb-6"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
          {{ 'sell.offer.inspectionReport.backToOffer' | translate }}
        </a>

        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div class="inline-grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-white/15 border border-white/25">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </div>
          <div>
            <div class="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/30 px-3 py-1 text-[11px] font-semibold text-white mb-2">
              <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
              {{ 'sell.offer.inspectionReport.certifiedBadge' | translate }}
            </div>
            <h1 class="text-white font-display text-[clamp(22px,3vw,34px)] font-extrabold leading-tight tracking-[-0.025em]">
              {{ 'sell.offer.inspectionReport.title' | translate }}
            </h1>
            @if (reportData(); as r) {
              <p class="mt-1 text-[13px] text-white/80">
                {{ r.vehicle.year }} {{ r.vehicle.brand }} {{ r.vehicle.model }}
              </p>
            } @else {
              <p class="mt-1 text-[13px] text-white/80">
                {{ 'sell.offer.inspectionReport.sub' | translate }}
              </p>
            }
          </div>
        </div>
      </div>
    </header>

    <main class="container-page py-8 mx-auto max-w-4xl space-y-6">

      <!-- ─── LOADING ─────────────────────────────────────────────────── -->
      @if (state().kind === 'loading') {
        <div class="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm" aria-busy="true" aria-live="polite">
          <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-600"></span>
          <span class="ml-2 text-[14px] text-slate-500">{{ 'sell.offer.inspectionReport.loading' | translate }}</span>
        </div>
      }

      <!-- ─── ERROR STATES ─────────────────────────────────────────────── -->
      @if (errorKind(); as kind) {
        <div class="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div class="mx-auto inline-grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg>
          </div>
          <h2 class="mt-4 font-display text-[20px] font-bold text-slate-900">
            {{ ('sell.offer.inspectionReport.' + kind + '.title') | translate }}
          </h2>
          <p class="mt-2 text-[13px] text-slate-500">
            {{ ('sell.offer.inspectionReport.' + kind + '.sub') | translate }}
          </p>
          @if (kind === 'network_error') {
            <button
              type="button"
              (click)="retry()"
              class="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-800"
            >
              {{ 'sell.offer.inspectionReport.retry' | translate }}
            </button>
          }
        </div>
      }

      <!-- ─── SCORE CARD ───────────────────────────────────────────────── -->
      @if (reportData(); as r) {
        <div class="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div class="flex items-center gap-6 flex-wrap">

            <!-- Score circle -->
            <div class="relative w-28 h-28 flex-shrink-0" aria-label="{{ r.overallScore }}/100">
              <svg class="w-28 h-28 -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
                <circle cx="56" cy="56" r="46" fill="none" stroke="#e2e8f0" stroke-width="8"/>
                <circle
                  cx="56" cy="56" r="46" fill="none"
                  stroke="#1d4ed8" stroke-width="8"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="scoreDash(r.overallScore)"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-3xl font-extrabold text-slate-900 leading-none">{{ r.overallScore ?? '–' }}</span>
                <span class="text-[11px] text-slate-400 font-semibold mt-0.5">/100</span>
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-2">
                <h2 class="text-[17px] font-bold text-slate-800">{{ 'sell.offer.inspectionReport.overallScore' | translate }}</h2>
                <span [class]="scoreBadgeClass(r.overallScore)" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                  {{ scoreLabel(r.overallScore) | translate }}
                </span>
              </div>

              <!-- Pass / advisory / fail summary counts -->
              <div class="flex flex-wrap gap-4 text-sm mb-3">
                <span class="inline-flex items-center gap-1.5 text-slate-600">
                  <span class="w-2.5 h-2.5 rounded-full bg-brand-600"></span>
                  <span class="font-bold">{{ passCount(r) }}</span>
                  {{ 'sell.offer.inspectionReport.countPass' | translate }}
                </span>
                <span class="inline-flex items-center gap-1.5 text-slate-600">
                  <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <span class="font-bold">{{ advisoryCount(r) }}</span>
                  {{ 'sell.offer.inspectionReport.countAdvisory' | translate }}
                </span>
                <span class="inline-flex items-center gap-1.5 text-slate-600">
                  <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span class="font-bold">{{ failCount(r) }}</span>
                  {{ 'sell.offer.inspectionReport.countFail' | translate }}
                </span>
              </div>

              @if (r.inspectedAt || r.inspectorName) {
                <p class="text-[12px] text-slate-400">
                  @if (r.inspectedAt) {
                    {{ 'sell.offer.inspectionReport.inspectedOn' | translate }} {{ formatDate(r.inspectedAt) }}
                  }
                  @if (r.inspectorName) {
                    &middot; {{ r.inspectorName }}, {{ 'sell.offer.inspectionReport.certifiedInspector' | translate }}
                  }
                </p>
              }
            </div>
          </div>

          <!-- Section score bars -->
          <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            @for (key of sectionKeys; track key) {
              @if (r.sectionScores[key] !== undefined) {
                <div class="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span class="text-[13px] font-medium text-slate-700">{{ sectionI18n(key) | translate }}</span>
                  <div class="flex items-center gap-2">
                    <div class="w-20 h-1.5 rounded-full bg-slate-200">
                      <div class="h-1.5 rounded-full bg-brand-500" [style.width]="r.sectionScores[key] + '%'"></div>
                    </div>
                    <span [class]="sectionScoreTextClass(r.sectionScores[key])" class="text-[11px] font-bold w-8 text-right">
                      {{ r.sectionScores[key] }}%
                    </span>
                  </div>
                </div>
              }
            }
          </div>
        </div>

        <!-- ─── ITEMS NEEDING ATTENTION ──────────────────────────────────── -->
        @if (r.itemsNeedingAttention.length > 0) {
          <div class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100">
              <p class="text-[15px] font-bold text-slate-800">{{ 'sell.offer.inspectionReport.attentionTitle' | translate }}</p>
              <p class="text-[12px] text-slate-500 mt-0.5">{{ 'sell.offer.inspectionReport.attentionSub' | translate }}</p>
            </div>
            <div class="divide-y divide-slate-100">
              @for (item of r.itemsNeedingAttention; track item.itemId) {
                <div class="px-6 py-4 flex items-start gap-3">
                  <span
                    [class.bg-slate-200]="item.status === 'advisory'"
                    [class.text-slate-700]="item.status === 'advisory'"
                    [class.bg-red-100]="item.status === 'fail'"
                    [class.text-red-600]="item.status === 'fail'"
                    class="mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0"
                  >{{ item.status === 'advisory' ? ('sell.offer.inspectionReport.statusAdvisory' | translate) : ('sell.offer.inspectionReport.statusFail' | translate) }}</span>
                  <div class="min-w-0">
                    <p class="text-[13px] font-medium text-slate-800">{{ item.labelEn }}</p>
                    @if (item.notes) {
                      <p class="text-[12px] text-slate-500 mt-0.5">{{ item.notes }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- ─── CERTIFICATION THRESHOLD NOTE ────────────────────────────── -->
        <div class="rounded-2xl border border-brand-100 bg-brand-50/60 px-6 py-4">
          <p class="text-[13px] text-brand-800 font-medium">
            {{ 'sell.offer.inspectionReport.thresholdNote' | translate: { score: r.overallScore ?? 0, threshold: 80 } }}
          </p>
        </div>

        <!-- ─── BACK LINK ─────────────────────────────────────────────────── -->
        <div class="text-center pb-4">
          <a
            [routerLink]="['/', locale(), 'sell', 'concierge', 'offer', token()]"
            class="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:text-brand-900 hover:underline"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            {{ 'sell.offer.inspectionReport.backToOffer' | translate }}
          </a>
        </div>
      }

    </main>
  `,
})
export class CpoInspectionReportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(OffersService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<ReportState>({ kind: 'loading' });
  readonly locale = computed(() => this.language.current());
  readonly token = signal('');

  readonly sectionKeys = SECTION_KEYS;

  ngOnInit(): void {
    const set = () =>
      this.title.setTitle(this.translate.instant('sell.offer.inspectionReport.metaTitle'));
    set();
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(set);
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    const tok = this.route.snapshot.paramMap.get('token') ?? '';
    this.token.set(tok);
    if (!tok) {
      this.state.set({ kind: 'not_found' });
      return;
    }
    this.load(tok);
  }

  retry(): void {
    const tok = this.token();
    if (tok) this.load(tok);
  }

  reportData(): PublicInspectionSummary | null {
    const s = this.state();
    return s.kind === 'ok' ? s.data : null;
  }

  errorKind(): 'not_found' | 'expired' | 'network_error' | null {
    const s = this.state();
    if (s.kind === 'not_found' || s.kind === 'expired' || s.kind === 'network_error') return s.kind;
    return null;
  }

  scoreDash(score: number | null): string {
    const pct = Math.min(Math.max(score ?? 0, 0), 100) / 100;
    const circumference = 2 * Math.PI * 46;
    return `${(pct * circumference).toFixed(1)} ${circumference.toFixed(1)}`;
  }

  scoreBadgeClass(score: number | null): string {
    const s = score ?? 0;
    if (s >= 90) return 'bg-brand-700 text-white';
    if (s >= 70) return 'bg-brand-100 text-brand-700';
    if (s >= 50) return 'bg-brand-50 text-brand-700 border border-brand-200';
    return 'text-red-600';
  }

  scoreLabel(score: number | null): string {
    const s = score ?? 0;
    if (s >= 90) return 'sell.offer.inspectionReport.scoreExcellent';
    if (s >= 70) return 'sell.offer.inspectionReport.scoreGood';
    if (s >= 50) return 'sell.offer.inspectionReport.scoreFair';
    return 'sell.offer.inspectionReport.scorePoor';
  }

  sectionScoreTextClass(pct: number): string {
    if (pct >= 90) return 'text-brand-700';
    if (pct >= 70) return 'text-brand-700';
    if (pct >= 50) return 'text-brand-700';
    return 'text-red-600';
  }

  sectionI18n(key: RubricSectionKey): string {
    return SECTION_I18N[key];
  }

  passCount(r: PublicInspectionSummary): number {
    const advisory = r.itemsNeedingAttention.filter((i) => i.status === 'advisory').length;
    const fail = r.itemsNeedingAttention.filter((i) => i.status === 'fail').length;
    return 71 - advisory - fail;
  }

  advisoryCount(r: PublicInspectionSummary): number {
    return r.itemsNeedingAttention.filter((i) => i.status === 'advisory').length;
  }

  failCount(r: PublicInspectionSummary): number {
    return r.itemsNeedingAttention.filter((i) => i.status === 'fail').length;
  }

  formatDate(iso: string): string {
    return fmtDate(iso, this.locale(), 'long');
  }

  private load(tok: string): void {
    this.state.set({ kind: 'loading' });
    this.api
      .getInspectionReport$(tok)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res: GetInspectionReportResult) => {
        switch (res.kind) {
          case 'ok':
            this.state.set({ kind: 'ok', data: res.data });
            break;
          default:
            this.state.set({ kind: res.kind });
        }
      });
  }
}
