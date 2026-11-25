import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    const hadToken = !!auth.token();
    if (hadToken) {
      // Clear expired or stale token from session
      auth.logout(true);
      return router.createUrlTree(['/login'], { queryParams: { expired: 'true' } });
    }
    return router.createUrlTree(['/login']);
  }

  return true;
};
