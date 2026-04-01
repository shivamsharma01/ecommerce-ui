import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  Product,
  ProductPageResponse,
  SearchRequest,
  SearchResponse,
} from '../../shared/models/product.model';

export interface ReindexResponse {
  success: boolean;
  indexedCount: number;
  failedCount: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  getCatalog(page = 0, size = 20): Observable<ProductPageResponse> {
    return this.http.get<ProductPageResponse>('/api/products', {
      params: { page, size },
    });
  }

  getById(productId: string): Observable<Product> {
    return this.http.get<Product>(`/api/products/${productId}`);
  }

  search(request: SearchRequest): Observable<SearchResponse> {
    return this.http.post<SearchResponse>('/api/search', request);
  }

  /** Multipart: JSON part {@code product} + file parts {@code files} (see product service ProductController). */
  createProductWithUpload(formData: FormData): Observable<Product> {
    return this.http.post<Product>('/api/products/upload', formData);
  }

  /** Full OpenSearch reindex; requires JWT scope {@code reindex}. */
  reindexSearchIndex(): Observable<ReindexResponse> {
    return this.http.post<ReindexResponse>('/product-indexer/admin/reindex', {});
  }
}
