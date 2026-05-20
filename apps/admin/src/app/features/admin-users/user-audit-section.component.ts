import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import type { AuditLogEntryDto } from '@behbehani-cpo/shared-types';

/**
 * Collapsible audit-log table for a single user, rendered inside the user-edit
 * page. Pure presentation + toggle event. Extracted to keep user-edit.component.html
 * under the 500-line cap.
 */
@Component({
  selector: 'admin-user-audit-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-audit-section.component.html',
})
export class UserAuditSectionComponent {
  @Input({ required: true }) entries: AuditLogEntryDto[] = [];
  @Input() loading = false;
  @Input() hasError = false;
  @Input() expanded = true;
  @Input({ required: true }) userName = '';
  @Input({ required: true }) userId = '';

  @Output() readonly toggle = new EventEmitter<void>();

  protected formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
