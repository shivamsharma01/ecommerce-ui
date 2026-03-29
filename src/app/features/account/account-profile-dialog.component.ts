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
  template: `
    <h2 mat-dialog-title>Your profile</h2>
    <mat-dialog-content class="dialog-body">
      @if (loading) {
        <div class="centered">
          <mat-spinner diameter="36" />
        </div>
      } @else if (errorMessage) {
        <p class="error">{{ errorMessage }}</p>
      } @else if (profile) {
        <dl class="profile-dl">
          <dt>Name</dt>
          <dd>{{ profile.firstName }} {{ profile.lastName }}</dd>
          <dt>Email</dt>
          <dd>{{ profile.email }}</dd>
          <dt>User ID</dt>
          <dd class="mono">{{ profile.userId }}</dd>
        </dl>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Close</button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-body {
      min-width: min(100%, 320px);
      min-height: 120px;
    }
    .centered {
      display: flex;
      justify-content: center;
      padding: 1rem;
    }
    .error {
      color: var(--mat-error-default);
      margin: 0;
    }
    .profile-dl {
      margin: 0;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.35rem 1rem;
    }
    .profile-dl dt {
      font-weight: 600;
      margin: 0;
    }
    .profile-dl dd {
      margin: 0;
    }
    .mono {
      font-family: ui-monospace, monospace;
      font-size: 0.8rem;
      word-break: break-all;
    }
  `,
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
