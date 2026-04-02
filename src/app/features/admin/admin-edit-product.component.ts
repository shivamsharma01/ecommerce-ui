import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EMPTY, finalize, switchMap } from 'rxjs';
import { ProductService, type ProductUpdatePayload } from '../../core/services/product.service';
import { httpErrorMessage } from '../../core/http/http-error-message';
import type { Product, ProductGalleryImage } from '../../shared/models/product.model';

@Component({
  selector: 'app-admin-edit-product',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './admin-edit-product.component.html',
  styleUrl: './admin-add-product.component.css',
})
export class AdminEditProductComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly saveError = signal<string | null>(null);

  /** Gallery rows for PUT (existing URLs; can remove images, not upload new ones here). */
  protected readonly galleryRows = signal<ProductGalleryImage[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(1000)]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    sku: ['', [Validators.required, Validators.maxLength(100)]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    categories: ['', Validators.required],
    brand: ['', Validators.maxLength(100)],
    inStock: [true],
    rating: [null as number | null],
  });

  private productId: string | null = null;

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          if (!id) {
            this.loadError.set('Missing product id.');
            this.loading.set(false);
            return EMPTY;
          }
          this.productId = id;
          this.loading.set(true);
          this.loadError.set(null);
          return this.productService.getById(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (p: Product) => {
          this.patchFromProduct(p);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.loadError.set(httpErrorMessage(err, 'Could not load product.'));
        },
      });
  }

  private patchFromProduct(p: Product): void {
    this.form.patchValue({
      name: p.name,
      description: p.description ?? '',
      price: p.price,
      sku: p.sku ?? '',
      stockQuantity: p.stockQuantity ?? 0,
      categories: (p.categories ?? []).join(', '),
      brand: p.brand ?? '',
      inStock: p.inStock !== false,
      rating: p.rating ?? null,
    });
    this.galleryRows.set([...(p.gallery ?? [])]);
  }

  removeGalleryRow(index: number): void {
    this.galleryRows.update((rows) => rows.filter((_, i) => i !== index));
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting() || !this.productId) return;
    this.saveError.set(null);

    const raw = this.form.getRawValue();
    const categories = raw.categories
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (categories.length === 0) {
      this.saveError.set('Enter at least one category (comma-separated).');
      return;
    }

    const gallery = this.galleryRows();
    if (gallery.length === 0) {
      this.saveError.set('At least one gallery image is required.');
      return;
    }

    const nameTrim = raw.name.trim();
    const r = raw.rating;
    const rating =
      r != null && typeof r === 'number' && !Number.isNaN(r) ? r : undefined;

    const payload: ProductUpdatePayload = {
      name: nameTrim,
      description: raw.description.trim(),
      price: raw.price,
      sku: raw.sku.trim(),
      stockQuantity: raw.stockQuantity,
      categories,
      brand: raw.brand.trim() || undefined,
      gallery: gallery.map((g) => ({
        thumbnailUrl: g.thumbnailUrl,
        hdUrl: g.hdUrl || g.thumbnailUrl,
        alt: g.alt,
      })),
      rating,
      inStock: raw.inStock,
      attributes: undefined,
    };

    this.submitting.set(true);
    this.productService
      .updateProduct(this.productId, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/catalog']);
          this.snackBar.open('Product updated.', 'OK', { duration: 4000 });
        },
        error: (err: unknown) => {
          this.saveError.set(httpErrorMessage(err, 'Could not update product.'));
        },
      });
  }
}
