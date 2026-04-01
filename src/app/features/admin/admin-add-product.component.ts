import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-admin-add-product',
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
  templateUrl: './admin-add-product.component.html',
  styleUrl: './admin-add-product.component.css',
})
export class AdminAddProductComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly imageFile = signal<File | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(1000)]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    sku: ['', [Validators.required, Validators.maxLength(100)]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    categories: ['', Validators.required],
    brand: ['', Validators.maxLength(100)],
    imageAlt: ['Product image', [Validators.maxLength(255)]],
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.imageFile.set(file);
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;
    const file = this.imageFile();
    if (!file) {
      this.snackBar.open('Choose a gallery image file.', 'Dismiss', { duration: 5000 });
      return;
    }

    const raw = this.form.getRawValue();
    const categories = raw.categories
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (categories.length === 0) {
      this.snackBar.open('Enter at least one category (comma-separated).', 'Dismiss', {
        duration: 5000,
      });
      return;
    }

    const productPayload = {
      name: raw.name.trim(),
      description: raw.description.trim(),
      price: raw.price,
      sku: raw.sku.trim(),
      stockQuantity: raw.stockQuantity,
      categories,
      brand: raw.brand.trim() || undefined,
      gallery: [
        {
          thumbFile: file.name,
          hdFile: file.name,
          alt: raw.imageAlt.trim() || raw.name.trim(),
        },
      ],
      inStock: true,
    };

    const formData = new FormData();
    formData.append('product', new Blob([JSON.stringify(productPayload)], { type: 'application/json' }));
    formData.append('files', file, file.name);

    this.submitting.set(true);
    this.productService
      .createProductWithUpload(formData)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (created) => {
          this.snackBar.open(`Product created: ${created.name}`, 'View', { duration: 6000 }).onAction().subscribe(() => {
            void this.router.navigate(['/products', created.id]);
          });
          this.form.reset({ name: '', description: '', price: 0, sku: '', stockQuantity: 0, categories: '', brand: '', imageAlt: 'Product image' });
          this.imageFile.set(null);
        },
        error: (err: unknown) => {
          const msg =
            typeof err === 'object' && err !== null && 'error' in err
              ? typeof (err as { error?: unknown }).error === 'string'
                ? (err as { error: string }).error
                : (err as { error?: { message?: string } }).error?.message
              : null;
          this.snackBar.open(msg ?? 'Could not create product.', 'Dismiss', { duration: 8000 });
        },
      });
  }
}
