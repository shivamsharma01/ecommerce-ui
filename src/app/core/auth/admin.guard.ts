import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/** Requires a valid access token with {@code product.admin} scope (platform admin). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.isPlatformAdmin()) {
    return true;
  }
  return router.createUrlTree(['/catalog']);
};
