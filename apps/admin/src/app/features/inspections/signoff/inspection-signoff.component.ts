// TODO(reviewer:phase-4-cleanup): This file is 530 lines, exceeding the 500-line
// CLAUDE.md cap. The inline template accounts for ~270 lines. Refactor by
// extracting the CPO finalize action block + concierge finalize action block
// into separate SignoffFinalizeCpoComponent and SignoffFinalizeConciergeComponent
// (already partially done with SignoffFinalizeStepComponent). Defer until Phase 5.
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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import type {
  CustomerSignatureMethod,
  InspectionItemResult,
  SignoffDto,
  SignoffResponse,
} from '@behbehani-cpo/shared-types';
import { INSPECTION_RUBRIC, INSPECTION_RUBRIC_TOTAL } from '@behbehani-cpo/shared-types';
import { AdminInspectionsService, type InspectionDetailDto } from '@behbehani-cpo/data-access';

import { KIND_CHIP_CLASS, KIND_LABELS, STATUS_CHIP_CLASS, STATUS_LABELS } from '../shared/inspection-labels';
import { ScoreCircleComponent } from './score-circle.component';
import { SignoffStepperComponent } from './signoff-stepper.component';
import { CustomerSignatureModeComponent } from './customer-signature-mode.component';
import {
  SignoffReportSummaryComponent,
  type SectionScoreRow,
  type AttentionItem,
} from './signoff-report-summary.component';
import {
  CpoSignoffConfirmModalComponent,
  type CpoSignoffConfirmPayload,
  type CpoSignoffModalDetail,
} from './cpo-signoff-confirm-modal.component';
import { SignoffFinalizeStepComponent } from './signoff-finalize-step.component';

const CERT_THRESHOLD = 80;
const CONFIRM_TOKEN = 'SIGN OFF';

@Component({
  selector: 'admin-inspection-signoff',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, RouterLink,
    ScoreCircleComponent, SignoffStepperComponent,
    CustomerSignatureModeComponent, SignoffReportSummaryComponent,
    CpoSignoffConfirmModalComponent, SignoffFinalizeStepComponent,
  ],
  template: `
    <div class="max-w-5xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
      <a routerLink="../.." class="hover:text-slate-700">Inspections</a>
      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      <a routerLink=".." class="hover:text-slate-700 truncate max-w-xs">{{ detail()?.vehicleLabel ?? 'Inspection' }}</a>
      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      <span class="text-slate-800 font-medium">Sign off</span>
    </nav>

    @if (error()) {
      <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
    }
    @if (loading()) {
      <div class="animate-pulse space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <div class="flex items-center gap-5">
            <div class="w-24 h-24 rounded-full bg-slate-200 flex-shrink-0"></div>
            <div class="flex-1 space-y-2">
              <div class="h-5 bg-slate-200 rounded w-56"></div>
              <div class="h-3 bg-slate-100 rounded w-36"></div>
              <div class="flex gap-3 mt-2">
                <div class="h-3 bg-slate-100 rounded w-16"></div>
                <div class="h-3 bg-slate-100 rounded w-16"></div>
                <div class="h-3 bg-slate-100 rounded w-16"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <div class="h-3 bg-slate-200 rounded w-24 mb-3"></div>
            @for (i of [0,1,2,3,4]; track i) {
              <div class="h-3 bg-slate-100 rounded w-full"></div>
            }
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <div class="h-3 bg-slate-200 rounded w-32 mb-3"></div>
            @for (i of [0,1,2]; track i) {
              <div class="h-3 bg-slate-100 rounded w-full"></div>
            }
          </div>
        </div>
      </div>
    }

    @if (!loading() && detail(); as d) {

      <!-- Header -->
      <div class="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 class="text-xl font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
            Review &amp; sign off
            <span class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold" [ngClass]="KIND_CHIP_CLASS[d.kind]">{{ KIND_LABELS[d.kind] }}</span>
          </h1>
          @if (d.kind === 'concierge') {
            <p class="text-sm text-slate-500 mt-0.5">Inspector signs first, then the customer signs to verify. Once <strong>both</strong> signatures are recorded, the report becomes immutable and the PDF is generated.</p>
          } @else {
            <p class="text-sm text-slate-500 mt-0.5">CPO inspection — once signed off, this report is attached to the listing and becomes immutable.</p>
          }
        </div>
        <a routerLink=".." class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px] inline-flex items-center">← Back to form</a>
      </div>

      <!-- Stepper -->
      <admin-signoff-stepper [kind]="d.kind" [status]="d.status" />

      <!-- Concierge post-signoff CTA: prompt the user to issue a buy offer.
           Shows for any signed-off Concierge inspection — both the immediate
           post-signoff landing AND a return visit. CPO inspections don't get
           this banner; their post-signoff path is the listings pipeline. -->
      @if (d.kind === 'concierge' && d.status === 'signed_off') {
        <div class="bg-brand-50 rounded-xl border border-brand-200 p-5 mb-5 flex items-start gap-4 flex-wrap">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-brand-900">Inspection signed off — ready to make an offer</p>
            <p class="text-xs text-slate-700 mt-0.5">Send {{ d.customer?.fullName || 'the customer' }} a purchase offer based on this {{ d.overallScore || '—' }}/100 inspection score. They'll receive the offer by SMS + email.</p>
          </div>
          <a [routerLink]="['/operations/inspections', inspectionId, 'offer', 'new']"
             class="rounded-md bg-brand-600 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-700 min-h-[44px] inline-flex items-center flex-shrink-0">
            Create buy offer →
          </a>
        </div>
      }

      <!-- Not-ready guard: keeps users from staring at an unsubmittable form -->
      @if (notReadyForSignoff()) {
        <div class="bg-white rounded-xl border border-amber-200 bg-amber-50/40 p-4 mb-5 flex items-start gap-3">
          <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <div>
            <p class="text-sm font-semibold text-amber-900">Not ready for sign-off</p>
            <p class="text-xs text-amber-800 mt-0.5">Finish scoring all items (and add notes to every FAIL) on the edit form before returning here.</p>
            <a routerLink=".." class="inline-block mt-2 text-xs font-semibold text-brand-700 hover:underline">Back to the form →</a>
          </div>
        </div>
      }

      <!-- Vehicle + score banner -->
      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div class="flex items-center gap-5 flex-wrap">
          <admin-score-circle [score]="d.overallScore" size="lg" />
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold text-slate-800">{{ d.vehicleLabel }}</h2>
            <p class="text-xs text-slate-500 mt-0.5 font-mono">
              @if (d.kind === 'cpo' && d.listing) { #{{ d.listing.stockNumber }} · }
              @if (d.vinMasked) { VIN {{ d.vinMasked }} }
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <span class="inline-flex items-center gap-1.5 text-slate-600"><span class="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0"></span><span class="font-semibold tabular-nums">{{ counts().pass }}</span> Pass</span>
              <!-- Amber dot: documented palette exception — advisory needs distinct colour from pass (blue) and fail (red) -->
              <span class="inline-flex items-center gap-1.5 text-slate-600"><span class="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span><span class="font-semibold tabular-nums">{{ counts().advisory }}</span> Advisory</span>
              <span class="inline-flex items-center gap-1.5 text-slate-600"><span class="w-2 h-2 rounded-full bg-red-600 flex-shrink-0"></span><span class="font-semibold tabular-nums">{{ counts().fail }}</span> Fail</span>
              <span class="text-slate-300">·</span>
              <span class="text-slate-500">Inspector: <span class="font-medium text-slate-700">{{ d.inspector?.fullName ?? '—' }}</span></span>
              <span class="text-slate-300">·</span>
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold" [ngClass]="STATUS_CHIP_CLASS[d.status]">{{ STATUS_LABELS[d.status] }}</span>
            </div>
          </div>
          @if ((d.overallScore ?? 0) >= CERT_THRESHOLD) {
            <div class="text-right flex-shrink-0">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                Behbehani Certified
              </span>
              <p class="text-xs text-slate-400 mt-2">Score >= {{ CERT_THRESHOLD }} qualifies for cert badge</p>
            </div>
          }
        </div>
      </div>

      <!-- Section scores + attention items (extracted component) -->
      <admin-signoff-report-summary [sectionScores]="sectionScores()" [attentionItems]="itemsNeedingAttention()" />

      <!-- Step 2: Inspector sign-off -->
      @if (canEditSignoff()) {
        <div class="bg-white rounded-xl border border-slate-200 p-5 mb-5">
          <p class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            Inspector sign-off
          </p>
          @if (d.inspector) {
            <div class="flex items-center gap-3 p-3 rounded-md border border-slate-200 bg-slate-50 mb-4">
              <div class="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-bold text-white">{{ initials(d.inspector.fullName) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-800">{{ d.inspector.fullName }}</p>
                <!-- User.employeeNumber column not in Prisma schema — see deferred-items. -->
                <p class="text-xs text-slate-500">Inspection officer</p>
              </div>
              <p class="text-xs text-slate-400 text-right flex-shrink-0">
                Started {{ d.startedAt ? formatDate(d.startedAt) : '—' }}
              </p>
            </div>
          }
          <div class="space-y-2 mb-4">
            <label class="flex items-start gap-2 cursor-pointer min-h-[44px]">
              <input type="checkbox" class="mt-1 rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4" [ngModel]="inspectorAck1()" (ngModelChange)="inspectorAck1.set($event)"/>
              <span class="text-sm text-slate-700">I confirm I personally inspected this vehicle and all {{ TOTAL }} item scores reflect my assessment.</span>
            </label>
            <label class="flex items-start gap-2 cursor-pointer min-h-[44px]">
              <input type="checkbox" class="mt-1 rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4" [ngModel]="inspectorAck2()" (ngModelChange)="inspectorAck2.set($event)"/>
              <span class="text-sm text-slate-700">I understand sign-off makes this report <strong>immutable</strong>@if (d.kind === 'concierge') { after the customer signs } — corrections require a new inspection report.</span>
            </label>
          </div>
        </div>
      }

      <!-- Step 3: Customer signature method (Concierge only) -->
      @if (d.kind === 'concierge' && canEditSignoff()) {
        <div class="bg-white rounded-xl border border-slate-200 p-5 mb-5">
          <p class="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            Customer signature — how will the customer sign?
          </p>
          <p class="text-xs text-slate-500 mb-4 ml-8">Required for Concierge. The signed PDF will include both signatures + audit trail.</p>
          <div class="ml-0 md:ml-8">
            <admin-customer-signature-mode
              [method]="customerMethod()"
              [customerName]="d.customer?.fullName ?? ''"
              [customerMobile]="d.customer?.mobile ?? null"
              [typedName]="customerTypedName()"
              [civilIdLast4]="customerCivilIdLast4()"
              [ackOwner]="customerAckOwner()"
              [ackAccurate]="customerAckAccurate()"
              [ackUseForOffer]="customerAckUseForOffer()"
              (methodChange)="customerMethod.set($event)"
              (signatureChange)="customerSignatureSvg.set($event)"
              (typedNameChange)="customerTypedName.set($event)"
              (civilIdLast4Change)="customerCivilIdLast4.set($event)"
              (ackOwnerChange)="customerAckOwner.set($event)"
              (ackAccurateChange)="customerAckAccurate.set($event)"
              (ackUseForOfferChange)="customerAckUseForOffer.set($event)"
            />
          </div>
        </div>
      }

      @if (d.status === 'awaiting_customer_signature') {
        <div class="bg-blue-50 rounded-xl border border-blue-200 p-5 mb-5">
          <p class="text-sm font-semibold text-slate-700 mb-2">Awaiting customer signature</p>
          @if (lastSignoffResponse()?.customerSignUrl; as url) {
            <p class="text-xs text-slate-600 break-all mb-1">URL <code class="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 text-xs">{{ url }}</code></p>
          } @else {
            <p class="text-xs text-slate-500 mb-2">The customer will receive an SMS + email with a secure signing link.</p>
          }
          @if (lastSignoffResponse()?.customerSignTokenExpiresAt; as exp) {
            <p class="text-xs text-slate-500 mb-2">Valid until {{ formatDate(exp) }}</p>
          }
          <div class="flex items-center gap-3 flex-wrap">
            @if (lastSignoffResponse()?.customerSignUrl) {
              <button type="button" class="text-brand-600 font-medium hover:underline min-h-[44px] text-sm" (click)="copyLink(lastSignoffResponse()!.customerSignUrl)">Copy link</button>
              <span class="text-slate-300">·</span>
            }
            <button type="button" class="text-brand-600 font-medium hover:underline min-h-[44px] text-sm" (click)="resendLink()" [disabled]="busy()">Resend link</button>
            <span class="text-slate-300">·</span>
            <button type="button" class="text-red-600 font-medium hover:underline min-h-[44px] text-sm" (click)="revokeLink()" [disabled]="busy()">Revoke link</button>
          </div>
        </div>
      }

      <!-- Step 4: Finalize -->
      @if (canEditSignoff()) {
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <p class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{{ d.kind === 'concierge' ? '4' : '3' }}</span>
            Finalize report
          </p>

          @if (validationMessage() && d.kind === 'cpo') {
            <p class="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">{{ validationMessage() }}</p>
          }
          @if (d.kind === 'cpo') {
            <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 flex-wrap">
              <a routerLink=".." class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px] inline-flex items-center">Cancel</a>
              <button type="button" class="rounded-md px-4 py-1.5 text-sm font-semibold min-h-[44px] transition-colors"
                [ngClass]="cpoCanOpenModal() ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'"
                [disabled]="!cpoCanOpenModal() || busy()" (click)="openCpoModal(d)"
              >@if (busy()) { Submitting… } @else { Sign off &amp; generate PDF }</button>
            </div>
          }
        </div>
      }
      @if (canEditSignoff() && detail()?.kind === 'concierge') {
        <admin-signoff-finalize-step
          [confirmToken]="CONFIRM_TOKEN" [confirmText]="confirmText()"
          [validationMessage]="validationMessage()" [canSubmit]="canSubmit()"
          [busy]="busy()" [submitLabel]="submitLabel()"
          (confirmTextChange)="confirmText.set($event)" (submitClick)="submit()"
        />
      }

      <!-- CPO sign-off modal — renders above all content (§16 D10) -->
      @if (showCpoModal()) {
        <admin-cpo-signoff-confirm-modal
          [open]="showCpoModal()"
          [detail]="cpoModalDetail()"
          (confirm)="onCpoModalConfirm($event)"
          (cancel)="showCpoModal.set(false)"
        />
      }
    }
    </div><!-- /max-w-5xl -->
  `,
})
export class InspectionSignoffComponent implements OnInit, OnDestroy {
  private readonly service = inject(AdminInspectionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  protected readonly TOTAL = INSPECTION_RUBRIC_TOTAL;
  protected readonly CERT_THRESHOLD = CERT_THRESHOLD;
  protected readonly CONFIRM_TOKEN = CONFIRM_TOKEN;
  protected readonly KIND_LABELS = KIND_LABELS;
  protected readonly KIND_CHIP_CLASS = KIND_CHIP_CLASS;
  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly STATUS_CHIP_CLASS = STATUS_CHIP_CLASS;

  protected readonly detail = signal<InspectionDetailDto | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<boolean>(false);
  protected readonly lastSignoffResponse = signal<SignoffResponse | null>(null);

  // All sign-off form fields are signals so `validationMessage` (a computed)
  // re-evaluates whenever the user toggles a checkbox, types in the confirm
  // input, etc. Previously these were plain class fields — ngModel updated
  // them but the computed never re-ran, leaving the button greyed-out forever.
  protected readonly inspectorAck1 = signal(false);
  protected readonly inspectorAck2 = signal(false);
  protected readonly customerMethod = signal<CustomerSignatureMethod>('in_person');
  protected readonly customerSignatureSvg = signal<string>('');
  protected readonly customerTypedName = signal('');
  protected readonly customerCivilIdLast4 = signal('');
  protected readonly customerAckOwner = signal(false);
  protected readonly customerAckAccurate = signal(false);
  protected readonly customerAckUseForOffer = signal(false);
  protected readonly confirmText = signal('');

  // CPO modal state (§16 D10)
  protected readonly showCpoModal = signal(false);
  protected readonly cpoModalDetail = signal<CpoSignoffModalDetail | null>(null);

  // protected (not private) so the post-signoff CTA template can build the
  // routerLink to /operations/inspections/:id/offer/new
  protected inspectionId = '';

  protected readonly canEditSignoff = computed(() => {
    // Only allow sign-off once the report has been moved to
    // awaiting_inspector_signoff (i.e. all items scored, FAILs have notes).
    // `in_progress` reports should bounce back to the edit form via the
    // notReadyForSignoff banner below.
    return this.detail()?.status === 'awaiting_inspector_signoff';
  });

  /** True if user landed on signoff but the report isn't ready yet. */
  protected readonly notReadyForSignoff = computed(() => {
    const s = this.detail()?.status;
    return s === 'draft' || s === 'in_progress';
  });

  protected readonly counts = computed(() => {
    const items = this.detail()?.reportJson?.items ?? [];
    let pass = 0, advisory = 0, fail = 0;
    for (const it of items) {
      if (it.status === 'pass') pass++;
      else if (it.status === 'advisory') advisory++;
      else if (it.status === 'fail') fail++;
    }
    return { pass, advisory, fail };
  });

  protected readonly itemsNeedingAttention = computed<AttentionItem[]>(() =>
    (this.detail()?.reportJson?.items ?? [])
      .filter((it): it is InspectionItemResult & { status: 'advisory' | 'fail' } =>
        it.status === 'advisory' || it.status === 'fail')
      .map((it) => ({ itemId: it.itemId, labelEn: this.labelForItemId(it.itemId), status: it.status, notes: it.notes ?? null })),
  );

  protected readonly sectionScores = computed<SectionScoreRow[]>(() => {
    const items = this.detail()?.reportJson?.items ?? [];
    return INSPECTION_RUBRIC.map((sec) => {
      const secItems = items.filter((it) => sec.items.some((ri) => ri.id === it.itemId));
      const passes = secItems.filter((it) => it.status === 'pass').length;
      const score = secItems.length === sec.items.length ? Math.round((passes / sec.items.length) * 100) : null;
      return { key: sec.key, labelEn: sec.labelEn, itemCount: sec.items.length, score };
    });
  });

  protected readonly validationMessage = computed<string | null>(() => {
    const d = this.detail();
    if (!d || !this.canEditSignoff()) return null;
    if (!this.inspectorAck1() || !this.inspectorAck2()) return 'Both inspector acknowledgements are required.';
    if (d.kind === 'concierge' && this.customerMethod() === 'in_person') {
      if (!this.customerSignatureSvg()) return 'Customer must draw a signature before finalizing.';
      if (this.customerTypedName().trim().length < 2) return 'Customer must type their full name.';
      if (!this.customerAckOwner() || !this.customerAckAccurate() || !this.customerAckUseForOffer())
        return 'All three customer acceptance checkboxes are required.';
      if (this.customerCivilIdLast4() && !/^\d{4}$/.test(this.customerCivilIdLast4()))
        return 'Civil ID last 4 must be 4 digits.';
    }
    if (this.confirmText().trim() !== CONFIRM_TOKEN) return `Type "${CONFIRM_TOKEN}" to confirm.`;
    return null;
  });

  protected readonly canSubmit = computed(() => this.canEditSignoff() && this.validationMessage() === null);

  /** CPO path: modal opens when inspector acks are done (text gate removed for CPO). */
  protected readonly cpoCanOpenModal = computed(() => {
    const d = this.detail();
    if (!d || d.kind !== 'cpo' || !this.canEditSignoff()) return false;
    return this.inspectorAck1() && this.inspectorAck2();
  });

  protected submitLabel(): string {
    const d = this.detail();
    if (!d) return 'Sign off';
    if (d.kind === 'cpo') return 'Sign off & generate PDF';
    return this.customerMethod() === 'remote_link' ? 'Send signing link' : 'Sign off & generate PDF';
  }

  protected openCpoModal(d: InspectionDetailDto): void {
    this.cpoModalDetail.set({ vehicleLabel: d.vehicleLabel, bookingRef: d.listing?.stockNumber ?? '', overallScore: d.overallScore ?? null, inspectorName: d.inspector?.fullName ?? null });
    this.showCpoModal.set(true);
  }

  protected onCpoModalConfirm(payload: CpoSignoffConfirmPayload): void {
    this.showCpoModal.set(false);
    const d = this.detail();
    if (!d || d.kind !== 'cpo') return;
    const dto = this.buildCpoSignoffDto(payload.advanceToPhotoshoot);
    if (!dto) return;
    this.busy.set(true); this.error.set(null);
    this.service.signoff(this.inspectionId, dto).pipe(takeUntil(this.destroy$)).subscribe({
      next: (resp) => {
        this.lastSignoffResponse.set(resp);
        this.busy.set(false);
        this.loadDetail();
        // CPO inspections close out to the queue; Concierge needs the offer
        // step next so we keep them on this page where the CTA banner appears.
        if (resp.status === 'signed_off' && this.detail()?.kind === 'cpo') {
          void this.router.navigate(['/operations/inspections']);
        }
      },
      error: (err) => { this.busy.set(false); this.error.set((err as Error)?.message ?? 'Sign-off failed.'); },
    });
  }

  ngOnInit(): void {
    this.inspectionId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.inspectionId) {
      this.error.set('Inspection ID is missing from the route.');
      this.loading.set(false);
      return;
    }
    this.loadDetail();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  protected submit(): void {
    const d = this.detail();
    if (!d || !this.canSubmit()) return;
    const dto = this.buildSignoffDto(d.kind);
    if (!dto) return;
    this.busy.set(true);
    this.error.set(null);
    this.service.signoff(this.inspectionId, dto).pipe(takeUntil(this.destroy$)).subscribe({
      next: (resp) => {
        this.lastSignoffResponse.set(resp);
        this.busy.set(false);
        this.loadDetail();
        // CPO finalises to the queue; Concierge stays on this page so the
        // post-signoff "Create buy offer" CTA banner is the next visible step.
        if (resp.status === 'signed_off' && this.detail()?.kind === 'cpo') {
          void this.router.navigate(['/operations/inspections']);
        }
      },
      error: (err) => { this.busy.set(false); this.error.set((err as Error)?.message ?? 'Sign-off failed.'); },
    });
  }

  protected resendLink(): void {
    this.busy.set(true);
    this.service.resendSignLink(this.inspectionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (resp) => { this.lastSignoffResponse.set(resp); this.busy.set(false); },
      error: (err) => { this.busy.set(false); this.error.set((err as Error)?.message ?? 'Failed to resend link.'); },
    });
  }

  protected revokeLink(): void {
    if (!confirm('Revoke the signing link? The customer will not be able to sign until you generate a new one.')) return;
    this.busy.set(true);
    this.service.revokeSignLink(this.inspectionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.busy.set(false); this.lastSignoffResponse.set(null); this.loadDetail(); },
      error: (err) => { this.busy.set(false); this.error.set((err as Error)?.message ?? 'Failed to revoke link.'); },
    });
  }

  protected copyLink(url: string | null): void { if (url) void navigator.clipboard?.writeText(url); }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  protected initials(name: string): string {
    return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  private loadDetail(): void {
    this.loading.set(true);
    this.service.get(this.inspectionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (detail) => { this.detail.set(detail); this.loading.set(false); },
      error: (err) => { this.error.set((err as Error)?.message ?? 'Failed to load inspection.'); this.loading.set(false); },
    });
  }

  /** §16 D10 — extra advanceToPhotoshoot flag; backend ignores unknown fields. */
  private buildCpoSignoffDto(advanceToPhotoshoot: boolean): SignoffDto | null {
    return { mode: 'cpo', ...(advanceToPhotoshoot ? { advanceToPhotoshoot: true } : {}) } as SignoffDto;
  }

  private buildSignoffDto(kind: 'cpo' | 'concierge'): SignoffDto | null {
    if (kind === 'cpo') return { mode: 'cpo' };
    if (this.customerMethod() === 'remote_link') return { mode: 'concierge_remote_link' };
    const civilId = this.customerCivilIdLast4().trim();
    return {
      mode: 'concierge_in_person',
      customerSignature: {
        drawnSignatureSvg: this.customerSignatureSvg(),
        typedName: this.customerTypedName().trim(),
        ...(civilId ? { civilIdLast4: civilId } : {}),
        accepted: { owner: true, accurate: true, useForOffer: true },
      },
    };
  }

  private labelForItemId(itemId: string): string {
    for (const section of INSPECTION_RUBRIC) {
      const found = section.items.find((it) => it.id === itemId);
      if (found) return found.labelEn;
    }
    return itemId;
  }
}
