import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, REQUEST } from '@angular/core';

/**
 * Public site origin (e.g. https://shop.example.com) for canonical URLs and og:image.
 * Uses the incoming request on the server; `window.location` in the browser.
 */
@Injectable({ providedIn: 'root' })
export class SiteOriginService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });

  /** Origin without trailing slash, or empty if it cannot be determined. */
  getOrigin(): string {
    if (isPlatformBrowser(this.platformId)) {
      return typeof globalThis !== 'undefined' && 'location' in globalThis
        ? (globalThis as unknown as Window).location.origin
        : '';
    }
    const url = this.request?.url;
    if (!url) return '';
    try {
      return new URL(url).origin;
    } catch {
      return '';
    }
  }
}
