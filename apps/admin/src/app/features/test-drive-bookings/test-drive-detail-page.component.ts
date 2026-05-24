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
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, firstValueFrom, of, takeUntil } from 'rxjs';

import type {
  TestDriveBookingDto,
  TestDriveStatus,
  UpdateTestDriveBookingInput,
} from '../../../../../../libs/shared/types/src/lib/admin-test-drive.schemas';
import { AdminTestDriveService } from '../../../../../../libs/data-access/src/lib/admin-test-drive.service';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TestDriveStatus, string> = {
  requested: 'Requested',
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  no_show:   'No Show',
  cancelled: 'Cancelled',
};

const STATUS_PILL_CLASS: Record<TestDriveStatus, string> = {
  requested: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  no_show:   'bg-red-50 text-red-600 border-red-200',
  cancelled: 'bg-slate-50 text-slate-500 border-slate-200',
};

const WINDOW_LABELS: Record<string, string> = {
  morning:   'Morning',
  afternoon: 'Afternoon',
  evening:   'Evening',
};

const LOCATION_LABELS: Record<string, string> = {
  showroom:         'Showroom',
  customer_address: 'At Customer Address',
};

/** Valid next-status transitions per state machine. */
const NEXT_STATUSES: Partial<Record<TestDriveStatus, TestDriveStatus[]>> = {
  requested: ['scheduled', 'cancelled'],
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
};

type ActionBusy = 'idle' | 'updating' | 'saving-notes';

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'admin-test-drive-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-4xl mx-auto">

      <!-- ── Back link ────────────────────────────────────────────────────── -->
      <div class="mb-4">
        <a
          routerLink="/operations/test-drives"
          class="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline focus:outline-none focus:underline"
          aria-label="Back to test drives queue"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
          Test Drives Queue
        </a>
      </div>

      <!-- ── Loading skeleton ──────────────────────────────────────────────── -->
      @if (loading()) {
        <div class="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-4">
          <div class="h-6 bg-slate-200 rounded w-1/3"></div>
          <div class="h-4 bg-slate-100 rounded w-1/2"></div>
          <div class="h-4 bg-slate-100 rounded w-2/3"></div>
        </div>
      }

      <!-- ── Load error ────────────────────────────────────────────────────── -->
      @if (!loading() && loadError()) {
        <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {{ loadError() }}
        </div>
      }

      @if (!loading() && booking()) {
        <!-- ── Page header ──────────────────────────────────────────────── -->
        <div class="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 class="text-xl font-semibold text-slate-800">
              Test Drive — {{ booking()!.customerName }}
            </h1>
            <p class="text-xs font-mono text-slate-400 mt-0.5">{{ booking()!.id }}</p>
          </div>
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border"
            [ngClass]="STATUS_PILL_CLASS[booking()!.status]"
          >{{ STATUS_LABELS[booking()!.status] }}</span>
        </div>

        <!-- ── Success banner ─────────────────────────────────────────── -->
        @if (successMessage()) {
          <div
            class="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            role="status"
            aria-live="polite"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            {{ successMessage() }}
          </div>
        }

        <!-- ── Action error ────────────────────────────────────────────── -->
        @if (actionError()) {
          <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {{ actionError() }}
          </div>
        }

        <!-- ── Customer info card ──────────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 class="text-base font-semibold text-slate-800 mb-4">Customer</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt class="text-slate-500">Name</dt>
              <dd class="font-medium text-slate-800 mt-0.5">{{ booking()!.customerName }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Phone</dt>
              <dd class="text-slate-700 mt-0.5">{{ booking()!.customerPhone }}</dd>
            </div>
            @if (booking()!.customerEmail) {
              <div>
                <dt class="text-slate-500">Email</dt>
                <dd class="text-slate-700 mt-0.5">{{ booking()!.customerEmail }}</dd>
              </div>
            }
            <div>
              <dt class="text-slate-500">Received</dt>
              <dd class="text-slate-400 mt-0.5">{{ booking()!.createdAt | date: 'dd MMM yyyy HH:mm' }}</dd>
            </div>
          </dl>
        </div>

        <!-- ── Booking details card ────────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 class="text-base font-semibold text-slate-800 mb-4">Booking Details</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt class="text-slate-500">Preferred Date</dt>
              <dd class="text-slate-700 mt-0.5">{{ booking()!.preferredDate | date: 'dd MMM yyyy' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Time Window</dt>
              <dd class="text-slate-700 mt-0.5">{{ WINDOW_LABELS[booking()!.preferredWindow] }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Location</dt>
              <dd class="text-slate-700 mt-0.5">{{ LOCATION_LABELS[booking()!.location] }}</dd>
            </div>
            @if (booking()!.addressLine) {
              <div>
                <dt class="text-slate-500">Address</dt>
                <dd class="text-slate-700 mt-0.5">{{ booking()!.addressLine }}</dd>
              </div>
            }
            @if (booking()!.listing) {
              <div>
                <dt class="text-slate-500">Listing</dt>
                <dd class="font-mono text-slate-800 mt-0.5">
                  {{ booking()!.listing!.stockNumber }} — {{ booking()!.listing!.titleEn }}
                </dd>
              </div>
            }
            @if (booking()!.scheduledAt) {
              <div>
                <dt class="text-slate-500">Scheduled At</dt>
                <dd class="text-blue-700 mt-0.5">{{ booking()!.scheduledAt | date: 'dd MMM yyyy HH:mm' }}</dd>
              </div>
            }
            @if (booking()!.completedAt) {
              <div>
                <dt class="text-slate-500">Completed At</dt>
                <dd class="text-green-700 mt-0.5">{{ booking()!.completedAt | date: 'dd MMM yyyy HH:mm' }}</dd>
              </div>
            }
            @if (booking()!.customerNotes) {
              <div class="sm:col-span-2">
                <dt class="text-slate-500">Customer Notes</dt>
                <dd class="text-slate-700 mt-0.5 whitespace-pre-wrap">{{ booking()!.customerNotes }}</dd>
              </div>
            }
          </dl>
        </div>

        <!-- ── Assignee card ────────────────────────────────────────────── -->
        @if (booking()!.assignedTo) {
          <div class="bg-white rounded-xl border border-slate-200 p-6 mb-4">
            <h2 class="text-base font-semibold text-slate-800 mb-2">Assigned To</h2>
            <p class="text-sm text-slate-700">{{ booking()!.assignedTo!.fullName }}</p>
            @if (booking()!.assignedTo!.email) {
              <p class="text-xs text-slate-400 mt-0.5">{{ booking()!.assignedTo!.email }}</p>
            }
          </div>
        }

        <!-- ── Action panels ───────────────────────────────────────────── -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          <!-- Status transition panel -->
          @if (canTransition()) {
            <div class="bg-white rounded-xl border border-brand-200 p-6" role="region" aria-label="Update status">
              <h2 class="text-base font-semibold text-slate-800 mb-4">Update Status</h2>
              <form [formGroup]="statusForm" (ngSubmit)="submitStatusUpdate()" novalidate>

                <div class="mb-3">
                  <label class="block text-sm font-medium text-slate-700 mb-1" for="next-status">
                    Next Status <span class="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="next-status"
                    formControlName="status"
                    class="w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                    aria-required="true"
                  >
                    <option value="">Select next status...</option>
                    @for (ns of nextStatusOptions(); track ns) {
                      <option [value]="ns">{{ STATUS_LABELS[ns] }}</option>
                    }
                  </select>
                </div>

                <!-- scheduledAt — required when transitioning to 'scheduled' -->
                @if (statusForm.get('status')?.value === 'scheduled') {
                  <div class="mb-3">
                    <label class="block text-sm font-medium text-slate-700 mb-1" for="scheduled-at">
                      Scheduled Date &amp; Time <span class="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="scheduled-at"
                      type="datetime-local"
                      formControlName="scheduledAt"
                      class="w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                      aria-required="true"
                    />
                  </div>
                }

                <div class="flex justify-end">
                  <button
                    type="submit"
                    class="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    [disabled]="statusForm.invalid || statusForm.pristine || actionBusy() !== 'idle'"
                  >
                    @if (actionBusy() === 'updating') {
                      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    }
                    Update Status
                  </button>
                </div>
              </form>
            </div>
          }

          <!-- Notes panel (always editable) -->
          <div class="bg-white rounded-xl border border-slate-200 p-6" role="region" aria-label="Admin notes">
            <h2 class="text-base font-semibold text-slate-800 mb-4">Internal Notes</h2>
            <form [formGroup]="notesForm" (ngSubmit)="saveNotes()" novalidate>
              <div class="mb-4">
                <label class="sr-only" for="booking-notes">Internal notes</label>
                <textarea
                  id="booking-notes"
                  formControlName="adminNotes"
                  rows="5"
                  maxlength="100000"
                  placeholder="Internal notes visible only to admin staff..."
                  class="w-full px-3 py-2 text-sm rounded-md border border-slate-300 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500"
                ></textarea>
              </div>
              <div class="flex justify-end">
                <button
                  type="submit"
                  class="inline-flex items-center gap-2 rounded-md border border-brand-300 bg-white px-5 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  [disabled]="notesForm.pristine || actionBusy() !== 'idle'"
                >
                  @if (actionBusy() === 'saving-notes') {
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  }
                  Save Notes
                </button>
              </div>
            </form>
          </div>

        </div>
      }
    </div>
  `,
})
export class TestDriveDetailPageComponent implements OnInit, OnDestroy {
  private readonly testDriveService = inject(AdminTestDriveService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // ── Public constants for template ─────────────────────────────────────────
  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly STATUS_PILL_CLASS = STATUS_PILL_CLASS;
  protected readonly WINDOW_LABELS = WINDOW_LABELS;
  protected readonly LOCATION_LABELS = LOCATION_LABELS;

  // ── State ─────────────────────────────────────────────────────────────────
  protected readonly bookingId = signal<string>('');
  protected readonly booking = signal<TestDriveBookingDto | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionBusy = signal<ActionBusy>('idle');
  protected readonly actionError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly canTransition = computed(() => {
    const b = this.booking();
    if (!b) return false;
    return (NEXT_STATUSES[b.status] ?? []).length > 0;
  });

  protected readonly nextStatusOptions = computed((): TestDriveStatus[] => {
    const b = this.booking();
    if (!b) return [];
    return NEXT_STATUSES[b.status] ?? [];
  });

  // ── Forms ─────────────────────────────────────────────────────────────────
  protected readonly statusForm: FormGroup = this.fb.group({
    status:      [''],
    scheduledAt: [null as string | null],
  });
  protected readonly notesForm: FormGroup = this.fb.group({
    adminNotes: [''],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.bookingId.set(id);
    this.fetchBooking();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Status update ─────────────────────────────────────────────────────────

  protected async submitStatusUpdate(): Promise<void> {
    this.statusForm.markAllAsTouched();
    if (this.statusForm.invalid) return;

    const { status, scheduledAt } = this.statusForm.getRawValue() as {
      status: TestDriveStatus | '';
      scheduledAt: string | null;
    };
    if (!status) return;

    // Client-side guard: scheduledAt required when transitioning to 'scheduled'
    if (status === 'scheduled' && !scheduledAt) {
      this.actionError.set('Scheduled date and time is required when setting status to Scheduled.');
      return;
    }

    this.actionBusy.set('updating');
    this.actionError.set(null);
    this.successMessage.set(null);

    const body: UpdateTestDriveBookingInput = {
      status,
      ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
    };

    try {
      await firstValueFrom(this.testDriveService.updateBooking(this.bookingId(), body));
      this.statusForm.reset({ status: '', scheduledAt: null });
      this.successMessage.set(`Status updated to "${STATUS_LABELS[status]}".`);
      this.fetchBooking();
    } catch (err: unknown) {
      const msg =
        (err as { error?: { message?: string }; message?: string })?.error?.message ??
        (err as { message?: string })?.message ??
        'Failed to update status.';
      this.actionError.set(msg);
    } finally {
      this.actionBusy.set('idle');
    }
  }

  // ── Notes save ────────────────────────────────────────────────────────────

  protected async saveNotes(): Promise<void> {
    if (this.notesForm.pristine) return;

    const { adminNotes } = this.notesForm.getRawValue() as { adminNotes: string };

    this.actionBusy.set('saving-notes');
    this.actionError.set(null);
    this.successMessage.set(null);

    const body: UpdateTestDriveBookingInput = { adminNotes: adminNotes ?? null };

    try {
      await firstValueFrom(this.testDriveService.updateBooking(this.bookingId(), body));
      this.notesForm.markAsPristine();
      this.successMessage.set('Notes saved.');
      this.fetchBooking();
    } catch (err: unknown) {
      const msg =
        (err as { error?: { message?: string }; message?: string })?.error?.message ??
        (err as { message?: string })?.message ??
        'Failed to save notes.';
      this.actionError.set(msg);
    } finally {
      this.actionBusy.set('idle');
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private fetchBooking(): void {
    const id = this.bookingId();
    if (!id) return;

    this.loading.set(true);
    this.loadError.set(null);

    this.testDriveService
      .getBooking(id)
      .pipe(
        catchError((err: unknown) => {
          const msg =
            (err as { error?: { message?: string }; message?: string })?.error?.message ??
            (err as { message?: string })?.message ??
            'Failed to load test drive booking.';
          this.loadError.set(msg);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        if (result) {
          this.booking.set(result);
          this.notesForm.reset({ adminNotes: result.adminNotes ?? '' });
          this.statusForm.reset({ status: '', scheduledAt: null });
        }
        this.loading.set(false);
      });
  }
}
