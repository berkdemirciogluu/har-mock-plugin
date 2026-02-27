import { inject, isDevMode } from '@angular/core';
import { Router, RouteConfigLoadEnd, type Route } from '@angular/router';
import { filter } from 'rxjs';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';

export function clearGuardsRecursively(routes: Route[]): void {
  for (const route of routes) {
    route.canActivate = [];
    route.canDeactivate = [];
    route.canMatch = [];
    if (route.children?.length) {
      clearGuardsRecursively(route.children);
    }
  }
}

export function harMockGuardBypassFactory(): () => void {
  const config = inject(HAR_MOCK_CONFIG);
  const router = inject(Router);

  return () => {
    // Triple-lock: production'da, devre dışıysa veya bypassGuards=false ise hiçbir şey yapma (ARCH10)
    if (!isDevMode() || !config.enabled || !config.bypassGuards) return;

    try {
      // Mevcut route config'leri temizle (eager routes + önceden yüklenmiş lazy routes)
      clearGuardsRecursively(router.config);

      // Lazy-loaded route'lar için: RouteConfigLoadEnd event'inde yeniden temizle (AC3)
      router.events
        .pipe(filter(e => e instanceof RouteConfigLoadEnd))
        .subscribe(() => clearGuardsRecursively(router.config));
    } catch (e) {
      // Hata loglanır ama uygulama başlatılır; guard'lar bypass edilmemiş haliyle devam eder (AC5)
      console.warn('[HarMock] Guard bypass failed:', e);
    }
  };
}
