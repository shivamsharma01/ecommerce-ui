import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, catchError, finalize, of, switchMap } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import type { Product } from '../../shared/models/product.model';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    ProductCardComponent,
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchComponent {
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  protected searchQuery = '';
  protected readonly results = signal<Product[]>([]);
  protected readonly hasSearched = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.search$
      .pipe(
        switchMap((q) => {
          this.loading.set(true);
          this.error.set(null);
          return this.productService.search(q).pipe(
            finalize(() => this.loading.set(false)),
            catchError(() => {
              this.error.set('Search failed. Please try again.');
              return of([] as Product[]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.results.set(items));
  }

  onSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) {
      this.hasSearched.set(false);
      this.results.set([]);
      this.error.set(null);
      return;
    }
    this.hasSearched.set(true);
    this.search$.next(q);
  }
}
