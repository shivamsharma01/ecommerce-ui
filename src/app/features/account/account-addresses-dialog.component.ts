import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { httpErrorMessage } from '../../core/http/http-error-message';
import { CreateUserAddressRequest, UserAddress, UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-account-addresses-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule,
    MatCheckboxModule,
    ReactiveFormsModule,
  ],
  templateUrl: './account-addresses-dialog.component.html',
  styleUrl: './account-addresses-dialog.component.css',
})
export class AccountAddressesDialogComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  protected loading = true;
  protected saving = false;
  protected errorMessage = '';
  protected addresses: UserAddress[] = [];
  protected showAddForm = false;

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    line1: ['', [Validators.required]],
    line2: [''],
    city: ['', [Validators.required]],
    state: ['', [Validators.required]],
    pincode: ['', [Validators.required]],
    country: ['India', [Validators.required]],
    makeDefault: [true],
  });

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.loading = true;
    this.errorMessage = '';
    this.userService
      .listAddresses()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (list) => {
          this.addresses = list ?? [];
        },
        error: (err: unknown) => {
          this.errorMessage = httpErrorMessage(err, 'Could not load addresses.');
        },
      });
  }

  protected toggleAdd(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm && this.addresses.length === 0) {
      this.form.patchValue({ makeDefault: true });
    }
  }

  protected save(): void {
    if (this.saving) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.form.getRawValue();
    const req: CreateUserAddressRequest = {
      fullName: v.fullName.trim(),
      phone: v.phone.trim(),
      line1: v.line1.trim(),
      line2: v.line2?.trim() || null,
      city: v.city.trim(),
      state: v.state.trim(),
      pincode: v.pincode.trim(),
      country: v.country.trim(),
      makeDefault: v.makeDefault,
    };
    this.userService
      .createAddress(req)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Address saved.', 'OK', { duration: 2500 });
          this.showAddForm = false;
          this.form.reset({
            fullName: '',
            phone: '',
            line1: '',
            line2: '',
            city: '',
            state: '',
            pincode: '',
            country: 'India',
            makeDefault: true,
          });
          this.refresh();
        },
        error: (err: unknown) => {
          this.snackBar.open(httpErrorMessage(err, 'Could not save address.'), 'Dismiss', {
            duration: 6000,
          });
        },
      });
  }

  protected makeDefault(a: UserAddress): void {
    if (a.isDefault) return;
    this.userService
      .setDefaultAddress(a.addressId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Default address updated.', 'OK', { duration: 2500 });
          this.refresh();
        },
        error: (err: unknown) => {
          this.snackBar.open(httpErrorMessage(err, 'Could not update default address.'), 'Dismiss', {
            duration: 6000,
          });
        },
      });
  }

  protected formatOneLine(a: UserAddress): string {
    const parts = [a.line1, a.line2, a.city, a.state, a.pincode, a.country].filter(
      (x) => typeof x === 'string' && x.trim().length > 0,
    ) as string[];
    return parts.join(', ');
  }
}

