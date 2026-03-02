import { Injectable, inject, isDevMode } from '@angular/core';
import {
  HttpBackend,
  HttpClient,
  HttpInterceptorFn,
  HttpResponse,
  HttpHeaders,
} from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { parseHar, parameterize, resolve, HarParseError } from '@har-mock/core';
import type { HarEntry, UrlPattern } from '@har-mock/core';
import { HAR_MOCK_CONFIG } from '../types';

// ─── HarLoaderService ──────────────────────────────────────────

/**
 * HAR dosyasını Angular asset'inden lazy load eder.
 *
 * HttpBackend ile naked HttpClient kullanır — interceptor zincirini bypass eder
 * ve circular interception sorununu önler (NFR13).
 */
@Injectable()
export class HarLoaderService {
  private readonly config = inject(HAR_MOCK_CONFIG);
  // HttpBackend doğrudan inject et — tüm interceptor'ları bypass eder
  private readonly http = new HttpClient(inject(HttpBackend));

  private entries: HarEntry[] | null = null;
  private urlPatterns: UrlPattern[] | null = null;
  private loadPromise: Promise<void> | null = null;

  /**
   * Idempotent: İlk çağrıda fetch başlar; sonraki çağrılar aynı Promise'i döndürür.
   */
  load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.fetchAndParse();
    return this.loadPromise;
  }

  getEntries(): HarEntry[] | null {
    return this.entries;
  }

  getUrlPatterns(): UrlPattern[] | null {
    return this.urlPatterns;
  }

  private async fetchAndParse(): Promise<void> {
    try {
      const raw = await firstValueFrom(this.http.get(this.config.harUrl, { responseType: 'text' }));
      const harFile = parseHar(raw);
      this.entries = [...harFile.entries];
      this.urlPatterns = parameterize(harFile.entries);
    } catch {
      console.warn(
        new HarParseError(
          `HAR yüklenemedi: ${this.config.harUrl}`,
          'assets klasöründe har-mock.har dosyasının mevcut olduğunu doğrulayın.',
        ),
      );
      this.entries = [];
      this.urlPatterns = [];
    }
  }
}

// ─── harMockInterceptor ────────────────────────────────────────

/**
 * Angular HttpClient isteklerini yakalar; HAR veya Rule eşleşmesi varsa mock döndürür.
 *
 * Öncelik: Rules > HAR > Passthrough (priority-chain ile — FR32)
 * Double-lock: isDevMode() === false veya enabled === false → passthrough (NFR13)
 */
export const harMockInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(HAR_MOCK_CONFIG);
  const loader = inject(HarLoaderService);

  // Double-lock: production'da veya devre dışıysa her zaman passthrough
  if (!isDevMode() || !config.enabled) {
    return next(req);
  }

  // Domain filter: boş array = tüm domain'ler geçer; dolu = sadece listelenen domain'ler mocklanır
  if (config.domainFilter.length > 0) {
    try {
      const hostname = new URL(req.url, 'http://localhost').host;
      const matchesDomain = config.domainFilter.some(
        (d) => hostname === d || hostname.endsWith('.' + d),
      );
      if (!matchesDomain) {
        return next(req);
      }
    } catch {
      // URL parse edilemezse domain filter'ı atla
    }
  }

  const entries = loader.getEntries();
  const urlPatterns = loader.getUrlPatterns();

  // HAR henüz yüklenmedi — passthrough (APP_INITIALIZER sayesinde nadir durum)
  if (entries === null || urlPatterns === null) {
    return next(req);
  }

  const result = resolve({ url: req.url, method: req.method }, config.rules, entries, urlPatterns);

  // null → passthrough
  if (result === null) {
    return next(req);
  }

  return of(
    new HttpResponse({
      status: result.response.statusCode,
      body: (() => {
        if (!result.response.body) return null;
        try {
          return JSON.parse(result.response.body) as unknown;
        } catch {
          return null;
        }
      })(),
      headers: new HttpHeaders(
        Object.fromEntries(result.response.headers.map((h) => [h.name, h.value])),
      ),
    }),
  );
};
