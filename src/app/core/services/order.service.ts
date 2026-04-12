import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  productName?: string | null;
  thumbnailUrl?: string | null;
}

export interface CheckoutResponse {
  orderId: string;
  status: string;
  totalAmount: number;
  items: OrderItem[];
}

export interface OrderSummary {
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  checkout(): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>('/orders/checkout', {});
  }

  listOrders(): Observable<OrderSummary[]> {
    return this.http.get<OrderSummary[]>('/orders');
  }
}

