import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, of, tap } from 'rxjs';

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private accessToken: string | null = null;

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        '/auth/login',
        { email, password },
        { withCredentials: true }
      )
      .pipe(tap((res) => this.setAccessToken(res.accessToken)));
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
          this.accessToken = null;
        }),
      );
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  clearAccessToken(): void {
    this.accessToken = null;
  }

  isAuthenticated(): boolean {
    return this.accessToken != null && this.accessToken.length > 0;
  }
}
