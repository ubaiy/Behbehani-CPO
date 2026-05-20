import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import type { BrandDto } from '@behbehani-cpo/shared-types';
import { AdminCatalogAdminService } from '@behbehani-cpo/data-access';
import { slugify } from '@behbehani-cpo/shared-utils';

type Mode = 'create' | 'edit';

@Component({
  selector: 'admin-brand-edit-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './brand-edit-drawer.component.html',
})
export class BrandEditDrawerComponent {
  @Input({ required: true }) mode: Mode = 'create';
  @Input() brand: BrandDto | null = null;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<BrandDto>();

  private readonly fb = inject(FormBuilder);
  private readonly catalog = inject(AdminCatalogAdminService);
  private readonly destroy$ = new Subject<void>();
  private slugManuallyEdited = false;

  protected readonly form: FormGroup = this.fb.group({
    nameEn: ['', [Validators.required, Validators.maxLength(80)]],
    nameAr: ['', [Validators.required, Validators.maxLength(80)]],
    slug: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    isActive: [true],
  });

  protected readonly saving = signal(false);
  protected readonly uploadingLogo = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly logoUrl = signal<string | null>(null);

  ngOnInit(): void {
    if (this.mode === 'edit' && this.brand) {
      this.form.patchValue({
        nameEn: this.brand.nameEn,
        nameAr: this.brand.nameAr,
        slug: this.brand.slug,
        isActive: this.brand.isActive,
      });
      this.logoUrl.set(this.brand.logoUrl);
      this.slugManuallyEdited = true; // editing — don't auto-rewrite
    }

    // Auto-slug from EN name while the user hasn't manually edited the slug.
    this.form.get('nameEn')!.valueChanges
      .pipe(debounceTime(150), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value: string) => {
        if (!this.slugManuallyEdited && value) {
          this.form.get('slug')!.setValue(slugify(value), { emitEvent: false });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSlugInput(): void {
    this.slugManuallyEdited = true;
  }

  protected regenerateSlug(): void {
    const en = (this.form.get('nameEn')?.value as string) ?? '';
    this.form.get('slug')!.setValue(slugify(en));
    this.slugManuallyEdited = false;
  }

  protected onLogoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/png', 'image/svg+xml'].includes(file.type)) {
      this.errorMessage.set('Logo must be PNG or SVG.');
      return;
    }
    if (file.size > 200 * 1024) {
      this.errorMessage.set('Logo exceeds 200 KB limit.');
      return;
    }
    if (this.mode !== 'edit' || !this.brand) {
      this.errorMessage.set('Save the brand first before uploading a logo.');
      return;
    }
    this.errorMessage.set(null);
    this.uploadingLogo.set(true);
    this.catalog.uploadBrandLogo(this.brand.id, file).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.logoUrl.set(updated.logoUrl);
        this.uploadingLogo.set(false);
      },
      error: () => {
        this.errorMessage.set('Logo upload failed. Please retry.');
        this.uploadingLogo.set(false);
      },
    });
  }

  protected removeLogo(): void {
    if (this.mode !== 'edit' || !this.brand || !this.logoUrl()) return;
    this.uploadingLogo.set(true);
    this.catalog.removeBrandLogo(this.brand.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.logoUrl.set(updated.logoUrl);
        this.uploadingLogo.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to remove logo.');
        this.uploadingLogo.set(false);
      },
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Please correct the form errors before saving.');
      return;
    }
    this.errorMessage.set(null);
    this.saving.set(true);
    const v = this.form.value as { nameEn: string; nameAr: string; slug: string; isActive: boolean };

    const call$ = this.mode === 'edit' && this.brand
      ? this.catalog.updateBrand(this.brand.id, v)
      : this.catalog.createBrand(v);

    call$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.saved.emit(result);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const msg = err instanceof Error ? err.message : 'Save failed.';
        this.errorMessage.set(msg);
      },
    });
  }

  protected initials(name: string | undefined | null): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }
}
