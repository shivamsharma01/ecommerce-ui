import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth';
import { httpErrorMessage } from '../../core/http/http-error-message';

/** Must match auth service login error when email is unverified. */
const EMAIL_NOT_VERIFIED_MESSAGE = 'Email not verified';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected errorMessage = '';
  /** True when the last login attempt failed because the account email is not verified yet. */
  protected emailNotVerified = false;
  protected resendMessage = '';
  protected resendErrorMessage = '';
  protected isResending = false;
  protected isLoading = false;

  protected form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit(): void {
    if (this.form.invalid || this.isLoading) return;

    this.errorMessage = '';
    this.emailNotVerified = false;
    this.resendMessage = '';
    this.resendErrorMessage = '';
    this.isLoading = true;

    const { email, password } = this.form.getRawValue();

    this.auth
      .login(email, password)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/catalog']);
        },
        error: (err) => {
          const e = err?.error;
          let msg: string;
          if (typeof e === 'string' && e.length > 0) {
            msg = e;
          } else if (e?.message) {
            msg = e.message;
          } else {
            msg = 'Login failed. Please check your credentials.';
          }
          this.errorMessage = msg;
          this.emailNotVerified = msg === EMAIL_NOT_VERIFIED_MESSAGE;
        },
      });
  }

  onResendVerification(): void {
    const email = this.form.getRawValue().email.trim();
    if (!email || this.form.get('email')?.invalid || this.isResending) return;

    this.resendMessage = '';
    this.resendErrorMessage = '';
    this.isResending = true;

    this.auth
      .resendVerification(email)
      .pipe(
        finalize(() => {
          this.isResending = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (text) => {
          this.resendMessage =
            text || 'If the email exists, a verification link has been sent.';
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
