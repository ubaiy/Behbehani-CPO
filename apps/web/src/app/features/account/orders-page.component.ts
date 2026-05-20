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
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@behbehani-cpo/data-access';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { SignInModalService } from '../auth/sign-in-modal.service';
import { OrdersService } from '../../data/orders.service';
import type {
  OrderStatusValue,
  OrderListResponseDto,
} from '@behbehani-cpo/shared-types';

// ── Helpers & constants ───────────────────────────────────────────────────────

const STATUS_CHIPS: { label: string; value: OrderStatusValue | null }[] = [
  { label: 'account.orders.statusAll', value: null },
  { label: 'account.orders.status.reservation_pending', value: 'reservation_pending' },
  { label: 'account.orders.status.confirmed', value: 'confirmed' },
  { label: 'account.orders.status.payment_pending', value: 'payment_pending' },
  { label: 'account.orders.status.paid', value: 'paid' },
  { label: 'account.orders.status.delivery_scheduled', value: 'delivery_scheduled' },
  { label: 'account.orders.status.delivered', value: 'delivered' },
  { label: 'account.orders.status.completed', value: 'completed' },
  { label: 'account.orders.status.cancelled', value: 'cancelled' },
];

function filsToKwd(fils: string): string {
  try { return `KWD ${(Number(BigInt(fils)) / 1000).toFixed(3)}`; } catch { return 'KWD —'; }
}

function relativeTime(iso: string): string {
  try {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
  } catch { return ''; }
}

function statusPillClass(status: OrderStatusValue): string {
  if (status === 'reservation_pending' || status === 'payment_pending') return 'bg-brand-100 text-brand-700';
  if (status === 'confirmed' || status === 'paid' || status === 'delivery_scheduled') return 'bg-brand-50 text-brand-700 border border-brand-200';
  if (status === 'delivered' || status === 'completed') return 'bg-brand-700 text-white';
  if (status === 'cancelled') return 'bg-slate-100 text-slate-600 border border-slate-200';
  return 'bg-brand-50 text-brand-700';
}

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-orders-page',
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
          <h1 class="font-display text-[clamp(24px,3vw,38px)] font-extrabold leading-tight tracking-[-0.025em] text-white">
            {{ 'account.orders.title' | translate }}
          </h1>
          <p class="mt-2 text-[14px] text-white/80">{{ 'account.orders.signInRequired.body' | translate }}</p>
        </div>
      </div>
      <main class="container-page py-8 sm:py-10 max-w-4xl mx-auto">
        <div class="rounded-3xl border border-line bg-white p-10 text-center text-[14px] text-muted shadow-brand-sm">
          <p>{{ 'account.orders.signInRequired.body' | translate }}</p>
        </div>
      </main>
    } @else {
      <!-- Back link — inside max-w-4xl to align with hero column -->
      <div class="container-page pt-6">
        <div class="mx-auto max-w-4xl">
          <a [routerLink]="['/', locale(), 'account']" class="inline-flex items-center text-[13px] font-medium text-brand-700 hover:text-brand-900 hover:underline">
            {{ 'account.backToHub' | translate }}
          </a>
        </div>
      </div>

      <!-- Hero — rounded-3xl framed card -->
      <div class="container-page py-8 mx-auto max-w-4xl">
        <div
          class="rounded-3xl p-6 sm:p-8 text-white"
          style="background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%);"
        >
          <h1 class="font-display text-[clamp(24px,3vw,38px)] font-extrabold leading-tight tracking-[-0.025em] text-white">
            {{ 'account.orders.title' | translate }}
          </h1>
          <p class="mt-2 text-[14px] text-white/80">{{ 'account.orders.sub' | translate }}</p>
        </div>
      </div>

      <!-- Status filter chips -->
      <div class="container-page pb-4">
        <div class="mx-auto max-w-4xl">
          <div class="flex flex-wrap gap-2" role="group" [attr.aria-label]="'account.orders.filterLabel' | translate">
            @for (chip of statusChips; track chip.value) {
              <button
                type="button"
                (click)="selectStatus(chip.value)"
                [class]="chip.value === selectedStatus()
                  ? 'min-h-[44px] rounded-full px-4 py-1.5 text-[13px] font-medium bg-brand-700 text-white transition-colors'
                  : 'min-h-[44px] rounded-full px-4 py-1.5 text-[13px] font-medium bg-white border border-line text-ink-2 hover:border-brand-300 transition-colors'"
              >
                {{ chip.label | translate }}
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Content area -->
      <main class="container-page py-4 pb-14">
        <div class="mx-auto max-w-4xl flex flex-col gap-3">

          @if (listState().kind === 'loading') {
            @for (_ of skeletons; track $index) {
              <div class="rounded-2xl border border-line bg-white p-4 shadow-brand-sm animate-pulse">
                <div class="flex items-center gap-4">
                  <div class="flex flex-1 flex-col gap-2">
                    <div class="h-3.5 w-2/5 rounded bg-gray-200"></div>
                    <div class="h-3 w-1/4 rounded bg-gray-100"></div>
                    <div class="h-3 w-1/3 rounded bg-gray-100"></div>
                  </div>
                  <div class="h-9 w-20 flex-shrink-0 rounded-lg bg-gray-100"></div>
                </div>
              </div>
            }
          } @else if (listState().kind === 'error') {
            <div class="rounded-2xl border border-line bg-white p-10 text-center shadow-brand-sm">
              <p class="text-[14px] text-muted">{{ 'account.orders.error.body' | translate }}</p>
              <button
                type="button"
                (click)="reload()"
                class="mt-4 min-h-[44px] rounded-lg border border-brand-200 bg-brand-50 px-5 py-2 text-[14px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
              >
                {{ 'account.orders.error.retry' | translate }}
              </button>
            </div>
          } @else if (listState().kind === 'ok') {
            @let resp = okValue();
            @if (resp && filteredItems().length === 0) {
              <!-- Empty state -->
              <div class="rounded-2xl border border-line bg-white p-10 text-center shadow-brand-sm">
                <svg class="mx-auto h-12 w-12 text-brand-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p class="mt-4 text-[15px] font-semibold text-ink">{{ 'account.orders.empty.title' | translate }}</p>
                <p class="mt-1.5 text-[13px] text-muted max-w-xs mx-auto">{{ 'account.orders.empty.body' | translate }}</p>
                <a
                  [routerLink]="['/', locale(), 'browse']"
                  class="mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-brand-700 px-5 py-2.5 text-[14px] font-medium text-white hover:bg-brand-800 transition-colors"
                >
                  {{ 'account.orders.empty.browseCta' | translate }}
                </a>
              </div>
            } @else if (resp) {
              <!-- Order cards -->
              @for (order of filteredItems(); track order.id) {
                <a
                  [routerLink]="['/', locale(), 'account', 'orders', order.id]"
                  class="block rounded-2xl border border-line bg-white shadow-brand-sm hover:shadow-md transition-shadow no-underline"
                >
                  <div class="flex items-start gap-4 p-4">
                    <div class="flex flex-1 flex-col min-w-0 gap-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[14px] font-semibold text-ink">{{ 'account.orders.stockLabel' | translate }}{{ order.stockNumber }}</span>
                        <span [class]="'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ' + statusPill(order.status)">
                          {{ 'account.orders.status.' + order.status | translate }}
                        </span>
                      </div>
                      <span class="text-[12px] text-muted">{{ relDate(order.reservedAt) }}</span>
                      <div class="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span class="text-[13px] text-ink">{{ 'account.orders.openCta' | translate }}: {{ fmtFils(order.totalAmountFils) }}</span>
                        <span class="text-[12px] text-muted">{{ 'account.orders.paidLabel' | translate }}: {{ fmtFils(order.paidAmountFils) }}</span>
                      </div>
                    </div>
                    <div class="flex-shrink-0 pt-0.5">
                      <svg class="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                </a>
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
                    {{ 'account.orders.pagination.prev' | translate }}
                  </button>
                  <span class="text-[13px] text-muted">
                    {{ 'account.orders.pagination.pageOf' | translate: { page: currentPage(), total: totalPages() } }}
                  </span>
                  <button
                    type="button"
                    (click)="nextPage()"
                    [disabled]="currentPage() >= totalPages()"
                    class="min-h-[44px] rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {{ 'account.orders.pagination.next' | translate }}
                  </button>
                </div>
              }
            }
          }

        </div>
      </main>
    }
  `,
})
export class OrdersPageComponent {
  readonly auth = inject(AuthService);
  private readonly ordersService = inject(OrdersService);
  private readonly language = inject(LanguageService);
  private readonly signInModal = inject(SignInModalService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly locale = computed(() => this.language.current());
  readonly statusChips = STATUS_CHIPS;
  readonly skeletons = [1, 2, 3];

  readonly selectedStatus = signal<OrderStatusValue | null>(null);
  readonly currentPage = signal(1);

  readonly listState = signal<{ kind: 'loading' } | { kind: 'ok'; value: OrderListResponseDto } | { kind: 'error'; code: string }>({ kind: 'loading' });

  readonly okValue = computed(() => {
    const s = this.listState();
    return s.kind === 'ok' ? s.value : null;
  });

  readonly filteredItems = computed(() => {
    const v = this.okValue();
    if (!v) return [];
    const status = this.selectedStatus();
    if (!status) return v.items;
    return v.items.filter((o) => o.status === status);
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
      const page = this.currentPage();
      if (!this.auth.isSignedIn()) return;
      this.listState.set({ kind: 'loading' });
      this.ordersService.list(page).subscribe((s) => this.listState.set(s as never));
    }, { allowSignalWrites: true });
  }

  selectStatus(status: OrderStatusValue | null): void {
    this.selectedStatus.set(status);
  }

  reload(): void {
    this.listState.set({ kind: 'loading' });
    this.ordersService.list(this.currentPage()).subscribe((s) => this.listState.set(s as never));
  }

  prevPage(): void {
    const p = this.currentPage();
    if (p > 1) this.currentPage.set(p - 1);
  }

  nextPage(): void {
    const p = this.currentPage();
    if (p < this.totalPages()) this.currentPage.set(p + 1);
  }

  statusPill(status: OrderStatusValue): string {
    return statusPillClass(status);
  }

  fmtFils(fils: string): string {
    return filsToKwd(fils);
  }

  relDate(iso: string): string {
    return relativeTime(iso);
  }
}
