import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@behbehani-cpo/data-access';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { FeatureWaitlistService } from '../../data/feature-waitlist.service';

export type IllustrationSlug =
  | 'wrench'
  | 'file'
  | 'dollar'
  | 'undo'
  | 'search'
  | 'receipt'
  | 'star'
  | 'gift'
  | 'bell';

type State =
  | { kind: 'form' }
  | { kind: 'submitting' }
  | { kind: 'subscribed'; alreadySubscribed: boolean }
  | { kind: 'error'; reason: 'validation' | 'network_error' };

@Component({
  selector: 'bmc-coming-soon-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, TranslateModule],
  template: `
    <!-- Single framed card: max-w-4xl, rounded-3xl, one border, one shadow -->
    <div class="container-page py-10 sm:py-14">
      <div class="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-line shadow-brand bg-white">

        <!-- ── Hero strip (top half of frame) ── -->
        <div
          class="px-6 py-8"
          style="background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%);"
        >
          <!-- eyebrow -->
          <p class="text-white/70 text-[11px] font-semibold uppercase tracking-wider mb-1">
            {{ 'account.comingSoon.eyebrow' | translate }}
          </p>
          <!-- heading row: title left, pill right -->
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <h1 class="font-display font-bold text-white text-[26px] leading-tight">
              {{ featureTitleKey | translate }}
            </h1>
            <!-- Coming Soon pill — white-on-blue for dark bg contrast -->
            <span
              class="inline-flex items-center rounded-full bg-white/15 border border-white/30 px-3 py-1 text-[12px] font-semibold text-white/90 flex-shrink-0"
            >
              {{ etaLabelKey | translate }}
            </span>
          </div>
        </div>

        <!-- ── White content area (bottom half of frame) ── -->
        <div class="bg-white p-6 md:p-10">
          <div class="max-w-2xl mx-auto">

            <!-- 80×80 illustration box — CENTERED -->
            <div
              class="w-20 h-20 rounded-3xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto mb-6"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="iconPath()" />
              </svg>
            </div>

            <!-- Heading — CENTERED -->
            <h2 class="font-display font-bold text-[20px] text-ink text-center">
              {{ featureTitleKey | translate }}
              {{ 'account.comingSoon.headingSuffix' | translate }}
            </h2>

            <!-- Body paragraph — CENTERED -->
            <p class="text-muted text-[14px] text-center mt-2 mb-6 max-w-md mx-auto">
              {{ 'account.comingSoon.bodyText' | translate }}
            </p>

            <!-- Subscribed state -->
            @if (state().kind === 'subscribed') {
              <div
                class="rounded-2xl border border-brand-200 bg-brand-50 p-5"
                role="status"
              >
                <p class="text-[15px] font-bold text-brand-700">
                  @if (isAlreadySubscribed()) {
                    {{ 'account.comingSoon.alreadySubscribedTitle' | translate }}
                  } @else {
                    {{ 'account.comingSoon.subscribedTitle' | translate }}
                  }
                </p>
                <p class="mt-1 text-[13px] text-muted">
                  @if (isAlreadySubscribed()) {
                    {{ 'account.comingSoon.alreadySubscribedBody' | translate }}
                  } @else {
                    {{ 'account.comingSoon.subscribedBody' | translate }}
                  }
                </p>
                <p class="mt-2 text-[12px] text-brand-700 font-medium">{{ emailValue() }}</p>
              </div>
            } @else {
              <!-- Notify-me form — INLINE on desktop (flex gap-2) -->
              <div class="flex gap-2 mt-5">
                <input
                  type="email"
                  autocomplete="email"
                  [placeholder]="'account.comingSoon.emailPlaceholder' | translate"
                  [ngModel]="emailValue()"
                  (ngModelChange)="emailValue.set($event)"
                  [disabled]="state().kind === 'submitting'"
                  class="flex-1 border border-line rounded-pill px-4 py-3 text-sm text-ink placeholder:text-muted-2 outline-none transition-colors focus:border-brand-700 focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
                />
                <button
                  type="button"
                  (click)="onSubmit()"
                  [disabled]="state().kind === 'submitting'"
                  class="bg-brand-700 hover:bg-brand-800 text-white font-semibold rounded-pill px-6 py-3 text-sm transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  @if (state().kind === 'submitting') {
                    {{ 'account.comingSoon.submittingCta' | translate }}
                  } @else {
                    {{ 'account.comingSoon.submitCta' | translate }}
                  }
                </button>
              </div>

              <!-- Validation / network error -->
              @if (state().kind === 'error') {
                <p class="mt-2 text-[13px] text-brand-700" role="alert">
                  @if (errorReason() === 'validation') {
                    {{ 'account.comingSoon.errors.validation' | translate }}
                  } @else {
                    {{ 'account.comingSoon.errors.networkError' | translate }}
                  }
                </p>
              }

              <!-- ETA caption BELOW form — CENTERED -->
              <p class="text-[12px] text-muted text-center mt-2">
                {{ 'account.comingSoon.launchEstimateLabel' | translate : { eta: etaLabelKey | translate } }}
              </p>
            }

            <!-- Teaser bullets — flat list, NO divider above -->
            @if (teaserBulletKeys.length > 0) {
              <ul class="mt-6 space-y-3">
                @for (key of teaserBulletKeys; track key) {
                  <li class="flex items-start gap-2">
                    <!-- 20×20 brand-700 check icon -->
                    <svg
                      class="flex-shrink-0 text-brand-700 mt-0.5"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    <span class="text-[14px] text-ink-2">{{ key | translate }}</span>
                  </li>
                }
              </ul>
            }

            <!-- Back link AT THE BOTTOM — CENTERED -->
            <div class="text-center mt-8">
              <a
                [routerLink]="['/', locale(), 'account']"
                class="text-brand-700 text-sm font-semibold hover:underline"
              >
                {{ 'account.comingSoon.backLink' | translate }}
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
})
export class ComingSoonPageComponent implements OnInit {
  @Input({ required: true }) featurePath!: string;
  @Input({ required: true }) featureTitleKey!: string;
  @Input({ required: true }) etaLabelKey!: string;
  @Input({ required: true }) teaserBulletKeys!: string[];
  @Input() illustrationSlug?: IllustrationSlug;

  private readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);
  private readonly waitlist = inject(FeatureWaitlistService);

  readonly locale = computed(() => this.language.current());

  readonly state = signal<State>({ kind: 'form' });
  readonly emailValue = signal('');

  readonly isAlreadySubscribed = computed(() => {
    const s = this.state();
    return s.kind === 'subscribed' && s.alreadySubscribed;
  });

  readonly errorReason = computed(() => {
    const s = this.state();
    return s.kind === 'error' ? s.reason : null;
  });

  ngOnInit(): void {
    const user = this.auth.user();
    if (user?.email) {
      this.emailValue.set(user.email);
    }
  }

  readonly iconPath = computed((): string => {
    switch (this.illustrationSlug) {
      case 'wrench':
        return 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z';
      case 'file':
        return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8';
      case 'dollar':
        return 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6';
      case 'undo':
        return 'M3 7v6h6 M3 13C5.33 8.67 9.33 6 14 6a9 9 0 0 1 9 9 9 9 0 0 1-9 9c-4.23 0-7.84-2.76-9.26-6.58';
      case 'search':
        return 'M11 3a8 8 0 1 0 0 16A8 8 0 0 0 11 3z M21 21l-4.35-4.35';
      case 'receipt':
        return 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z M8 8h8 M8 12h8 M8 16h5';
      case 'star':
        return 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
      case 'gift':
        return 'M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z';
      case 'bell':
        return 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0';
      default:
        // sparkles/clock default
        return 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
    }
  });

  onSubmit(): void {
    if (this.state().kind === 'submitting') return;
    const email = this.emailValue();
    if (!email.trim().includes('@')) {
      this.state.set({ kind: 'error', reason: 'validation' });
      return;
    }
    this.state.set({ kind: 'submitting' });
    this.waitlist.subscribe(this.featurePath, email).subscribe((result) => {
      switch (result.kind) {
        case 'ok':
          this.state.set({ kind: 'subscribed', alreadySubscribed: false });
          break;
        case 'already_subscribed':
          this.state.set({ kind: 'subscribed', alreadySubscribed: true });
          break;
        case 'validation_error':
          this.state.set({ kind: 'error', reason: 'validation' });
          break;
        default:
          this.state.set({ kind: 'error', reason: 'network_error' });
      }
    });
  }
}
