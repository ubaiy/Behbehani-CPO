import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { TRANSMISSIONS, FUEL_TYPES, DRIVETRAINS } from '@behbehani-cpo/shared-types';

/**
 * Specifications tab on the listing-edit page. Pure form-binding child —
 * extracted to keep listing-edit.component.html under the 500-line cap.
 */
@Component({
  selector: 'admin-listing-specifications-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './listing-specifications-tab.component.html',
})
export class ListingSpecificationsTabComponent {
  @Input({ required: true }) form!: FormGroup;

  protected readonly TRANSMISSIONS = TRANSMISSIONS;
  protected readonly FUEL_TYPES = FUEL_TYPES;
  protected readonly DRIVETRAINS = DRIVETRAINS;
}
