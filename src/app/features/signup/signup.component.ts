import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { AuthService } from '../../core/auth';

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
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected errorMessage = '';
  protected successMessage = '';
  protected isLoading = false;

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

  onSubmit(): void {
    if (this.form.invalid || this.isLoading) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    const raw = this.form.getRawValue();
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
        },
      });
  }
}
