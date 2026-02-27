import { makeEnvironmentProviders, EnvironmentProviders, APP_INITIALIZER, inject } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import type { HarMockConfig } from '../types/har-mock-config.types';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';
import { HarLoaderService, harMockInterceptor } from '../interceptor/har-mock.interceptor';

/**
 * Angular HAR Mock plugin'i app.config.ts'e ekler.
 *
 * @example
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
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
    HarLoaderService,
    provideHttpClient(withInterceptors([harMockInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const loader = inject(HarLoaderService);
        return () => loader.load();
      },
      multi: true,
    },
    // Note: Router guard bypass (APP_INITIALIZER ile route block) — Story 5.4'te eklenecek
  ]);
}
