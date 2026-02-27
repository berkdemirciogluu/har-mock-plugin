import { inject, isDevMode, DestroyRef, type Type } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouteConfigLoadEnd, type Route } from '@angular/router';
import { filter } from 'rxjs';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';

type PreserveList = Array<Function | Type<unknown>>;

function filterGuards(guards: unknown[] | undefined, preserve: PreserveList): unknown[] {
  if (!guards?.length) return [];
  if (!preserve.length) return [];
  return guards.filter(g => (preserve as unknown[]).includes(g));
}

function clearGuardsRecursively(routes: Route[], preserve: PreserveList): void {
  for (const route of routes) {
    route.canActivate = filterGuards(route.canActivate as unknown[], preserve) as typeof route.canActivate;
    route.canDeactivate = filterGuards(route.canDeactivate as unknown[], preserve) as typeof route.canDeactivate;
    route.canMatch = filterGuards(route.canMatch as unknown[], preserve) as typeof route.canMatch;
    if (route.children?.length) {
      clearGuardsRecursively(route.children, preserve);
    }
  }
}

export function harMockGuardBypassFactory(): () => void {
  const config = inject(HAR_MOCK_CONFIG);
  const router = inject(Router);
  const destroyRef = inject(DestroyRef);

  return () => {
    // Triple-lock: production'da, devre dışıysa veya bypassGuards=false ise hiçbir şey yapma (ARCH10)
    if (!isDevMode() || !config.enabled || !config.bypassGuards) return;

    const preserve: PreserveList = config.preserveGuards ?? [];

    try {
      // Mevcut route config'leri temizle (eager routes + önceden yüklenmiş lazy routes)
      clearGuardsRecursively(router.config, preserve);

      // Lazy-loaded route'lar için: RouteConfigLoadEnd event'inde yeniden temizle (AC3)
      // takeUntilDestroyed ile uygulama destroy edildiğinde subscription temizlenir
      router.events
        .pipe(filter(e => e instanceof RouteConfigLoadEnd), takeUntilDestroyed(destroyRef))
        .subscribe(() => clearGuardsRecursively(router.config, preserve));
    } catch (e) {
      // Hata loglanır ama uygulama başlatılır; guard'lar bypass edilmemiş haliyle devam eder (AC5)
      console.warn('[HarMock] Guard bypass failed:', e);
    }
  };
}
