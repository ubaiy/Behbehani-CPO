import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';

export type SubscribeResult =
  | { kind: 'ok' }
  | { kind: 'already_subscribed' }
  | { kind: 'validation_error' }
  | { kind: 'network_error' };

interface WaitlistResponseOk {
  subscribed: true;
}
interface WaitlistResponseAlready {
  subscribed: false;
  alreadySubscribed: true;
}
type WaitlistResponse = WaitlistResponseOk | WaitlistResponseAlready;

@Injectable({ providedIn: 'root' })
export class FeatureWaitlistService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get endpoint(): string {
    return `${this.config.baseUrl}/public/feature-waitlists`;
  }

  subscribe(featurePath: string, email: string): Observable<SubscribeResult> {
    if (!email.trim().includes('@')) {
      return of({ kind: 'validation_error' } satisfies SubscribeResult);
    }
    return this.http
      .post<WaitlistResponse>(this.endpoint, { featurePath, email: email.trim() })
      .pipe(
        map((res): SubscribeResult =>
          res.subscribed ? { kind: 'ok' } : { kind: 'already_subscribed' },
        ),
        catchError((err: HttpErrorResponse): Observable<SubscribeResult> => {
          if (err.status === 422 || err.status === 400) {
            return of({ kind: 'validation_error' });
          }
          return of({ kind: 'network_error' });
        }),
      );
  }
}
