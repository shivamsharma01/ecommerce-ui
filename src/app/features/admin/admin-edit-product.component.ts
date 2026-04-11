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

const MAX_EXTRA_GALLERY = 10;

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
  protected readonly appendingGallery = signal(false);
  protected readonly appendError = signal<string | null>(null);
  protected readonly deleting = signal(false);

  /** Gallery rows for PUT (existing URLs; can remove images, not upload new ones here). */
  protected readonly galleryRows = signal<ProductGalleryImage[]>([]);
  /** New files to upload and append via POST /api/products/{id}/gallery. */
  protected readonly extraGalleryFiles = signal<File[]>([]);

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

  onExtraGallerySelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    if (picked.length > MAX_EXTRA_GALLERY) {
      this.snackBar.open(`Using first ${MAX_EXTRA_GALLERY} images (max per upload).`, 'OK', { duration: 4000 });
      this.extraGalleryFiles.set(picked.slice(0, MAX_EXTRA_GALLERY));
    } else {
      this.extraGalleryFiles.set(picked);
    }
    input.value = '';
  }

  removeExtraGalleryFile(index: number): void {
    this.extraGalleryFiles.update((files) => files.filter((_, i) => i !== index));
  }

  private partNameForIndex(file: File, index: number): string {
    return `gallery-${index}-${file.name}`;
  }

  appendNewGalleryImages(): void {
    const id = this.productId;
    const files = this.extraGalleryFiles();
    if (!id || files.length === 0 || this.appendingGallery()) return;
    this.appendError.set(null);

    const nameTrim = this.form.controls.name.value.trim() || 'Product';
    const gallery = files.map((file, i) => {
      const part = this.partNameForIndex(file, i);
      return {
        thumbFile: part,
        hdFile: part,
        alt: `${nameTrim} — ${this.galleryRows().length + i + 1}`,
      };
    });

    const formData = new FormData();
    formData.append('gallery', new Blob([JSON.stringify({ gallery })], { type: 'application/json' }));
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      formData.append('files', file, this.partNameForIndex(file, i));
    }

    this.appendingGallery.set(true);
    this.productService
      .appendProductGallery(id, formData)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.appendingGallery.set(false)),
      )
      .subscribe({
        next: (p: Product) => {
          this.extraGalleryFiles.set([]);
          this.galleryRows.set([...(p.gallery ?? [])]);
          this.snackBar.open('Images uploaded and added to the product.', 'OK', { duration: 4000 });
        },
        error: (err: unknown) => {
          this.appendError.set(httpErrorMessage(err, 'Could not upload images.'));
        },
      });
  }

  deleteThisProduct(): void {
    const id = this.productId;
    if (!id || this.deleting()) return;
    if (
      !confirm(
        `Delete product ${id} from the catalog? This cannot be undone. Inventory drops the stock row when the product delete event is consumed from Pub/Sub.`,
      )
    ) {
      return;
    }
    this.deleting.set(true);
    this.productService
      .deleteProduct(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/catalog']);
          this.snackBar.open('Product deleted.', 'OK', { duration: 4000 });
        },
        error: (err: unknown) => {
          this.snackBar.open(httpErrorMessage(err, 'Could not delete product.'), 'Dismiss', { duration: 6000 });
        },
      });
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
