import { makeEnvironmentProviders, EnvironmentProviders } from '@angular/core';
import type { HarMockConfig } from '../types/har-mock-config.types';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';

/**
 * Angular HAR Mock plugin'i app.config.ts'e ekler.
 *
 * @example
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(withInterceptors([...])),
 *     provideHarMock({ harUrl: '/assets/api.har' }),
 *   ]
 * };
 */
export function provideHarMock(config?: HarMockConfig): EnvironmentProviders {
  const resolved: Required<HarMockConfig> = {
    harUrl: config?.harUrl ?? '/assets/har-mock.har',
    mode: config?.mode ?? 'last-match',
    enabled: config?.enabled ?? true,
    bypassGuards: config?.bypassGuards ?? false,
    rules: config?.rules ?? [],
  };

  return makeEnvironmentProviders([
    { provide: HAR_MOCK_CONFIG, useValue: resolved },
    // Note: HttpInterceptorFn — Story 5.2'de eklenecek
    // Note: APP_INITIALIZER (guard bypass) — Story 5.4'te eklenecek
  ]);
}
