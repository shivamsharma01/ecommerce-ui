import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Paths the UI proxies to backend services (see proxy.conf.json). Used to attach friendly errors when
 * the dev server returns 404/HTML or the proxy reports connection failures.
 */
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

function isProxiedBackendRequest(url: string): boolean {
  const path = requestUrlPath(url);
  return (
    path.startsWith('/api') ||
    path.startsWith('/auth') ||
    path.startsWith('/user') ||
    path.startsWith('/orders') ||
    path.startsWith('/cart') ||
    path.startsWith('/inventory') ||
    path.startsWith('/product-indexer')
  );
}

function friendlyUnavailableMessage(url: string): string {
  const path = requestUrlPath(url);
  if (path.startsWith('/orders')) {
    return 'The order service is not running or not reachable. Start it (default port 8089) and restart ng serve if you changed proxy settings.';
  }
  if (path.startsWith('/cart')) {
    return 'The cart service is not running or not reachable (default port 8087).';
  }
  if (path.startsWith('/inventory')) {
    return 'The inventory service is not running or not reachable (default port 8086).';
  }
  if (path.startsWith('/product-indexer')) {
    return 'The product-indexer service is not running or not reachable (default port 8085).';
  }
  if (path.startsWith('/user')) {
    return 'The user service is not running or not reachable (default port 8082).';
  }
  if (path.startsWith('/auth')) {
    return 'The auth service is not running or not reachable (default port 8081).';
  }
  if (path.startsWith('/api/search')) {
    return 'The search service is not running or not reachable (default port 8083).';
  }
  if (path.startsWith('/api')) {
    return 'The product/catalog service is not running or not reachable (default port 8084).';
  }
  return 'A backend service is not running or not reachable. Check the terminal where microservices are started.';
}

function isBackendUnavailable(error: HttpErrorResponse): boolean {
  const status = error.status;
  if (status === 0) {
    return true;
  }
  if (status === 502 || status === 503 || status === 504) {
    return true;
  }
  if (status === 404) {
    const body = error.error;
    if (typeof body === 'string' && /^\s*</.test(body)) {
      return true;
    }
  }
  return false;
}

/**
 * Maps proxy/network failures to a short user-facing string on {@link HttpErrorResponse#error} so
 * components using {@link httpErrorMessage} show something clearer than raw HTML or empty errors.
 */
export const backendUnavailableInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || !isProxiedBackendRequest(req.url)) {
        return throwError(() => error);
      }
      if (!isBackendUnavailable(error)) {
        return throwError(() => error);
      }
      const message = friendlyUnavailableMessage(req.url);
      return throwError(
        () =>
          new HttpErrorResponse({
            url: error.url ?? undefined,
            headers: error.headers,
            status: error.status,
            statusText: error.statusText,
            error: message,
          }),
      );
    }),
  );
};
