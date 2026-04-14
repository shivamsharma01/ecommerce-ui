import {
  CurrencyPipe,
  DecimalPipe,
  KeyValuePipe,
  Location,
} from '@angular/common';
import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
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
import { CartService } from '../../core/services/cart.service';
import { httpErrorMessage } from '../../core/http/http-error-message';
import { SiteOriginService } from '../../core/seo/site-origin.service';
import { toAbsoluteUrl, truncatePlainText } from '../../core/seo/resolve-absolute-url';
import type { Product, ProductGalleryImage } from '../../shared/models/product.model';

const DEFAULT_DOCUMENT_TITLE = 'McartUi';

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
  private readonly cartService = inject(CartService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);
  private readonly snackBar = inject(MatSnackBar);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly siteOrigin = inject(SiteOriginService);

  protected readonly product = signal<Product | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly activeIndex = signal(0);
  protected readonly zoomOpen = signal(false);
  protected readonly cartQty = signal(0);
  protected readonly wishlistActive = signal(false);

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
    this.destroyRef.onDestroy(() => this.clearShareMeta());

    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          if (!id) {
            this.error.set('Product id is missing.');
            this.loading.set(false);
            this.clearShareMeta();
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
          if (!product) {
            this.clearShareMeta();
            return;
          }
          this.product.set(product);
          this.cartQty.set(0);
          this.wishlistActive.set(false);
          this.preloadNeighbors();
          this.applyShareMeta(product);
          this.syncCartQty(product.id);
        },
        error: () => {
          this.product.set(null);
          this.error.set('Unable to load product details. Please try again.');
          this.clearShareMeta();
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
    if (!this.auth.isAuthenticated()) {
      this.snackBar.open('Sign in to add items to your cart.', 'OK', { duration: 4000 });
      return;
    }
    this.cartService
      .upsertItem(p.id, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cartQty.set(1);
          this.snackBar.open(`Added “${p.name}” to cart.`, 'OK', {
            duration: 3500,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        },
        error: (err: unknown) =>
          this.snackBar.open(httpErrorMessage(err, 'Could not add to cart.'), 'Dismiss', {
            duration: 6000,
          }),
      });
  }

  protected incrementCart(): void {
    const p = this.product();
    if (!p) return;
    if (!this.auth.isAuthenticated()) {
      this.snackBar.open('Sign in to add items to your cart.', 'OK', { duration: 4000 });
      return;
    }
    const nextQty = this.cartQty() + 1;
    this.cartService
      .upsertItem(p.id, nextQty)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.cartQty.set(nextQty),
        error: (err: unknown) =>
          this.snackBar.open(httpErrorMessage(err, 'Could not update cart.'), 'Dismiss', {
            duration: 6000,
          }),
      });
  }

  protected decrementCart(): void {
    const p = this.product();
    if (!p) return;
    if (!this.auth.isAuthenticated()) {
      this.snackBar.open('Sign in to manage your cart.', 'OK', { duration: 4000 });
      return;
    }
    const current = this.cartQty();
    if (current <= 1) {
      this.cartService
        .removeItem(p.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.cartQty.set(0),
          error: (err: unknown) =>
            this.snackBar.open(httpErrorMessage(err, 'Could not update cart.'), 'Dismiss', {
              duration: 6000,
            }),
        });
      return;
    }
    const nextQty = current - 1;
    this.cartService
      .upsertItem(p.id, nextQty)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.cartQty.set(nextQty),
        error: (err: unknown) =>
          this.snackBar.open(httpErrorMessage(err, 'Could not update cart.'), 'Dismiss', {
            duration: 6000,
          }),
      });
  }

  protected wishlist(): void {
    const p = this.product();
    if (!p) return;
    this.wishlistActive.set(true);
    this.snackBar.open(`“${p.name}” saved to wishlist`, 'Dismiss', {
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

  private syncCartQty(productId: string): void {
    if (!this.auth.isAuthenticated()) return;
    this.cartService
      .getCart()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cart) => {
          const item = (cart.items ?? []).find((i) => i.productId === productId);
          this.cartQty.set(item?.quantity ?? 0);
        },
        error: () => void 0,
      });
  }

  private applyShareMeta(product: Product): void {
    const origin = this.siteOrigin.getOrigin();
    const pagePath = `/products/${product.id}`;
    const pageUrl = origin ? `${origin}${pagePath}` : pagePath;
    const first = product.gallery?.[0];
    const imageUrl = toAbsoluteUrl(first?.hdUrl ?? first?.thumbnailUrl, origin);

    const title = `${product.name} | ${DEFAULT_DOCUMENT_TITLE}`;
    const description = truncatePlainText(product.description, 200);

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });

    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: product.name });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: pageUrl });
    if (imageUrl) {
      this.meta.updateTag({ property: 'og:image', content: imageUrl });
    } else {
      this.meta.removeTag("property='og:image'");
    }

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: product.name });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    if (imageUrl) {
      this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
    } else {
      this.meta.removeTag("name='twitter:image'");
    }
  }

  private clearShareMeta(): void {
    this.title.setTitle(DEFAULT_DOCUMENT_TITLE);
    this.meta.removeTag("name='description'");

    this.meta.removeTag("property='og:type'");
    this.meta.removeTag("property='og:title'");
    this.meta.removeTag("property='og:description'");
    this.meta.removeTag("property='og:url'");
    this.meta.removeTag("property='og:image'");

    this.meta.removeTag("name='twitter:card'");
    this.meta.removeTag("name='twitter:title'");
    this.meta.removeTag("name='twitter:description'");
    this.meta.removeTag("name='twitter:image'");
  }
}
