import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authGuard, publicGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: auth },
        provideRouter([]),
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'createUrlTree').and.callThrough();
  });

  describe('publicGuard', () => {
    it('allows unauthenticated users', () => {
      auth.isAuthenticated.and.returnValue(false);
      const result = TestBed.runInInjectionContext(() =>
        publicGuard({} as never, {} as never),
      );
      expect(result).toBe(true);
    });

    it('redirects authenticated users to catalog', () => {
      auth.isAuthenticated.and.returnValue(true);
      const result = TestBed.runInInjectionContext(() =>
        publicGuard({} as never, {} as never),
      );
      expect(router.createUrlTree).toHaveBeenCalledWith(['/catalog']);
      expect(result).not.toBe(true);
    });
  });

  describe('authGuard', () => {
    it('allows authenticated users', () => {
      auth.isAuthenticated.and.returnValue(true);
      const result = TestBed.runInInjectionContext(() =>
        authGuard({} as never, {} as never),
      );
      expect(result).toBe(true);
    });

    it('redirects guests to login', () => {
      auth.isAuthenticated.and.returnValue(false);
      const result = TestBed.runInInjectionContext(() =>
        authGuard({} as never, {} as never),
      );
      expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
      expect(result).not.toBe(true);
    });
  });
});
