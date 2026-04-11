import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Cart and orders are for shoppers only. Platform admins are sent to the inventory admin screen.
 */
export const consumerOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isPlatformAdmin()) {
    return router.createUrlTree(['/admin/inventory']);
  }
  return true;
};
