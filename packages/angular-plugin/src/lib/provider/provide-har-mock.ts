import {
  makeEnvironmentProviders,
  EnvironmentProviders,
  APP_INITIALIZER,
  inject,
  isDevMode,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import type { HarMockConfig } from '../types/har-mock-config.types';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';
import { HarLoaderService, harMockInterceptor } from '../interceptor/har-mock.interceptor';
import { harMockGuardBypassFactory } from '../initializer';
import { harMockStorageInitializerFactory } from '../initializer/har-mock-storage.initializer';

/**
 * Angular HAR Mock plugin'i app.config.ts'e ekler.
 *
 * @remarks Bu fonksiyon dahili olarak `provideHttpClient()` çağırır. Uygulamanızda
 * ayrıca `provideHttpClient()` çağrılması interceptor çakışmasına neden olabilir;
 * gerekirse diğer interceptor'larınızı bu çağrıdan sonra ekleyin.
 *
 * @todo AC4 bundle doğrulaması: `ng build --configuration production --stats-json`
 * çıktısını webpack-bundle-analyzer ile inceleyerek mock kodun prod bundle'a
 * sızmadığını teyit edin.
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
    preserveGuards: config?.preserveGuards ?? [],
    rules: config?.rules ?? [],
    domainFilter: config?.domainFilter ?? [],
    storageEntries: config?.storageEntries ?? [],
  };

  return makeEnvironmentProviders([
    { provide: HAR_MOCK_CONFIG, useValue: resolved },
    HarLoaderService,
    provideHttpClient(withInterceptors([harMockInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const loader = inject(HarLoaderService);
        const config = inject(HAR_MOCK_CONFIG);
        return () => {
          // Double-lock: production'da veya devre dışıysa HAR fetch edilmez (NFR1, NFR2)
          if (!isDevMode() || !config.enabled) return;
          return loader.load();
        };
      },
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: harMockGuardBypassFactory,
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: harMockStorageInitializerFactory,
      multi: true,
    },
  ]);
}
