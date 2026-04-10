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
import { InventoryService } from '../../core/services/inventory.service';
import { httpErrorMessage } from '../../core/http/http-error-message';

const MAX_GALLERY = 10;

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
  private readonly inventoryService = inject(InventoryService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly syncingInventory = signal(false);
  protected readonly apiError = signal<string | null>(null);
  protected readonly galleryFiles = signal<File[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(1000)]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    sku: ['', [Validators.required, Validators.maxLength(100)]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    categories: ['', Validators.required],
    brand: ['', Validators.maxLength(100)],
  });

  onGalleryFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    if (picked.length > MAX_GALLERY) {
      this.snackBar.open(`Using first ${MAX_GALLERY} images (max allowed).`, 'OK', { duration: 4000 });
      this.galleryFiles.set(picked.slice(0, MAX_GALLERY));
    } else {
      this.galleryFiles.set(picked);
    }
    input.value = '';
  }

  removeGalleryFile(index: number): void {
    this.galleryFiles.update((files) => files.filter((_, i) => i !== index));
  }

  syncInventoryFromCatalog(): void {
    if (this.syncingInventory()) return;
    this.syncingInventory.set(true);
    this.inventoryService
      .syncFromCatalog()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.syncingInventory.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.snackBar.open(`Inventory synced: ${res.productsSynced} product row(s) upserted.`, 'OK', {
            duration: 5000,
          });
        },
        error: (err: unknown) => {
          this.snackBar.open(httpErrorMessage(err, 'Could not sync inventory.'), 'Dismiss', { duration: 6000 });
        },
      });
  }

  private partNameForIndex(file: File, index: number): string {
    return `gallery-${index}-${file.name}`;
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.apiError.set(null);
    const files = this.galleryFiles();
    if (files.length === 0) {
      this.snackBar.open('Choose at least one gallery image (up to 10).', 'Dismiss', { duration: 5000 });
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

    const nameTrim = raw.name.trim();
    const gallery = files.map((file, i) => {
      const part = this.partNameForIndex(file, i);
      return {
        thumbFile: part,
        hdFile: part,
        alt: `${nameTrim} — ${i + 1}`,
      };
    });

    const productPayload = {
      name: nameTrim,
      description: raw.description.trim(),
      price: raw.price,
      sku: raw.sku.trim(),
      stockQuantity: raw.stockQuantity,
      categories,
      brand: raw.brand.trim() || undefined,
      gallery,
      inStock: true,
    };

    const formData = new FormData();
    formData.append('product', new Blob([JSON.stringify(productPayload)], { type: 'application/json' }));
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      formData.append('files', file, this.partNameForIndex(file, i));
    }

    this.submitting.set(true);
    this.productService
      .createProductWithUpload(formData)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (created) => {
          this.snackBar.open(`Product created: ${created.name}`, 'OK', { duration: 3000 });
          void this.router.navigate(['/catalog']);
        },
        error: (err: unknown) => {
          this.apiError.set(httpErrorMessage(err, 'Could not create product.'));
        },
      });
  }
}
