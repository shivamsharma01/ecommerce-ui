import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, catchError, finalize, of, switchMap } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import type {
  Product,
  SearchFilters,
  SearchRequest,
} from '../../shared/models/product.model';

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
    MatCheckboxModule,
    MatProgressSpinnerModule,
    ProductCardComponent,
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<void>();

  protected searchQuery = '';
  protected categoryInput = '';
  protected brandInput = '';
  protected minPrice?: number;
  protected maxPrice?: number;
  protected minRating?: number;
  protected inStockOnly = false;
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly results = signal<Product[]>([]);
  protected readonly hasSearched = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.search$
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          this.error.set(null);
          return this.productService.search(this.buildRequest()).pipe(
            finalize(() => this.loading.set(false)),
            catchError(() => {
              this.error.set('Search failed. Please try again.');
              return of({
                results: [] as Product[],
                totalHits: 0,
                page: this.page(),
                size: this.size(),
                totalPages: 0,
              });
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.results.set(response.results);
        this.total.set(response.totalHits);
        this.totalPages.set(response.totalPages);
        this.page.set(response.page);
      });
  }

  ngOnInit(): void {
    // Default results: search with no filters.
    this.onSearch(true);
  }

  onSearch(resetPage = true): void {
    if (resetPage) this.page.set(0);
    this.hasSearched.set(true);
    this.search$.next();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.categoryInput = '';
    this.brandInput = '';
    this.minPrice = undefined;
    this.maxPrice = undefined;
    this.minRating = undefined;
    this.inStockOnly = false;
    this.results.set([]);
    this.total.set(0);
    this.totalPages.set(0);
    this.page.set(0);
    this.error.set(null);
    this.hasSearched.set(false);
  }

  previousPage(): void {
    if (this.page() > 0) {
      this.page.set(this.page() - 1);
      this.onSearch(false);
    }
  }

  nextPage(): void {
    if (this.page() + 1 < this.totalPages()) {
      this.page.set(this.page() + 1);
      this.onSearch(false);
    }
  }

  private buildRequest(): SearchRequest {
    const filters: SearchFilters = {};
    const categories = this.commaSeparated(this.categoryInput);
    const brands = this.commaSeparated(this.brandInput);
    if (categories.length) filters.categories = categories;
    if (brands.length) filters.brands = brands;
    if (this.minPrice != null) filters.minPrice = this.minPrice;
    if (this.maxPrice != null) filters.maxPrice = this.maxPrice;
    if (this.minRating != null) filters.minRating = this.minRating;
    if (this.inStockOnly) filters.inStock = true;

    return {
      searchTerm: this.searchQuery.trim() || '*',
      filters: Object.keys(filters).length ? filters : undefined,
      page: this.page(),
      size: this.size(),
      sortBy: 'relevance',
      sortOrder: 'desc',
    };
  }

  private commaSeparated(value: string): string[] {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
}
