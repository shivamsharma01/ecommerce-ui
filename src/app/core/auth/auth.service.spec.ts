import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('login stores access token', () => {
    service.login('u@x.com', 'secret').subscribe((res) => {
      expect(res.accessToken).toBe('abc');
      expect(res.expiresIn).toBe(3600);
    });

    const req = httpMock.expectOne('/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ identifier: 'u@x.com', password: 'secret' });
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ accessToken: 'abc', expiresIn: 3600 });

    expect(service.getAccessToken()).toBe('abc');
    expect(service.isAuthenticated()).toBeTrue();
    expect(sessionStorage.getItem('mcart.accessToken')).toBe('abc');
  });

  it('refresh updates access token', () => {
    service.setAccessToken('old');
    service.refresh().subscribe();

    const req = httpMock.expectOne('/auth/refresh');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ accessToken: 'new', expiresIn: 60 });

    expect(service.getAccessToken()).toBe('new');
  });

  it('logout clears token after successful response', () => {
    service.setAccessToken('x');
    service.logout().subscribe();
    const req = httpMock.expectOne('/auth/logout');
    req.flush({});
    expect(service.getAccessToken()).toBeNull();
  });

  it('logout clears token when request fails', () => {
    service.setAccessToken('x');
    service.logout().subscribe();
    const req = httpMock.expectOne('/auth/logout');
    req.flush('fail', { status: 500, statusText: 'Server Error' });
    expect(service.getAccessToken()).toBeNull();
  });

  it('clearAccessToken removes token', () => {
    service.setAccessToken('t');
    service.clearAccessToken();
    expect(service.isAuthenticated()).toBeFalse();
    expect(sessionStorage.getItem('mcart.accessToken')).toBeNull();
  });

  it('rehydrates token from sessionStorage for a new service instance', () => {
    sessionStorage.setItem('mcart.accessToken', 'persisted');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const rehydrated = TestBed.inject(AuthService);
    expect(rehydrated.getAccessToken()).toBe('persisted');
    expect(rehydrated.isAuthenticated()).toBeTrue();
  });

  it('signup posts PasswordSignupRequest shape to /auth/signup', () => {
    const body = {
      email: 'n@x.com',
      password: 'password1',
      firstName: 'Ada',
      lastName: 'Lovelace',
    };
    service.signup(body).subscribe((res) => {
      expect(res.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(res.message).toBe('Verification email sent');
    });

    const req = httpMock.expectOne('/auth/signup');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      message: 'Verification email sent',
    });
  });
});
