import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, finalize, mergeMap, of, tap, throwError } from 'rxjs';
import { jwtScopes, parseJwtPayload } from './jwt.util';

/** Persists JWT across full page reloads in the same tab; cleared when the tab is closed. */
const ACCESS_TOKEN_STORAGE_KEY = 'mcart.accessToken';

function browserSessionStorage(): Storage | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const s = (globalThis as unknown as { sessionStorage?: Storage }).sessionStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

function readStoredAccessToken(): string | null {
  const s = browserSessionStorage();
  if (!s) return null;
  try {
    const v = s.getItem(ACCESS_TOKEN_STORAGE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

function writeStoredAccessToken(token: string): void {
  const s = browserSessionStorage();
  if (!s) return;
  try {
    s.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } catch {
    /* quota / private mode */
  }
}

function removeStoredAccessToken(): void {
  const s = browserSessionStorage();
  if (!s) return;
  try {
    s.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
}

/** Mirrors auth service {@code PasswordSignupRequest} — these fields seed auth_identity / auth_user and the user_profile row (via signup event). */
export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignupResponse {
  userId: string;
  message: string;
}

export interface ResendVerificationRequest {
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private accessToken: string | null = readStoredAccessToken();

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        '/auth/login',
        { identifier: email.trim(), password },
        { withCredentials: true },
      )
      .pipe(tap((res) => this.setAccessToken(res.accessToken)));
  }

  signup(body: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>('/auth/signup', body);
  }

  resendVerification(email: string): Observable<string> {
    const body: ResendVerificationRequest = { email: email.trim() };
    return this.http
      .post('/auth/resend-verification', body, {
        responseType: 'text',
      })
      .pipe(
        mergeMap((raw) => {
          const t = raw.trim();
          if (t.startsWith('<!DOCTYPE') || t.toLowerCase().startsWith('<html')) {
            return throwError(
              () =>
                new HttpErrorResponse({
                  status: 502,
                  statusText: 'Bad Gateway',
                  error:
                    'Received the app HTML page instead of the auth API. If you run the SSR Node server locally, start it with MCART_LOCAL_API_PROXY=1 (see src/server.ts) and run auth on port 8081; or use ng serve so proxy.conf.json forwards /auth.',
                }),
            );
          }
          return of(raw);
        }),
      );
  }

  refresh(): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('/auth/refresh', {}, { withCredentials: true })
      .pipe(tap((res) => this.setAccessToken(res.accessToken)));
  }

  /**
   * Ends the server session (best-effort) and clears the in-memory access token.
   * Subscribe to run the request; token is cleared in `finalize` whether the call succeeds or not.
   */
  logout(): Observable<void> {
    return this.http
      .post<void>('/auth/logout', {}, { withCredentials: true })
      .pipe(
        catchError(() => of(undefined)),
        finalize(() => {
          this.clearAccessToken();
        }),
      );
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    writeStoredAccessToken(token);
  }

  clearAccessToken(): void {
    this.accessToken = null;
    removeStoredAccessToken();
  }

  isAuthenticated(): boolean {
    return this.accessToken != null && this.accessToken.length > 0;
  }

  /**
   * Platform admins receive {@code product.admin} and {@code reindex} in the JWT scope claim
   * (see auth service JwtTokenProvider).
   */
  isPlatformAdmin(): boolean {
    const token = this.accessToken;
    if (!token) return false;
    return jwtScopes(parseJwtPayload(token)).includes('product.admin');
  }
}
