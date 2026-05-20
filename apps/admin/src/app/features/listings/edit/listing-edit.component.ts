import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { ConfirmModalService } from '@behbehani-cpo/shared-ui';

import type {
  ListingDetail,
  ListingStage,
  CreateListingDto,
  UpdateListingDto,
  ChangeStageDto,
  AdminRole,
} from '@behbehani-cpo/shared-types';
import {
  LISTING_STAGES,
  CreateListingSchema,
} from '@behbehani-cpo/shared-types';
import {
  AdminCatalogService,
  AdminListingsService,
  AuthService,
} from '@behbehani-cpo/data-access';

import {
  STAGE_LABELS,
  STAGE_CHIP_CLASS,
  agingChipClass,
} from '../../../core/listing-stage.util';
import { AdminRoleDirective } from '../../../core/admin-role.directive';
import { StageTransitionModalComponent } from './stage-transition-modal.component';
import { MediaGalleryComponent } from './media/media-gallery.component';
import { ListingOverviewTabComponent } from './tabs/listing-overview-tab.component';
import { ListingSpecificationsTabComponent } from './tabs/listing-specifications-tab.component';
import {
  buildListingEditForm,
  type Brand,
  type ModelItem,
  type BodyType,
  type ActiveTab,
  type DescLang,
} from './listing-edit.types';

@Component({
  selector: 'admin-listing-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    AdminRoleDirective,
    StageTransitionModalComponent,
    MediaGalleryComponent,
    ListingOverviewTabComponent,
    ListingSpecificationsTabComponent,
  ],
  templateUrl: './listing-edit.component.html',
})
export class ListingEditComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly listings = inject(AdminListingsService);
  private readonly catalog = inject(AdminCatalogService);
  private readonly confirm = inject(ConfirmModalService);
  protected readonly auth = inject(AuthService);

  private readonly destroy$ = new Subject<void>();

  // ── Route / mode ──────────────────────────────────────────────────────────
  protected readonly isNew = signal(true);
  protected readonly listingId = signal<string | null>(null);
  protected readonly listingDetail = signal<ListingDetail | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  protected readonly activeTab = signal<ActiveTab>('overview');
  protected readonly descLang = signal<DescLang>('en');
  protected readonly saving = signal(false);
  protected readonly saveStatus = signal<'idle' | 'saved' | 'error'>('idle');
  protected readonly saveMessage = signal('');
  protected readonly togglingFeatured = signal(false);

  // ── Stage transition modal ─────────────────────────────────────────────────
  protected readonly modalOpen = signal(false);
  protected readonly modalFrom = signal<ListingStage>('acquired');
  protected readonly modalTo = signal<ListingStage>('acquired');
  /** Captures what action triggered the modal: 'pipeline' | 'publish' */
  private pendingTransitionAction: 'pipeline' | 'publish' = 'pipeline';

  // ── Catalog data ──────────────────────────────────────────────────────────
  protected readonly brands = signal<Brand[]>([]);
  protected readonly models = signal<ModelItem[]>([]);
  protected readonly bodyTypes = signal<BodyType[]>([]);

  // ── Current stage (authoritative after load/transition) ───────────────────
  protected readonly currentStage = signal<ListingStage>('acquired');

  // ── Constants exposed to template ─────────────────────────────────────────
  protected readonly LISTING_STAGES = LISTING_STAGES;
  protected readonly STAGE_LABELS = STAGE_LABELS;
  protected readonly STAGE_CHIP_CLASS = STAGE_CHIP_CLASS;
  protected readonly agingChipClass = agingChipClass;
  protected readonly financeRoles: AdminRole[] = ['finance_officer', 'general_manager'];
  protected readonly dangerRoles: AdminRole[] = ['operations_manager', 'general_manager'];

  // ── Derived stats ─────────────────────────────────────────────────────────
  protected readonly daysOnLot = computed(() => this.listingDetail()?.daysOnLot ?? 0);
  protected readonly agingClass = computed(() => agingChipClass(this.daysOnLot()));

  // ── Form ──────────────────────────────────────────────────────────────────
  protected readonly form: FormGroup = buildListingEditForm(this.fb);

  // ── Publish guard ─────────────────────────────────────────────────────────
  protected readonly canPublish = computed(() => {
    if (!this.form.valid) return false;
    const v = this.form.value as Record<string, unknown>;
    const dto = this.buildCreateDto(v);
    return CreateListingSchema.safeParse(dto).success;
  });

  protected readonly missingFieldCount = computed(() => {
    let count = 0;
    const controls = this.form.controls;
    const required = ['titleEn', 'vin', 'brandId', 'modelId', 'bodyTypeId',
      'year', 'mileageKm', 'exteriorColor', 'interiorColor',
      'transmission', 'fuelType', 'drivetrain', 'seats', 'doors', 'priceKwd'];
    for (const key of required) {
      if (controls[key]?.invalid) count++;
    }
    return count;
  });

  // ── Audit log (last 4 from priceHistory as proxy) ─────────────────────────
  protected readonly recentHistory = computed(() => {
    const detail = this.listingDetail();
    if (!detail) return [];
    return detail.priceHistory.slice(0, 4);
  });

  // ── Filtered models (depends on brand selection) ──────────────────────────
  protected readonly filteredModels = computed(() => {
    const brandId = this.form.get('brandId')?.value as string | null;
    if (!brandId) return this.models();
    return this.models().filter((m) => m.brandId === brandId);
  });

  ngOnInit(): void {
    this.loadCatalog();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.isNew.set(false);
      this.listingId.set(idParam);
      this.loadListing(idParam);
    }

    // React to brand changes: clear model selection and refetch models.
    this.form.get('brandId')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((brandId: string | null) => {
        this.form.patchValue({ modelId: '' }, { emitEvent: false });
        if (brandId) this.loadModelsForBrand(brandId);
        else this.models.set([]);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Navigation helpers ───────────────────────────────────────────────────
  protected setTab(tab: ActiveTab): void { this.activeTab.set(tab); }
  protected setDescLang(lang: DescLang): void { this.descLang.set(lang); }

  // ── Stage pipeline helpers ────────────────────────────────────────────────
  protected stageIndex(stage: ListingStage): number {
    return LISTING_STAGES.indexOf(stage);
  }

  protected stageIsComplete(stage: ListingStage): boolean {
    return this.stageIndex(stage) < this.stageIndex(this.currentStage());
  }

  protected stageIsCurrent(stage: ListingStage): boolean {
    return stage === this.currentStage();
  }

  protected requestStageTransition(to: ListingStage): void {
    if (to === this.currentStage()) return;
    this.pendingTransitionAction = 'pipeline';
    this.modalFrom.set(this.currentStage());
    this.modalTo.set(to);
    this.modalOpen.set(true);
  }

  // ── Save Draft (NEVER touches stage) ─────────────────────────────────────
  protected saveDraft(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showSaveStatus('error', 'Please fill in all required fields before saving.');
      return;
    }
    this.saving.set(true);
    this.saveStatus.set('idle');

    const id = this.listingId();

    if (!id) {
      // CREATE — do NOT include stage; API defaults to 'acquired' (private).
      const dto = this.buildCreateDto(this.form.value as Record<string, unknown>);
      this.listings.create(dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (detail) => {
            this.listingId.set(detail.id);
            this.isNew.set(false);
            this.listingDetail.set(detail);
            this.currentStage.set(detail.stage);
            this.saving.set(false);
            this.showSaveStatus('saved', 'Draft saved.');
            void this.router.navigate(['/inventory/listings', detail.id], { replaceUrl: true });
          },
          error: () => {
            this.saving.set(false);
            this.showSaveStatus('error', 'Save failed. Please try again.');
          },
        });
    } else {
      // UPDATE — do NOT include stage field; only patch form fields.
      const dto = this.buildUpdateDto(this.form.value as Record<string, unknown>);
      this.listings.update(id, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (detail) => {
            this.listingDetail.set(detail);
            this.saving.set(false);
            this.showSaveStatus('saved', 'Draft saved.');
          },
          error: () => {
            this.saving.set(false);
            this.showSaveStatus('error', 'Save failed. Please try again.');
          },
        });
    }
  }

  // ── Publish: save then open stage modal targeting 'listed' ────────────────
  protected publish(): void {
    if (!this.canPublish()) return;
    this.saving.set(true);

    const id = this.listingId();

    const save$ = id
      ? this.listings.update(id, this.buildUpdateDto(this.form.value as Record<string, unknown>))
      : this.listings.create(this.buildCreateDto(this.form.value as Record<string, unknown>));

    save$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (detail) => {
        this.listingId.set(detail.id);
        this.isNew.set(false);
        this.listingDetail.set(detail);
        this.currentStage.set(detail.stage);
        this.saving.set(false);
        // Now open stage transition modal targeting 'listed'.
        this.pendingTransitionAction = 'publish';
        this.modalFrom.set(detail.stage);
        this.modalTo.set('listed');
        this.modalOpen.set(true);
      },
      error: () => {
        this.saving.set(false);
        this.showSaveStatus('error', 'Save failed before publishing.');
      },
    });
  }

  // ── Modal event handlers ──────────────────────────────────────────────────
  protected onModalConfirm(event: { reason: string | null }): void {
    this.modalOpen.set(false);
    const id = this.listingId();
    if (!id) return;

    const dto: ChangeStageDto = {
      stage: this.modalTo(),
      ...(event.reason ? { reason: event.reason } : {}),
    };

    this.listings.changeStage(id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (detail) => {
          this.listingDetail.set(detail);
          this.currentStage.set(detail.stage);
          this.showSaveStatus('saved',
            `Stage moved to ${STAGE_LABELS[detail.stage]}.`);
          if (this.pendingTransitionAction === 'publish') {
            void this.router.navigate(['/inventory/listings', detail.id]);
          }
        },
        error: () => {
          this.showSaveStatus('error', 'Stage transition failed.');
        },
      });
  }

  protected onModalCancel(): void {
    this.modalOpen.set(false);
  }

  // ── Featured toggle ───────────────────────────────────────────────────────
  /**
   * Flip the Featured flag on the loaded listing. No confirm modal —
   * low-risk reversible curation. Updates `listingDetail` in place so the
   * header chip + star icon refresh immediately.
   */
  protected toggleFeatured(): void {
    const detail = this.listingDetail();
    const id = this.listingId();
    if (!detail || !id || this.togglingFeatured()) return;
    const next = !detail.featuredAt;
    this.togglingFeatured.set(true);
    this.listings
      .setFeatured(id, next)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.listingDetail.set(updated);
          this.togglingFeatured.set(false);
        },
        error: () => {
          this.togglingFeatured.set(false);
          this.showSaveStatus('error', 'Failed to update Featured flag.');
        },
      });
  }

  // ── Archive ───────────────────────────────────────────────────────────────
  protected archiveListing(): void {
    void this.handleArchiveListing();
  }

  private async handleArchiveListing(): Promise<void> {
    const id = this.listingId();
    if (!id) return;

    const ok = await this.confirm.open({
      title: 'Archive vehicle',
      body: 'Archive this listing? It will be removed from all active views. You can undo this within 30 days.',
      variant: 'destructive',
      requireTyped: 'ARCHIVE',
      confirmLabel: 'Archive vehicle',
      onConfirm: () => firstValueFrom(this.listings.archive(id)),
    });

    if (ok) {
      void this.router.navigate(['/inventory/listings']);
    }
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  // Brands + body types load up front. Models load lazily per brand because
  // the API only exposes /catalog/brands/:brandId/models — there is no
  // load-all-models endpoint by design (would be a 1k+ row payload).
  private loadCatalog(): void {
    this.catalog.brands()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (b) => this.brands.set(b as Brand[]),
        error: (err) => console.error('[ListingEdit] Failed to load brands', err),
      });

    this.catalog.bodyTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bt) => this.bodyTypes.set(bt as BodyType[]),
        error: (err) => console.error('[ListingEdit] Failed to load body types', err),
      });
  }

  private loadModelsForBrand(brandId: string): void {
    this.catalog.models(brandId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (models) => {
          this.models.set(models.map((m) => ({ ...m, brandId })) as ModelItem[]);
        },
        error: () => this.models.set([]),
      });
  }

  private loadListing(id: string): void {
    this.listings.get(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (detail) => {
          this.listingDetail.set(detail);
          this.currentStage.set(detail.stage);
          // Models for this listing's brand must be loaded before patching the
          // form, otherwise the modelId select has no matching option.
          if (detail.brand?.id) this.loadModelsForBrand(detail.brand.id);
          this.patchFormFromDetail(detail);
        },
        error: () => void this.router.navigate(['/inventory/listings']),
      });
  }

  private patchFormFromDetail(d: ListingDetail): void {
    const priceKwd = d.priceFils
      ? (Number(d.priceFils) / 1000).toFixed(3)
      : '';
    const costKwd = d.costFils
      ? (Number(d.costFils) / 1000).toFixed(3)
      : '';

    this.form.patchValue({
      titleEn: d.titleEn ?? '',
      titleAr: d.titleAr ?? '',
      vin: d.vin ?? '',
      brandId: d.brand?.id ?? '',
      modelId: d.model?.id ?? '',
      trimId: d.trimId ?? '',
      bodyTypeId: d.bodyType?.id ?? '',
      year: d.year,
      mileageKm: d.mileageKm,
      descriptionEn: d.descriptionEn ?? '',
      descriptionAr: d.descriptionAr ?? '',
      exteriorColor: d.exteriorColor ?? '',
      interiorColor: d.interiorColor ?? '',
      transmission: d.transmission,
      fuelType: d.fuelType,
      engineCc: d.engineCc ?? null,
      cylinders: d.cylinders ?? null,
      drivetrain: d.drivetrain,
      seats: d.seats,
      doors: d.doors,
      gccSpec: d.gccSpec,
      previousOwners: d.previousOwners,
      serviceHistory: d.serviceHistory,
      accidentHistory: d.accidentHistory,
      accidentNotes: d.accidentNotes ?? '',
      priceKwd,
      costKwd,
      agingDiscountEnabled: d.agingDiscountEnabled,
    }, { emitEvent: false });
  }

  // ── DTO builders ──────────────────────────────────────────────────────────
  private buildCreateDto(v: Record<string, unknown>): CreateListingDto {
    return {
      titleEn: String(v['titleEn'] ?? ''),
      ...(v['titleAr'] ? { titleAr: String(v['titleAr']) } : {}),
      brandId: String(v['brandId'] ?? ''),
      modelId: String(v['modelId'] ?? ''),
      ...(v['trimId'] ? { trimId: String(v['trimId']) } : {}),
      bodyTypeId: String(v['bodyTypeId'] ?? ''),
      vin: String(v['vin'] ?? '').toUpperCase().trim(),
      year: Number(v['year']),
      mileageKm: Number(v['mileageKm']),
      exteriorColor: String(v['exteriorColor'] ?? ''),
      interiorColor: String(v['interiorColor'] ?? ''),
      transmission: v['transmission'] as CreateListingDto['transmission'],
      fuelType: v['fuelType'] as CreateListingDto['fuelType'],
      ...(v['engineCc'] !== null && v['engineCc'] !== '' ? { engineCc: Number(v['engineCc']) } : {}),
      ...(v['cylinders'] !== null && v['cylinders'] !== '' ? { cylinders: Number(v['cylinders']) } : {}),
      drivetrain: v['drivetrain'] as CreateListingDto['drivetrain'],
      seats: Number(v['seats']),
      doors: Number(v['doors']),
      gccSpec: Boolean(v['gccSpec']),
      previousOwners: Number(v['previousOwners'] ?? 1),
      serviceHistory: Boolean(v['serviceHistory']),
      accidentHistory: Boolean(v['accidentHistory']),
      ...(v['accidentHistory'] && v['accidentNotes'] ? { accidentNotes: String(v['accidentNotes']) } : {}),
      priceFils: this.kwdToFils(v['priceKwd'] as string),
      ...(v['costKwd'] ? { costFils: this.kwdToFils(v['costKwd'] as string) } : {}),
      agingDiscountEnabled: Boolean(v['agingDiscountEnabled']),
      ...(v['descriptionEn'] ? { descriptionEn: String(v['descriptionEn']) } : {}),
      ...(v['descriptionAr'] ? { descriptionAr: String(v['descriptionAr']) } : {}),
    } as CreateListingDto;
  }

  private buildUpdateDto(v: Record<string, unknown>): UpdateListingDto {
    // UpdateListingDto is a partial of CreateListingDto — same shape, all optional.
    // We deliberately omit `stage` to prevent Save Draft from publishing.
    return this.buildCreateDto(v) as UpdateListingDto;
  }

  private kwdToFils(kwd: string): number {
    const parsed = parseFloat(kwd);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 1000);
  }

  protected filsToKwd(fils: string | number): string {
    return (Number(fils) / 1000).toFixed(3);
  }

  // ── Toast helper ──────────────────────────────────────────────────────────
  private showSaveStatus(status: 'saved' | 'error', message: string): void {
    this.saveStatus.set(status);
    this.saveMessage.set(message);
    setTimeout(() => this.saveStatus.set('idle'), 3500);
  }
}
