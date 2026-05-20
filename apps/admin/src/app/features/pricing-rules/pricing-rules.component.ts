import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
  takeUntil,
} from 'rxjs';

import type {
  PricingTierDto,
  PricingTierCreate,
  PricingTierUpdate,
  PricingPreviewResponse,
  AgingEngineStatusDto,
  ListingStage,
} from '@behbehani-cpo/shared-types';
import { LISTING_STAGES } from '@behbehani-cpo/shared-types';
import { formatKwd } from '@behbehani-cpo/shared-utils';
import { AdminPricingService, AdminAgingService } from '@behbehani-cpo/data-access';
import { ConfirmModalService } from '@behbehani-cpo/shared-ui';
import { AdminRoleDirective } from '../../core/admin-role.directive';
import { PricingTierDrawerComponent } from './pricing-tier-drawer.component';

const WRITE_ROLES: Array<'super_admin' | 'finance_officer'> = ['super_admin', 'finance_officer'];

@Component({
  selector: 'admin-pricing-rules',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, AdminRoleDirective, PricingTierDrawerComponent],
  templateUrl: './pricing-rules.component.html',
})
export class PricingRulesComponent implements OnInit, OnDestroy {
  private readonly pricingService = inject(AdminPricingService);
  private readonly agingService = inject(AdminAgingService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  protected readonly LISTING_STAGES = LISTING_STAGES;
  protected readonly WRITE_ROLES = WRITE_ROLES;

  // ── Page state ─────────────────────────────────────────────────────────
  protected readonly tiers = signal<PricingTierDto[]>([]);
  protected readonly engineStatus = signal<AgingEngineStatusDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly runningNow = signal(false);

  // ── Drawer state ────────────────────────────────────────────────────────
  protected readonly drawerOpen = signal(false);
  protected readonly drawerMode = signal<'create' | 'edit'>('create');
  protected readonly editingTierId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly drawerError = signal<string | null>(null);

  // ── Preview state ───────────────────────────────────────────────────────
  protected readonly preview = signal<PricingPreviewResponse | null>(null);
  protected readonly previewLoading = signal(false);
  private readonly previewSubject = new Subject<void>();

  // ── Form ────────────────────────────────────────────────────────────────
  protected readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
    daysThresholdMin: [null as number | null, [Validators.required, Validators.min(1)]],
    discountPercent: [null as number | null, [Validators.required, Validators.min(0.5), Validators.max(50)]],
    stagesAffected: [[] as ListingStage[]],
    autoApply: [false],
  });

  ngOnInit(): void {
    this.loadAll();

    // Debounced preview on form change
    this.form.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.previewSubject.next();
    });

    this.previewSubject.pipe(
      switchMap(() => {
        const val = this.form.value as { daysThresholdMin: number; discountPercent: number; stagesAffected: ListingStage[] };
        const { daysThresholdMin, discountPercent, stagesAffected } = val;
        if (!daysThresholdMin || !discountPercent || stagesAffected.length === 0) {
          this.preview.set(null);
          return of(null);
        }
        const discountBps = Math.round(-discountPercent * 100);
        this.previewLoading.set(true);
        return this.pricingService.preview({ daysThresholdMin, discountBps, stagesAffected }).pipe(
          catchError(() => of(null)),
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe(result => {
      this.previewLoading.set(false);
      this.preview.set(result);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAll(): void {
    this.loading.set(true);
    this.pricingService.list().pipe(
      catchError(err => {
        this.error.set((err as Error)?.message ?? 'Failed to load tiers.');
        return of({ items: [], total: 0 });
      }),
      takeUntil(this.destroy$),
    ).subscribe(resp => {
      this.tiers.set([...resp.items].sort((a, b) => a.daysThresholdMin - b.daysThresholdMin));
      this.loading.set(false);
    });

    this.agingService.status().pipe(
      catchError(() => of(null)),
      takeUntil(this.destroy$),
    ).subscribe(status => this.engineStatus.set(status));
  }

  // ── Header actions ──────────────────────────────────────────────────────

  protected runNow(): void {
    this.runningNow.set(true);
    this.agingService.runNow({}).pipe(
      catchError(() => of(null)),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.runningNow.set(false);
      // Refresh engine status after triggering a run
      this.agingService.status().pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$),
      ).subscribe(s => this.engineStatus.set(s));
    });
  }

  // ── Drawer ──────────────────────────────────────────────────────────────

  protected openCreate(): void {
    this.form.reset({ name: '', daysThresholdMin: null, discountPercent: null, stagesAffected: [], autoApply: false });
    this.drawerMode.set('create');
    this.editingTierId.set(null);
    this.preview.set(null);
    this.drawerError.set(null);
    this.drawerOpen.set(true);
  }

  protected openEdit(tier: PricingTierDto): void {
    this.form.reset({
      name: tier.name,
      daysThresholdMin: tier.daysThresholdMin,
      discountPercent: -(tier.discountBps / 100),
      stagesAffected: [...tier.stagesAffected],
      autoApply: tier.autoApply,
    });
    this.drawerMode.set('edit');
    this.editingTierId.set(tier.id);
    this.preview.set(null);
    this.drawerError.set(null);
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
    this.editingTierId.set(null);
    this.preview.set(null);
  }

  protected toggleStage(stage: ListingStage): void {
    const current: ListingStage[] = this.form.get('stagesAffected')?.value ?? [];
    const updated = current.includes(stage)
      ? current.filter(s => s !== stage)
      : [...current, stage];
    this.form.get('stagesAffected')?.setValue(updated);
  }

  protected isStageSelected(stage: ListingStage): boolean {
    const current: ListingStage[] = this.form.get('stagesAffected')?.value ?? [];
    return current.includes(stage);
  }

  protected saveTier(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const stagesAffected: ListingStage[] = this.form.value.stagesAffected ?? [];
    if (stagesAffected.length === 0) {
      this.drawerError.set('At least one stage must be selected.');
      return;
    }

    const discountBps = Math.round(-(this.form.value.discountPercent as number) * 100);
    const payload: PricingTierCreate = {
      name: this.form.value.name as string,
      daysThresholdMin: this.form.value.daysThresholdMin as number,
      discountBps,
      stagesAffected,
      autoApply: this.form.value.autoApply as boolean,
    };

    this.saving.set(true);
    this.drawerError.set(null);

    const id = this.editingTierId();
    const call$ = id
      ? this.pricingService.update(id, payload as PricingTierUpdate)
      : this.pricingService.create(payload);

    call$.pipe(
      catchError(err => {
        this.drawerError.set((err as Error)?.message ?? 'Save failed. Please try again.');
        this.saving.set(false);
        return of(null);
      }),
      takeUntil(this.destroy$),
    ).subscribe(result => {
      if (!result) return;
      this.saving.set(false);
      this.closeDrawer();
      this.loadAll();
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────

  protected async deleteTier(tier: PricingTierDto): Promise<void> {
    const confirmed = await this.confirmModal.open({
      variant: 'severe',
      title: `Delete tier — ${tier.name}?`,
      body: 'This will permanently remove this tier. The nightly engine will no longer apply this discount. This action cannot be undone.',
      confirmLabel: 'Delete tier',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

    this.pricingService.delete(tier.id).pipe(
      catchError(err => {
        this.error.set((err as Error)?.message ?? 'Delete failed.');
        return of(undefined);
      }),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.loadAll();
    });
  }

  // ── Display helpers ─────────────────────────────────────────────────────

  protected formatBps(bps: number): string {
    return `−${(Math.abs(bps) / 100).toFixed(1)}%`;
  }

  protected formatRelative(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3_600_000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffMs / 86_400_000);
    if (diffD === 1) return 'Yesterday';
    if (diffD < 7) return `${diffD} days ago`;
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  }

  protected formatNextRun(iso: string | null): string {
    if (!iso) return 'Not scheduled';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    if (diffMs <= 0) return 'Imminent';
    const h = Math.floor(diffMs / 3_600_000);
    const m = Math.floor((diffMs % 3_600_000) / 60_000);
    return `in ${h}h ${m}m`;
  }

  protected formatFilsAsKwd(filsString: string): string {
    const fils = Number(filsString);
    if (Number.isNaN(fils)) return '—';
    return formatKwd(fils / 1000);
  }
}
