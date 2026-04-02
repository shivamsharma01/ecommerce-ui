import {
  CurrencyPipe,
  DecimalPipe,
  KeyValuePipe,
  Location,
} from '@angular/common';
import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/auth';
import type { Product, ProductGalleryImage } from '../../shared/models/product.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    KeyValuePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
})
export class ProductDetailComponent {
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly product = signal<Product | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly activeIndex = signal(0);
  protected readonly zoomOpen = signal(false);

  protected readonly gallery = computed<ProductGalleryImage[]>(() => {
    const product = this.product();
    if (!product) return [];
    return product.gallery ?? [];
  });

  protected readonly activeImage = computed<ProductGalleryImage | null>(() => {
    const images = this.gallery();
    if (!images.length) return null;
    const idx = Math.min(Math.max(this.activeIndex(), 0), images.length - 1);
    return images[idx];
  });

  protected readonly fullStars = computed(() => {
    const r = this.product()?.rating;
    if (r == null) return 0;
    return Math.min(5, Math.round(r));
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          if (!id) {
            this.error.set('Product id is missing.');
            this.loading.set(false);
            return of(null);
          }
          this.loading.set(true);
          this.error.set(null);
          this.activeIndex.set(0);
          this.product.set(null);
          return this.productService.getById(id).pipe(
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (product) => {
          if (!product) return;
          this.product.set(product);
          this.preloadNeighbors();
        },
        error: () => {
          this.product.set(null);
          this.error.set('Unable to load product details. Please try again.');
        },
      });
  }

  protected goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    }
  }

  protected addToCart(): void {
    const p = this.product();
    if (!p) return;
    this.snackBar.open(`“${p.name}” added to cart (demo)`, 'Dismiss', {
      duration: 3500,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  protected wishlist(): void {
    const p = this.product();
    if (!p) return;
    this.snackBar.open(`“${p.name}” saved to wishlist (demo)`, 'Dismiss', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  protected selectImage(index: number): void {
    this.activeIndex.set(index);
    this.preloadNeighbors();
  }

  protected previousImage(): void {
    const total = this.gallery().length;
    if (!total) return;
    this.activeIndex.set((this.activeIndex() - 1 + total) % total);
    this.preloadNeighbors();
  }

  protected nextImage(): void {
    const total = this.gallery().length;
    if (!total) return;
    this.activeIndex.set((this.activeIndex() + 1) % total);
    this.preloadNeighbors();
  }

  protected openZoom(): void {
    if (!this.activeImage()) return;
    this.zoomOpen.set(true);
  }

  protected closeZoom(): void {
    this.zoomOpen.set(false);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    if (!this.zoomOpen()) return;
    if (event.key === 'Escape') this.closeZoom();
    if (event.key === 'ArrowLeft') this.previousImage();
    if (event.key === 'ArrowRight') this.nextImage();
  }

  private preloadNeighbors(): void {
    const images = this.gallery();
    if (!images.length) return;
    const total = images.length;
    const current = this.activeIndex();
    const next = images[(current + 1) % total]?.hdUrl;
    const prev = images[(current - 1 + total) % total]?.hdUrl;
    for (const src of [next, prev]) {
      if (!src) continue;
      const img = new Image();
      img.src = src;
    }
  }
}
