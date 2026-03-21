import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { finalize } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import type { Product } from '../../shared/models/product.model';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [MatCardModule, MatProgressSpinnerModule, ProductCardComponent],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent {
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.productService
      .getCatalog()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => {
          this.products.set(items);
          this.error.set(null);
        },
        error: () =>
          this.error.set('Unable to load the catalog. Please try again later.'),
      });
  }
}
