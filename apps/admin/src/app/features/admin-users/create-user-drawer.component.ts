import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import type { AdminRole } from '@behbehani-cpo/shared-types';
import { ADMIN_ROLES, ADMIN_ROLE_LABELS } from '@behbehani-cpo/shared-types';

/** Very simple password strength: weak / fair / strong. */
function passwordStrength(pw: string): 'weak' | 'fair' | 'strong' {
  if (pw.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  if (score <= 2) return 'weak';
  if (score === 3) return 'fair';
  return 'strong';
}

/**
 * Side-drawer for creating a new admin or customer user. Pure presentation +
 * event-out: the parent owns the form, save call, role-set state, and close
 * logic. Extracted to keep users-list.component.html under the 500-line cap.
 */
@Component({
  selector: 'admin-create-user-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-user-drawer.component.html',
})
export class CreateUserDrawerComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() errorMessage: string | null = null;
  @Input() saving = false;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly toggleRole = new EventEmitter<AdminRole>();

  protected readonly ADMIN_ROLES = ADMIN_ROLES;
  protected readonly ADMIN_ROLE_LABELS = ADMIN_ROLE_LABELS;

  protected get pwMode(): string {
    return this.form.get('passwordMode')?.value as string;
  }

  protected get pwValue(): string {
    return (this.form.get('password')?.value as string) ?? '';
  }

  protected get pwStrength(): 'weak' | 'fair' | 'strong' {
    return passwordStrength(this.pwValue);
  }

  protected isRoleSelected(role: AdminRole): boolean {
    const current: string[] = this.form.get('adminRoles')?.value ?? [];
    return current.includes(role);
  }
}
