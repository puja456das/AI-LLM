import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  // If token is already expired before making a protected API request, redirect immediately
  if (token && request.url.startsWith('/api/') && !request.url.includes('/auth/login') && auth.isTokenExpired(token)) {
    auth.logout(true);
    return throwError(() => new Error('Your session has expired. Please sign in again.'));
  }

  const authReq = token && request.url.startsWith('/api/')
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Do not auto-logout if user is on the login page submitting wrong password
        const isLoginEndpoint = request.url.includes('/auth/login');
        if (!isLoginEndpoint) {
          auth.logout(true);
        }
      }
      return throwError(() => error);
    })
  );
};
