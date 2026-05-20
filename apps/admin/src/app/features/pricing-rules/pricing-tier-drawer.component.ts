import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import type { PricingPreviewResponse, ListingStage } from '@behbehani-cpo/shared-types';
import { LISTING_STAGES } from '@behbehani-cpo/shared-types';
import { formatKwd } from '@behbehani-cpo/shared-utils';

/**
 * Side-drawer for creating/editing a pricing tier. Pure presentation +
 * event-out: the parent owns the form, the save call, and the close logic.
 * Extracted from pricing-rules.component to keep that file under the 500-line cap.
 */
@Component({
  selector: 'admin-pricing-tier-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pricing-tier-drawer.component.html',
})
export class PricingTierDrawerComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) mode: 'create' | 'edit' = 'create';
  @Input() errorMessage: string | null = null;
  @Input() preview: PricingPreviewResponse | null = null;
  @Input() previewLoading = false;
  @Input() saving = false;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly toggleStage = new EventEmitter<ListingStage>();

  protected readonly LISTING_STAGES = LISTING_STAGES;

  protected isStageSelected(stage: ListingStage): boolean {
    const current: ListingStage[] = this.form.get('stagesAffected')?.value ?? [];
    return current.includes(stage);
  }

  protected formatFilsAsKwd(filsString: string): string {
    const fils = Number(filsString);
    if (Number.isNaN(fils)) return '—';
    return formatKwd(fils / 1000);
  }
}
