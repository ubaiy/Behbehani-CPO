import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Read-only lockout-history card on the user-edit Security tab. Tiny but
 * extracted so user-edit.component.html stays under the 500-line cap.
 */
@Component({
  selector: 'admin-user-lockout-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-slate-200 p-5">
      <h3 class="text-sm font-semibold text-slate-700 mb-4">Lockout history</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">Locked until</th>
              <th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">Failed attempts</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="py-2.5 pr-4 text-xs text-slate-700 font-mono">{{ lockedUntil ? formatDate(lockedUntil) : '—' }}</td>
              <td class="py-2.5 pr-4 text-xs text-slate-600">{{ failedLoginCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class UserLockoutHistoryComponent {
  @Input() lockedUntil: string | null = null;
  @Input() failedLoginCount = 0;

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
