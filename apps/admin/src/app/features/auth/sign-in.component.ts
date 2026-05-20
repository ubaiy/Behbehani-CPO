import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@behbehani-cpo/data-access';
import type { AuthSession } from '@behbehani-cpo/shared-types';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'admin-sign-in',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './sign-in.component.html',
})
export class AdminSignInComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;

    this.errorMessage.set(null);
    this.submitting.set(true);

    this.auth
      .signInWithEmail({
        email: this.form.getRawValue().email,
        password: this.form.getRawValue().password,
      })
      .subscribe({
        next: (session: AuthSession) => {
          if (session.user.role !== 'admin') {
            this.auth.signOut().subscribe();
            this.errorMessage.set(
              'This account is not authorised for the back office.',
            );
            this.submitting.set(false);
            return;
          }
          const returnUrl =
            this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
          void this.router.navigateByUrl(returnUrl);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          if (err.status === 401) {
            this.errorMessage.set('Invalid email or password.');
          } else if (err.status === 423) {
            this.errorMessage.set(
              'Account locked. Try again in a few minutes.',
            );
          } else {
            const apiMessage =
              (err.error as { error?: string } | null)?.error ?? null;
            this.errorMessage.set(
              apiMessage ?? 'Sign-in failed. Please try again.',
            );
          }
        },
      });
  }
}
