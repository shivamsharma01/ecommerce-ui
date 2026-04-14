import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface UserAddress {
  addressId: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

export interface CreateUserAddressRequest {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  makeDefault?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>('/user/me');
  }

  listAddresses(): Observable<UserAddress[]> {
    return this.http.get<UserAddress[]>('/user/addresses');
  }

  getDefaultAddress(): Observable<UserAddress> {
    return this.http.get<UserAddress>('/user/addresses/default');
  }

  createAddress(req: CreateUserAddressRequest): Observable<UserAddress> {
    return this.http.post<UserAddress>('/user/addresses', req);
  }

  setDefaultAddress(addressId: string): Observable<UserAddress> {
    return this.http.post<UserAddress>(`/user/addresses/${addressId}/default`, {});
  }
}
