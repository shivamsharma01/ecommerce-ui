import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, finalize, of, startWith, switchMap } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService, type InventoryItemRow } from '../../core/services/inventory.service';
import { ProductService } from '../../core/services/product.service';
import { httpErrorMessage } from '../../core/http/http-error-message';

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule,
  ],
  templateUrl: './admin-inventory.component.html',
  styleUrls: ['./admin-add-product.component.css', './admin-inventory.component.css'],
})
export class AdminInventoryComponent {
  private readonly inventoryService = inject(InventoryService);
  private readonly productService = inject(ProductService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly listRefresh = new Subject<void>();

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly rows = signal<InventoryItemRow[]>([]);
  protected readonly syncing = signal(false);
  protected deleteId = '';
  protected readonly deleting = signal(false);

  constructor() {
    this.listRefresh
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.loading.set(true);
          this.loadError.set(null);
          return this.inventoryService.listAdminItems().pipe(
            catchError((err: unknown) => {
              this.loadError.set(httpErrorMessage(err, 'Could not load inventory.'));
              return of([] as InventoryItemRow[]);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.rows.set(items));
  }

  refreshList(): void {
    this.listRefresh.next();
  }

  syncFromCatalog(): void {
    if (this.syncing()) return;
    this.syncing.set(true);
    this.inventoryService
      .syncFromCatalog()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.syncing.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.snackBar.open(`Inventory synced: ${res.productsSynced} product row(s) upserted.`, 'OK', {
            duration: 5000,
          });
          this.refreshList();
        },
        error: (err: unknown) => {
          this.snackBar.open(httpErrorMessage(err, 'Could not sync inventory.'), 'Dismiss', {
            duration: 6000,
          });
        },
      });
  }

  deleteProductById(): void {
    const id = this.deleteId.trim();
    if (!id || this.deleting()) return;
    if (
      !confirm(
        `Delete product ${id} from the catalog? This cannot be undone. Inventory rows for this id should be cleaned up separately if needed.`,
      )
    ) {
      return;
    }
    this.deleting.set(true);
    this.productService
      .deleteProduct(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe({
        next: () => {
          this.snackBar.open(`Product ${id} deleted.`, 'OK', { duration: 4000 });
          this.deleteId = '';
          this.refreshList();
        },
        error: (err: unknown) => {
          this.snackBar.open(httpErrorMessage(err, 'Could not delete product.'), 'Dismiss', {
            duration: 6000,
          });
        },
      });
  }
}
