import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventorySyncResponse {
  productsSynced: number;
}

export interface InventoryItemRow {
  productId: string;
  availableQty: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);

  listAdminItems(): Observable<InventoryItemRow[]> {
    return this.http.get<InventoryItemRow[]>('/inventory/admin/items');
  }

  syncFromCatalog(): Observable<InventorySyncResponse> {
    return this.http.post<InventorySyncResponse>('/inventory/admin/sync-from-catalog', {});
  }
}
