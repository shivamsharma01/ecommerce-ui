import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth';
import { ProductService } from '../../core/services/product.service';
import { AccountProfileDialogComponent } from '../../features/account/account-profile-dialog.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly productService = inject(ProductService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  openAccountProfile(): void {
    this.dialog.open(AccountProfileDialogComponent, {
      width: 'min(100vw - 48px, 420px)',
      autoFocus: 'dialog',
    });
  }

  logout(): void {
    this.auth
      .logout()
      .pipe(finalize(() => this.router.navigate(['/login'])))
      .subscribe();
  }

  triggerReindex(): void {
    if (
      !confirm(
        'Reindex all products into OpenSearch? This can take a while and replaces the search index.',
      )
    ) {
      return;
    }
    this.productService
      .reindexSearchIndex()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.snackBar.open(
            `Reindex finished: indexed ${r.indexedCount}, failed ${r.failedCount}. success=${r.success}`,
            'OK',
            { duration: 8000 },
          );
        },
        error: () => {
          this.snackBar.open('Reindex failed. Check network or admin token scopes.', 'Dismiss', {
            duration: 8000,
          });
        },
      });
  }
}
