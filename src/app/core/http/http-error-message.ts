import { HttpErrorResponse } from '@angular/common/http';

/** Best-effort message from Angular HttpClient errors (string body, JSON body, or status). */
export function httpErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (typeof body === 'string' && body.trim().length > 0) {
      return body.length > 500 ? body.slice(0, 500) + '…' : body;
    }
    if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as { message?: unknown }).message;
      if (typeof m === 'string' && m.length > 0) return m;
    }
    if (err.message) return err.message;
    if (err.status) return `Request failed (${err.status}).`;
  }
  return fallback;
}
