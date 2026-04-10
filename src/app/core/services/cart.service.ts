import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CartResponse {
  userId: string;
  items: CartItem[];
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);

  getCart(): Observable<CartResponse> {
    return this.http.get<CartResponse>('/cart');
  }

  upsertItem(productId: string, quantity: number): Observable<CartResponse> {
    return this.http.post<CartResponse>('/cart/items', { productId, quantity });
  }

  removeItem(productId: string): Observable<void> {
    return this.http.delete<void>(`/cart/items/${encodeURIComponent(productId)}`);
  }

  clear(): Observable<void> {
    return this.http.post<void>('/cart/clear', {});
  }
}

