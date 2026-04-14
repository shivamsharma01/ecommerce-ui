import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { httpErrorMessage } from '../../core/http/http-error-message';
import { CreateUserAddressRequest, UserAddress, UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-checkout-add-address-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ReactiveFormsModule,
  ],
  templateUrl: './checkout-add-address-dialog.component.html',
  styleUrl: './checkout-add-address-dialog.component.css',
})
export class CheckoutAddAddressDialogComponent {
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<CheckoutAddAddressDialogComponent, UserAddress>);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  protected saving = false;

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
      makeDefault: v.makeDefault ?? true,
    };
    this.userService
      .createAddress(req)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (created) => this.dialogRef.close(created),
        error: (err: unknown) => {
          this.snackBar.open(httpErrorMessage(err, 'Could not save address.'), 'Dismiss', {
            duration: 6000,
          });
        },
      });
  }
}

