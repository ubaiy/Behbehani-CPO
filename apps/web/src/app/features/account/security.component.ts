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
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@behbehani-cpo/data-access';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { SignInModalService } from '../auth/sign-in-modal.service';
import { SecurityService } from '../../data/security.service';

// ── State union ───────────────────────────────────────────────────────────────

type State =
  | { kind: 'idle' }
  | { kind: 'signing-out' }
  | { kind: 'error'; reason: 'unauthenticated' | 'network_error' };

// ── Mock session rows (replaced in v1.4 once /me/sessions is live) ───────────

interface MockSession {
  device: string;
  location: string;
  when: string;
  isCurrent: boolean;
}

const MOCK_SESSIONS: MockSession[] = [
  { device: 'iPhone 15 / Safari', location: 'Kuwait City', when: '2 hours ago', isCurrent: true },
  { device: 'Chrome on Windows', location: 'Hawalli', when: '3 days ago', isCurrent: false },
  { device: 'iOS app v1.0.3', location: 'Sharq', when: '1 week ago', isCurrent: false },
];

// ── Relative time helper ──────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-account-security',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    @if (!auth.isSignedIn()) {
      <!-- Guest gate -->
      <div class="container-page py-8 mx-auto max-w-4xl">
        <div
          class="rounded-3xl p-6 sm:p-8 text-white"
          style="background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%);"
        >
          <h1
            class="font-display text-[clamp(24px,3vw,38px)] font-extrabold leading-tight tracking-[-0.025em] text-white"
          >
            {{ 'account.security.signInRequired.title' | translate }}
          </h1>
          <p class="mt-2 text-[14px] text-white/80">
            {{ 'account.security.signInRequired.body' | translate }}
          </p>
        </div>
      </div>
      <main class="container-page py-8 sm:py-10 max-w-4xl mx-auto">
        <div
          class="rounded-3xl border border-line bg-white p-10 text-center text-[14px] text-muted shadow-brand-sm"
        >
          <p>{{ 'account.security.signInRequired.body' | translate }}</p>
        </div>
      </main>
    } @else {
      <!-- Back link -->
      <div class="container-page pt-6">
        <div class="mx-auto max-w-4xl">
          <a [routerLink]="['/', locale(), 'account']" class="inline-flex items-center text-[13px] font-medium text-brand-700 hover:text-brand-900 hover:underline">
            {{ 'account.backToHub' | translate }}
          </a>
        </div>
      </div>

      <!-- Hero -->
      <div class="container-page py-8 mx-auto max-w-4xl">
        <div
          class="rounded-3xl p-6 sm:p-8 text-white"
          style="background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%);"
        >
          <h1
            class="font-display text-[clamp(24px,3vw,38px)] font-extrabold leading-tight tracking-[-0.025em] text-white"
          >
            {{ 'account.security.title' | translate }}
          </h1>
          <p class="mt-2 text-[14px] text-white/80">
            {{ 'account.security.sub' | translate }}
          </p>
        </div>
      </div>

      <!-- Cards -->
      <main class="container-page py-8 sm:py-10">
        <div class="mx-auto max-w-4xl flex flex-col gap-5">

          <!-- Card 1: Last sign-in -->
          <section class="rounded-2xl border border-line bg-white p-6 shadow-brand-sm">
            <h2 class="text-[15px] font-semibold text-ink">
              {{ 'account.security.lastSignIn.label' | translate }}
            </h2>
            @if (lastSignInRelative()) {
              <p class="mt-3 text-[14px] text-ink">
                {{ lastSignInRelative() }}
              </p>
              <p class="mt-0.5 text-[13px] text-muted">
                {{ 'account.security.lastSignIn.from' | translate: { location: 'Kuwait City' } }}
                <span
                  class="ms-2 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700"
                >
                  {{ 'account.security.lastSignIn.locationComingSoon' | translate }}
                </span>
              </p>
            } @else {
              <p class="mt-3 text-[13px] text-muted">—</p>
            }
          </section>

          <!-- Card 2: Active sessions -->
          <section class="rounded-2xl border border-line bg-white p-6 shadow-brand-sm">
            <div class="flex items-center gap-3">
              <h2 class="text-[15px] font-semibold text-ink">
                {{ 'account.security.sessions.title' | translate }}
              </h2>
              <span
                class="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-[12px] font-medium text-brand-700"
              >
                {{ 'account.security.sessions.deviceCount' | translate: { count: mockSessions.length } }}
              </span>
            </div>

            <ul class="mt-4 divide-y divide-line" role="list">
              @for (session of mockSessions; track session.device) {
                <li class="flex min-h-[44px] items-center justify-between gap-4 py-3">
                  <div class="flex flex-col">
                    <span class="text-[14px] font-medium text-ink">{{ session.device }}</span>
                    <span class="mt-0.5 text-[12px] text-muted">
                      {{ session.location }} · {{ session.when }}
                    </span>
                  </div>
                  <div class="flex-shrink-0">
                    @if (session.isCurrent) {
                      <span
                        class="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-[12px] font-medium text-brand-700"
                      >
                        {{ 'account.security.sessions.thisDevice' | translate }}
                      </span>
                    } @else {
                      <button
                        type="button"
                        disabled
                        class="min-h-[44px] px-3 text-[13px] text-muted cursor-not-allowed opacity-50"
                        [title]="'account.security.sessions.perDeviceComingSoon' | translate"
                        [attr.aria-label]="'account.security.sessions.signOutCta' | translate"
                      >
                        {{ 'account.security.sessions.signOutCta' | translate }}
                        <span class="ms-1 text-[10px] opacity-60">{{ 'account.security.sessions.versionSuffix' | translate }}</span>
                      </button>
                    }
                  </div>
                </li>
              }
            </ul>

            <p
              class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] text-brand-700"
            >
              <svg class="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M6 4v2.5l1.5 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>
              </svg>
              {{ 'account.security.sessions.mockNote' | translate }}
            </p>
          </section>

          <!-- Card 3: Sign out of all devices -->
          <section class="rounded-2xl border border-line bg-white p-6 shadow-brand-sm">
            <h2 class="text-[15px] font-semibold text-ink">
              {{ 'account.security.signOutAll.title' | translate }}
            </h2>
            <p class="mt-1 text-[13px] text-muted">
              {{ 'account.security.signOutAll.body' | translate }}
            </p>

            @if (state().kind === 'error') {
              <p class="mt-3 text-[13px] text-red-600 font-medium">
                {{ 'account.security.signOutAll.errorToast' | translate }}
              </p>
            }

            <button
              type="button"
              (click)="openModal()"
              [disabled]="state().kind === 'signing-out'"
              class="mt-4 min-h-[44px] rounded-lg border border-red-200 bg-white px-5 py-2.5 text-[14px] font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (state().kind === 'signing-out') {
                {{ 'account.security.signOutAll.signingOutCta' | translate }}
              } @else {
                {{ 'account.security.signOutAll.title' | translate }}
              }
            </button>
          </section>

        </div>
      </main>

      <!-- Success toast -->
      @if (toastMessage()) {
        <div
          role="status"
          aria-live="polite"
          class="fixed bottom-6 end-6 z-50 rounded-xl bg-brand-700 px-5 py-3 text-[14px] font-medium text-white shadow-lg"
        >
          {{ toastMessage() }}
        </div>
      }

      <!-- Confirm modal -->
      @if (modalOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="'account.security.signOutAll.confirmTitle' | translate"
        >
          <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 class="text-[16px] font-semibold text-ink">
              {{ 'account.security.signOutAll.confirmTitle' | translate }}
            </h3>
            <p class="mt-2 text-[13px] text-muted">
              {{ 'account.security.signOutAll.confirmBody' | translate }}
            </p>
            <div class="mt-6 flex justify-end gap-3">
              <button
                type="button"
                (click)="closeModal()"
                class="min-h-[44px] rounded-lg border border-line px-4 py-2 text-[14px] font-medium text-ink transition-colors hover:bg-gray-50"
              >
                {{ 'account.security.signOutAll.cancelCta' | translate }}
              </button>
              <button
                type="button"
                (click)="confirmSignOutAll()"
                class="min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                {{ 'account.security.signOutAll.confirmCta' | translate }}
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class AccountSecurityComponent {
  readonly auth = inject(AuthService);
  private readonly security = inject(SecurityService);
  private readonly language = inject(LanguageService);
  private readonly signInModal = inject(SignInModalService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);

  readonly locale = computed(() => this.language.current());
  readonly mockSessions = MOCK_SESSIONS;

  readonly state = signal<State>({ kind: 'idle' });
  readonly modalOpen = signal(false);
  readonly toastMessage = signal<string | null>(null);

  readonly lastSignInRelative = computed(() => {
    const u = this.auth.user();
    if (!u?.lastSignInAt) return null;
    return relativeTime(u.lastSignInAt);
  });

  constructor() {
    // Open sign-in modal for guests (SSR-safe)
    effect(
      () => {
        if (isPlatformBrowser(this.platformId) && !this.auth.isSignedIn()) {
          this.signInModal.open();
        }
      },
      { allowSignalWrites: true },
    );

    // Page title
    effect(() => {
      this.translate.get('account.security.metaTitle').subscribe((t) => {
        this.title.setTitle(t);
        this.meta.updateTag({ name: 'description', content: t });
      });
    });
  }

  openModal(): void {
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  confirmSignOutAll(): void {
    this.closeModal();
    this.state.set({ kind: 'signing-out' });

    this.security.signOutAll().subscribe((result) => {
      if (result.kind === 'ok') {
        this.state.set({ kind: 'idle' });
        const n = result.revoked;
        const msg =
          n === 0
            ? this.translate.instant('account.security.signOutAll.successZero')
            : n === 1
              ? this.translate.instant('account.security.signOutAll.successOne')
              : this.translate.instant('account.security.signOutAll.successPlural', { count: n });
        this.toastMessage.set(msg);
        // Auto-dismiss toast after 4 s
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => this.toastMessage.set(null), 4000);
        }
      } else if (result.kind === 'unauthenticated') {
        this.state.set({ kind: 'error', reason: 'unauthenticated' });
      } else {
        this.state.set({ kind: 'error', reason: 'network_error' });
      }
    });
  }
}
