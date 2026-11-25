import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const user = auth.user();
  if (user && user.is_admin) {
    return true;
  }

  // Not an administrator -> redirect to dashboard
  return router.createUrlTree(['/dashboard']);
};
