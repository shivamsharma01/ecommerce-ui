import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

/** Set on the one retry after a successful refresh so a second 401 does not loop refresh. */
const AUTH_RETRY_HEADER = 'X-Auth-Retry';

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

function requestUrlPath(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      return new URL(url).pathname;
    } catch {
      /* ignore */
    }
  }
  const noQuery = url.split('?')[0] ?? url;
  return noQuery.startsWith('/') ? noQuery : `/${noQuery}`;
}

function shouldSkip401Refresh(req: HttpRequest<unknown>): boolean {
  if (req.headers.has(AUTH_RETRY_HEADER)) {
    return true;
  }
  const path = requestUrlPath(req.url);
  return (
    path === '/auth/login' ||
    path.endsWith('/auth/login') ||
    path === '/auth/refresh' ||
    path.endsWith('/auth/refresh') ||
    path === '/auth/logout' ||
    path.endsWith('/auth/logout')
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();
  const authReq = accessToken ? addToken(req, accessToken) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !shouldSkip401Refresh(req)
      ) {
        return authService.refresh().pipe(
          switchMap((response) => {
            const retryReq = addToken(req, response.accessToken).clone({
              setHeaders: { [AUTH_RETRY_HEADER]: '1' },
            });
            return next(retryReq);
          }),
          catchError((err) => {
            authService.clearAccessToken();
            return throwError(() => err);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
