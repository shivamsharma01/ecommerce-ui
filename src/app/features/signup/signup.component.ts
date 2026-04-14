import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth';
import { httpErrorMessage } from '../../core/http/http-error-message';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string | undefined;
  const confirm = group.get('confirmPassword')?.value as string | undefined;
  if (password == null || confirm == null) return null;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);

  protected errorMessage = '';
  protected successMessage = '';
  /** Shown after email verification redirect (GET /auth/verify-email → /signup?verified=1). */
  protected verificationSuccessMessage = '';
  /** Shown when verification link is invalid or expired. */
  protected verificationErrorMessage = '';
  protected isLoading = false;
  protected resendMessage = '';
  protected resendErrorMessage = '';
  protected isResending = false;
  protected submittedEmail: string | null = null;

  protected form = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      firstName: ['', [Validators.required, Validators.maxLength(255)]],
      lastName: ['', [Validators.required, Validators.maxLength(255)]],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qs) => {
      this.verificationSuccessMessage = '';
      this.verificationErrorMessage = '';
      if (qs.get('verified') === '1') {
        this.verificationSuccessMessage =
          'Your email is verified. You can sign in with your password.';
      }
      const err = qs.get('error');
      if (err) {
        try {
          this.verificationErrorMessage = decodeURIComponent(err);
        } catch {
          this.verificationErrorMessage = err;
        }
      }
      this.cdr.markForCheck();
    });
  }

  onSubmit(): void {
    if (this.isLoading) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fix the errors and try again.';
      this.cdr.markForCheck();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.resendMessage = '';
    this.resendErrorMessage = '';
    this.isLoading = true;

    const raw = this.form.getRawValue();
    this.submittedEmail = raw.email.trim();
    const body = {
      email: raw.email.trim(),
      password: raw.password,
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
    };

    this.auth
      .signup(body)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.successMessage =
            res.message ??
            'Account created. Check your email to verify, then you can sign in.';
          this.snackBar.open(`Verification email sent to ${this.submittedEmail}.`, 'OK', {
            duration: 4500,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        },
        error: (err) => {
          const e = err?.error;
          if (typeof e === 'string' && e.length > 0) {
            this.errorMessage = e;
          } else if (e?.message) {
            this.errorMessage = e.message;
          } else if (err?.status === 409) {
            this.errorMessage = 'That email is already registered.';
          } else {
            this.errorMessage = 'Signup failed. Please try again.';
          }
          this.snackBar.open(this.errorMessage, 'Dismiss', { duration: 6000 });
        },
      });
  }

  onResendVerification(): void {
    if (!this.submittedEmail || this.isResending) return;
    this.resendMessage = '';
    this.resendErrorMessage = '';
    this.isResending = true;

    this.auth
      .resendVerification(this.submittedEmail)
      .pipe(
        finalize(() => {
          this.isResending = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (msg) => {
          this.resendMessage =
            msg || 'If the email exists, a verification link has been sent.';
        },
        error: (err: unknown) => {
          this.resendErrorMessage = httpErrorMessage(
            err,
            'Could not resend verification email right now. Please try again later.',
          );
        },
      });
  }
}
