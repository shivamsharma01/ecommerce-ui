import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventorySyncResponse {
  productsSynced: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);

  syncFromCatalog(): Observable<InventorySyncResponse> {
    return this.http.post<InventorySyncResponse>('/inventory/admin/sync-from-catalog', {});
  }
}
