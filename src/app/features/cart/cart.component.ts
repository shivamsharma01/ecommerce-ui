import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CartService, type CartResponse } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { httpErrorMessage } from '../../core/http/http-error-message';
import type { Product } from '../../shared/models/product.model';

type CartRow = {
  productId: string;
  quantity: number;
  product?: Product | null;
};

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent {
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly rows = signal<CartRow[]>([]);
  protected readonly checkingOut = signal(false);

  constructor() {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.cartService
      .getCart()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (cart) => this.hydrate(cart),
        error: (err: unknown) => this.error.set(httpErrorMessage(err, 'Could not load cart.')),
      });
  }

  private hydrate(cart: CartResponse): void {
    const base = (cart.items ?? []).map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      product: null as Product | null,
    }));
    this.rows.set(base);

    // Fire and forget product hydration (best-effort; still show productId if it fails).
    for (const row of base) {
      this.productService
        .getById(row.productId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (p) => {
            this.rows.update((rows) =>
              rows.map((r) => (r.productId === row.productId ? { ...r, product: p } : r)),
            );
          },
          error: () => void 0,
        });
    }
  }

  protected remove(productId: string): void {
    this.cartService
      .removeItem(productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.refresh(),
        error: (err: unknown) =>
          this.snackBar.open(httpErrorMessage(err, 'Could not remove item.'), 'Dismiss', {
            duration: 6000,
          }),
      });
  }

  protected changeQty(row: CartRow, delta: number): void {
    const nextQty = Math.max(1, row.quantity + delta);
    this.cartService
      .upsertItem(row.productId, nextQty)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cart) => this.hydrate(cart),
        error: (err: unknown) =>
          this.snackBar.open(httpErrorMessage(err, 'Could not update quantity.'), 'Dismiss', {
            duration: 6000,
          }),
      });
  }

  protected subtotal(): number {
    return this.rows().reduce((sum, r) => sum + (r.product?.price ?? 0) * r.quantity, 0);
  }

  protected checkout(): void {
    if (this.checkingOut()) return;
    this.checkingOut.set(true);
    this.orderService
      .checkout()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.checkingOut.set(false)),
      )
      .subscribe({
        next: (r) => {
          this.snackBar.open(`Order placed (${r.status}).`, 'OK', { duration: 5000 });
          this.refresh();
        },
        error: (err: unknown) => {
          this.error.set(httpErrorMessage(err, 'Checkout failed.'));
        },
      });
  }
}

