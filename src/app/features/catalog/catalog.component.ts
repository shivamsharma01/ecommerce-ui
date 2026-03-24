import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { finalize } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import type { Product } from '../../shared/models/product.model';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    ProductCardComponent,
  ],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent {
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);

  constructor() {
    this.loadPage(0);
  }

  protected previousPage(): void {
    if (this.page() > 0) {
      this.loadPage(this.page() - 1);
    }
  }

  protected nextPage(): void {
    if (this.page() + 1 < this.totalPages()) {
      this.loadPage(this.page() + 1);
    }
  }

  private loadPage(page: number): void {
    this.loading.set(true);
    this.productService
      .getCatalog(page, this.size())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.products.set(response.items);
          this.page.set(response.page);
          this.size.set(response.size);
          this.total.set(response.total);
          this.totalPages.set(response.totalPages);
          this.error.set(null);
        },
        error: () =>
          this.error.set('Unable to load the catalog. Please try again later.'),
      });
  }
}
