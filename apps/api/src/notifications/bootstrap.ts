/**
 * Notification adapter bootstrap.
 *
 * Imported ONCE at app startup (from main.ts). Side effect: registers the
 * push, email, and sms adapters with NotificationService.
 *
 * Adding a new channel: create an adapter file in ./adapters/, import and
 * register it here.
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.2 §5 Day 3.
 */

import { registerAdapter } from './notification.service';
import { pushAdapter }  from './adapters/push.adapter';
import { emailAdapter } from './adapters/email.adapter';
import { smsAdapter }   from './adapters/sms.adapter';

let bootstrapped = false;

export function bootstrapNotificationAdapters(): void {
  if (bootstrapped) return;
  registerAdapter('push',  pushAdapter);
  registerAdapter('email', emailAdapter);
  registerAdapter('sms',   smsAdapter);
  bootstrapped = true;
  // eslint-disable-next-line no-console
  console.log('[notifications] adapters registered: push, email, sms');
}
