import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

interface Brand { id: string; nameEn: string; nameAr: string }
interface ModelItem {
  id: string;
  nameEn: string;
  nameAr: string;
  brandId: string;
  trims: Array<{ id: string; name: string }>;
}
interface BodyType { id: string; nameEn: string; nameAr: string }

type DescLang = 'en' | 'ar';

/**
 * Overview tab on the listing-edit page. Pure form-binding child — the parent
 * owns the FormGroup and the catalog signals; this component just renders.
 * Extracted to keep listing-edit.component.html under the 500-line cap.
 */
@Component({
  selector: 'admin-listing-overview-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './listing-overview-tab.component.html',
})
export class ListingOverviewTabComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) brands: Brand[] = [];
  @Input({ required: true }) filteredModels: ModelItem[] = [];
  @Input({ required: true }) bodyTypes: BodyType[] = [];
  @Input({ required: true }) descLang: DescLang = 'en';

  @Output() readonly descLangChange = new EventEmitter<DescLang>();
}
