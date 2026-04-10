import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService, type OrderSummary } from '../../core/services/order.service';
import { httpErrorMessage } from '../../core/http/http-error-message';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.css',
})
export class OrderDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly order = signal<OrderSummary | null>(null);
  protected readonly paymentSuccessBanner = signal(false);

  constructor() {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    const successParam = this.route.snapshot.queryParamMap.get('success');
    this.paymentSuccessBanner.set(successParam === '1' || successParam === 'true');

    if (!orderId) {
      this.loading.set(false);
      this.error.set('Missing order id.');
      return;
    }

    this.orderService
      .listOrders()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (list) => {
          const found = (list ?? []).find((o) => o.orderId === orderId) ?? null;
          this.order.set(found);
          if (!found) {
            this.error.set('We could not find this order. It may belong to another account.');
          }
        },
        error: (err: unknown) => this.error.set(httpErrorMessage(err, 'Could not load order.')),
      });
  }

  protected dismissSuccessBanner(): void {
    this.paymentSuccessBanner.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { success: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
