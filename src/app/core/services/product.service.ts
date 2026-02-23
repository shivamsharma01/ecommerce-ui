import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Product } from '../../shared/models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  getCatalog(): Observable<Product[]> {
    return this.http.get<Product[]>('/api/products');
  }

  search(query: string): Observable<Product[]> {
    return this.http.get<Product[]>('/api/products/search', {
      params: { q: query },
    });
  }
}
