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

export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface CheckoutResponse {
  orderId: string;
  status: string;
  totalAmount: number;
  shippingAddress?: ShippingAddress | null;
  items: OrderItem[];
}

export interface OrderSummary {
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  shippingAddress?: ShippingAddress | null;
  items: OrderItem[];
}

export interface CheckoutRequest {
  addressId?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  checkout(req: CheckoutRequest = {}): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>('/orders/checkout', req ?? {});
  }

  listOrders(): Observable<OrderSummary[]> {
    return this.http.get<OrderSummary[]>('/orders');
  }
}

