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
import {
  AbstractControl,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, firstValueFrom, of, takeUntil } from 'rxjs';

import type {
  AdminMaintenanceRequestDetailDto,
  MaintenanceRequestStatus,
  UpdateMaintenanceRequestStatusInput,
} from '@behbehani-cpo/shared-types';
import { AdminMaintenanceService } from '@behbehani-cpo/data-access';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Validator: scheduledFor must be today or in the future. */
function futureDateValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const selected = new Date(control.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected >= today ? null : { pastDate: true };
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<MaintenanceRequestStatus, string> = {
  pending_review: 'Pending Review',
  scheduled:      'Scheduled',
  in_progress:    'In Progress',
  completed:      'Completed',
  cancelled:      'Cancelled',
};

const STATUS_PILL_CLASS: Record<MaintenanceRequestStatus, string> = {
  pending_review: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  scheduled:      'bg-blue-50 text-blue-700 border-blue-200',
  in_progress:    'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed:      'bg-green-50 text-green-700 border-green-200',
  cancelled:      'bg-red-50 text-red-600 border-red-200',
};

/** Valid next-status transitions per state machine. */
const NEXT_STATUSES: Partial<Record<MaintenanceRequestStatus, MaintenanceRequestStatus[]>> = {
  pending_review: ['scheduled', 'cancelled'],
  scheduled:      ['in_progress', 'cancelled'],
  in_progress:    ['completed', 'cancelled'],
};

type ActionBusy = 'idle' | 'updating' | 'saving-notes';

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'admin-maintenance-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-4xl mx-auto">

      <!-- ── Back link ────────────────────────────────────────────────────── -->
      <div class="mb-4">
        <a
          routerLink="/operations/maintenance"
          class="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline focus:outline-none focus:underline"
          aria-label="Back to maintenance queue"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
          Maintenance Queue
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

      @if (!loading() && request()) {
        <!-- ── Page header ──────────────────────────────────────────────── -->
        <div class="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 class="text-xl font-semibold text-slate-800">
              Maintenance Request — {{ request()!.customer.fullName }}
            </h1>
            <p class="text-xs font-mono text-slate-400 mt-0.5">{{ request()!.id }}</p>
          </div>
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border"
            [ngClass]="STATUS_PILL_CLASS[request()!.status]"
          >{{ STATUS_LABELS[request()!.status] }}</span>
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
              <dd class="font-medium text-slate-800 mt-0.5">{{ request()!.customer.fullName }}</dd>
            </div>
            @if (request()!.customer.mobile) {
              <div>
                <dt class="text-slate-500">Mobile</dt>
                <dd class="text-slate-700 mt-0.5">{{ request()!.customer.mobile }}</dd>
              </div>
            }
            @if (request()!.customer.email) {
              <div>
                <dt class="text-slate-500">Email</dt>
                <dd class="text-slate-700 mt-0.5">{{ request()!.customer.email }}</dd>
              </div>
            }
          </dl>
        </div>

        <!-- ── Request details card ────────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 class="text-base font-semibold text-slate-800 mb-4">Request Details</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt class="text-slate-500">Vehicle</dt>
              <dd class="font-medium text-slate-800 mt-0.5">
                @if (request()!.vehicleListing) {
                  Stock #{{ request()!.vehicleListing!.stockNumber }}
                } @else {
                  {{ request()!.vehicleFreeText ?? '—' }}
                }
              </dd>
            </div>
            <div>
              <dt class="text-slate-500">Governorate</dt>
              <dd class="text-slate-700 mt-0.5 capitalize">{{ request()!.governorate.replace('_', ' ') }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Pickup Address</dt>
              <dd class="text-slate-700 mt-0.5">{{ request()!.pickupAddressLine }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Preferred Window</dt>
              <dd class="text-slate-700 mt-0.5 capitalize">{{ request()!.preferredWindow }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Preferred Date</dt>
              <dd class="text-slate-700 mt-0.5">{{ request()!.preferredDate | date: 'dd MMM yyyy' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Concern Category</dt>
              <dd class="text-slate-700 mt-0.5 capitalize">{{ request()!.concernCategory.replace('_', ' ') }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-slate-500">Concern Notes</dt>
              <dd class="text-slate-700 mt-0.5 whitespace-pre-wrap">{{ request()!.concernNotes }}</dd>
            </div>
            @if (request()!.scheduledFor) {
              <div>
                <dt class="text-slate-500">Scheduled For</dt>
                <dd class="font-medium text-blue-700 mt-0.5">{{ request()!.scheduledFor | date: 'dd MMM yyyy HH:mm' }}</dd>
              </div>
            }
            @if (request()!.cancellationReason) {
              <div class="sm:col-span-2">
                <dt class="text-slate-500">Cancellation Reason</dt>
                <dd class="text-red-700 mt-0.5">{{ request()!.cancellationReason }}</dd>
              </div>
            }
            <div>
              <dt class="text-slate-500">Submitted</dt>
              <dd class="text-slate-400 mt-0.5">{{ request()!.createdAt | date: 'dd MMM yyyy HH:mm' }}</dd>
            </div>
          </dl>
        </div>

        <!-- ── Action panels ───────────────────────────────────────────── -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          <!-- Status transition panel -->
          @if (canTransition()) {
            <div class="bg-white rounded-xl border border-brand-200 p-6" role="region" aria-label="Update status">
              <h2 class="text-base font-semibold text-slate-800 mb-4">Update Status</h2>
              <form [formGroup]="statusForm" (ngSubmit)="submitStatusUpdate()" novalidate>

                <!-- Next status dropdown -->
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
                    <option value="">Select next status…</option>
                    @for (ns of nextStatusOptions(); track ns) {
                      <option [value]="ns">{{ STATUS_LABELS[ns] }}</option>
                    }
                  </select>
                </div>

                <!-- scheduledFor — shown when 'scheduled' selected -->
                @if (selectedStatus() === 'scheduled') {
                  <div class="mb-3">
                    <label class="block text-sm font-medium text-slate-700 mb-1" for="scheduled-for">
                      Schedule Date &amp; Time <span class="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="scheduled-for"
                      type="datetime-local"
                      formControlName="scheduledFor"
                      class="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                      aria-required="true"
                    />
                    @if (statusForm.get('scheduledFor')?.invalid && statusForm.get('scheduledFor')?.touched) {
                      <p class="mt-1 text-xs text-red-600">
                        @if (statusForm.get('scheduledFor')?.errors?.['required']) {
                          Schedule date/time is required.
                        } @else if (statusForm.get('scheduledFor')?.errors?.['pastDate']) {
                          Schedule date must be today or in the future.
                        }
                      </p>
                    }
                  </div>
                }

                <!-- adminNotes — required when 'scheduled', shown for all transitions -->
                <div class="mb-3">
                  <label class="block text-sm font-medium text-slate-700 mb-1" for="admin-notes-transition">
                    Admin Notes
                    @if (selectedStatus() === 'scheduled') {
                      <span class="text-red-500" aria-hidden="true"> *</span>
                      <span class="text-slate-400 font-normal"> (min 5 chars)</span>
                    } @else {
                      <span class="text-slate-400 font-normal"> (optional)</span>
                    }
                  </label>
                  <textarea
                    id="admin-notes-transition"
                    formControlName="adminNotes"
                    rows="3"
                    maxlength="2000"
                    placeholder="Internal notes about this status change…"
                    class="w-full px-3 py-2 text-sm rounded-md border border-slate-300 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500"
                  ></textarea>
                  @if (statusForm.get('adminNotes')?.invalid && statusForm.get('adminNotes')?.touched) {
                    <p class="mt-1 text-xs text-red-600">Admin notes must be at least 5 characters when scheduling.</p>
                  }
                </div>

                <!-- cancellationReason — shown when 'cancelled' selected -->
                @if (selectedStatus() === 'cancelled') {
                  <div class="mb-3">
                    <label class="block text-sm font-medium text-slate-700 mb-1" for="cancellation-reason">
                      Cancellation Reason <span class="text-red-500" aria-hidden="true">*</span>
                      <span class="text-slate-400 font-normal"> (min 5 chars)</span>
                    </label>
                    <textarea
                      id="cancellation-reason"
                      formControlName="cancellationReason"
                      rows="3"
                      maxlength="500"
                      placeholder="Reason for cancellation…"
                      class="w-full px-3 py-2 text-sm rounded-md border border-slate-300 resize-y focus:outline-none focus:ring-2 focus:ring-red-400"
                      aria-required="true"
                    ></textarea>
                    @if (statusForm.get('cancellationReason')?.invalid && statusForm.get('cancellationReason')?.touched) {
                      <p class="mt-1 text-xs text-red-600">Cancellation reason is required (min 5 characters).</p>
                    }
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

          <!-- Admin notes panel (always editable, separate save) -->
          <div class="bg-white rounded-xl border border-slate-200 p-6" role="region" aria-label="Admin notes">
            <h2 class="text-base font-semibold text-slate-800 mb-4">Admin Notes</h2>
            <form [formGroup]="notesForm" (ngSubmit)="saveAdminNotes()" novalidate>
              <div class="mb-4">
                <label class="sr-only" for="standalone-admin-notes">Admin notes</label>
                <textarea
                  id="standalone-admin-notes"
                  formControlName="adminNotes"
                  rows="5"
                  maxlength="2000"
                  placeholder="Internal notes visible only to admin staff…"
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
export class MaintenanceDetailPageComponent implements OnInit, OnDestroy {
  private readonly maintenanceService = inject(AdminMaintenanceService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // ── Public constants for template ─────────────────────────────────────────
  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly STATUS_PILL_CLASS = STATUS_PILL_CLASS;

  // ── State ─────────────────────────────────────────────────────────────────
  protected readonly requestId = signal<string>('');
  protected readonly request = signal<AdminMaintenanceRequestDetailDto | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionBusy = signal<ActionBusy>('idle');
  protected readonly actionError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly canTransition = computed(() => {
    const r = this.request();
    if (!r) return false;
    return (NEXT_STATUSES[r.status] ?? []).length > 0;
  });

  protected readonly nextStatusOptions = computed((): MaintenanceRequestStatus[] => {
    const r = this.request();
    if (!r) return [];
    return NEXT_STATUSES[r.status] ?? [];
  });

  protected readonly selectedStatus = computed((): MaintenanceRequestStatus | '' => {
    return (this.statusForm.get('status')?.value as MaintenanceRequestStatus) || '';
  });

  // ── Forms ─────────────────────────────────────────────────────────────────
  protected readonly statusForm: FormGroup = this.fb.group({
    status:             [''],
    scheduledFor:       [null as string | null],
    adminNotes:         [''],
    cancellationReason: [''],
  });

  protected readonly notesForm: FormGroup = this.fb.group({
    adminNotes: [''],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.requestId.set(id);
    this.fetchRequest();

    // Dynamically adjust validators when status changes
    this.statusForm.get('status')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: string) => {
        this.updateDynamicValidators(status as MaintenanceRequestStatus | '');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Validator management ──────────────────────────────────────────────────

  private updateDynamicValidators(status: MaintenanceRequestStatus | ''): void {
    const scheduledForCtrl      = this.statusForm.get('scheduledFor')!;
    const adminNotesCtrl        = this.statusForm.get('adminNotes')!;
    const cancellationReasonCtrl = this.statusForm.get('cancellationReason')!;

    // Reset all dynamic validators first
    scheduledForCtrl.clearValidators();
    adminNotesCtrl.clearValidators();
    cancellationReasonCtrl.clearValidators();

    if (status === 'scheduled') {
      scheduledForCtrl.setValidators([Validators.required, futureDateValidator]);
      adminNotesCtrl.setValidators([Validators.required, Validators.minLength(5)]);
    } else if (status === 'cancelled') {
      cancellationReasonCtrl.setValidators([Validators.required, Validators.minLength(5)]);
    }

    scheduledForCtrl.updateValueAndValidity();
    adminNotesCtrl.updateValueAndValidity();
    cancellationReasonCtrl.updateValueAndValidity();
  }

  // ── Status update ─────────────────────────────────────────────────────────

  protected async submitStatusUpdate(): Promise<void> {
    this.statusForm.markAllAsTouched();
    if (this.statusForm.invalid) return;

    const { status, scheduledFor, adminNotes, cancellationReason } =
      this.statusForm.getRawValue() as {
        status: MaintenanceRequestStatus | '';
        scheduledFor: string | null;
        adminNotes: string;
        cancellationReason: string;
      };

    if (!status) return;

    this.actionBusy.set('updating');
    this.actionError.set(null);
    this.successMessage.set(null);

    const body: UpdateMaintenanceRequestStatusInput = { status };
    if (adminNotes && adminNotes.trim()) body.adminNotes = adminNotes.trim();
    if (scheduledFor) body.scheduledFor = scheduledFor;
    if (cancellationReason && cancellationReason.trim()) {
      body.cancellationReason = cancellationReason.trim();
    }

    try {
      await firstValueFrom(
        this.maintenanceService.updateRequest(this.requestId(), body),
      );
      this.statusForm.reset({ status: '', scheduledFor: null, adminNotes: '', cancellationReason: '' });
      this.successMessage.set(
        `Status updated to "${STATUS_LABELS[status]}".`,
      );
      this.fetchRequest();
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

  // ── Admin notes save ──────────────────────────────────────────────────────

  protected async saveAdminNotes(): Promise<void> {
    if (this.notesForm.pristine) return;

    const { adminNotes } = this.notesForm.getRawValue() as { adminNotes: string };

    this.actionBusy.set('saving-notes');
    this.actionError.set(null);
    this.successMessage.set(null);

    const body: UpdateMaintenanceRequestStatusInput = {
      adminNotes: adminNotes ?? null,
    };

    try {
      await firstValueFrom(
        this.maintenanceService.updateRequest(this.requestId(), body),
      );
      this.notesForm.markAsPristine();
      this.successMessage.set('Admin notes saved.');
      this.fetchRequest();
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

  private fetchRequest(): void {
    const id = this.requestId();
    if (!id) return;

    this.loading.set(true);
    this.loadError.set(null);

    this.maintenanceService
      .getRequest(id)
      .pipe(
        catchError((err: unknown) => {
          const msg =
            (err as { error?: { message?: string }; message?: string })?.error?.message ??
            (err as { message?: string })?.message ??
            'Failed to load maintenance request.';
          this.loadError.set(msg);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        if (result) {
          this.request.set(result);
          // Sync notesForm with latest adminNotes from server
          this.notesForm.reset({ adminNotes: result.adminNotes ?? '' });
          // Reset status form
          this.statusForm.reset({ status: '', scheduledFor: null, adminNotes: '', cancellationReason: '' });
        }
        this.loading.set(false);
      });
  }
}
