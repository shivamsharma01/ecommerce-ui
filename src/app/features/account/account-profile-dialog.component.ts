import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService, type UserProfile } from '../../core/services/user.service';

@Component({
  selector: 'app-account-profile-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './account-profile-dialog.component.html',
  styleUrl: './account-profile-dialog.component.css'
})
export class AccountProfileDialogComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = true;
  protected errorMessage = '';
  protected profile: UserProfile | null = null;

  ngOnInit(): void {
    this.userService
      .getProfile()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (p) => {
          this.profile = p;
        },
        error: (err) => {
          if (err?.status === 403) {
            this.errorMessage =
              'Your email is not verified yet. Open the link we sent you, then try again.';
          } else if (err?.status === 404) {
            this.errorMessage =
              'Profile is not ready yet (still syncing). Try again in a few seconds.';
          } else {
            this.errorMessage = 'Could not load profile.';
          }
        },
      });
  }
}
