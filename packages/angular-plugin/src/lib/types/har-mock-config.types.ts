import type { MockRule } from '@har-mock/core';
import { InjectionToken } from '@angular/core';

/** HAR mock response seçim modu */
export type MockMode = 'last-match' | 'sequential';

/**
 * provideHarMock() factory function konfigürasyonu.
 * Tüm alanlar opsiyonel; belirtilmeyenler zero-config default değerlerini alır.
 */
export interface HarMockConfig {
  /**
   * HAR dosyasının URL'i.
   * Angular assets klasöründen yüklenir.
   * @default '/assets/har-mock.har'
   */
  harUrl?: string;

  /**
   * HAR response seçim modu.
   * - 'last-match': URL pattern'ına en son eklenen eşleşen entry kullanılır
   * - 'sequential': Her istek için sırayla bir sonraki entry kullanılır
   * @default 'last-match'
   */
  mode?: MockMode;

  /**
   * Plugin'i etkinleştirir/devre dışı bırakır.
   * Double-lock: isDevMode() false ise bu değerden bağımsız plugin pasif kalır.
   * @default true
   */
  enabled?: boolean;

  /**
   * Dev mode'da Angular route guard'larını devre dışı bırakır.
   * APP_INITIALIZER aracılığıyla Router.config mutation yapılır.
   * @default false
   */
  bypassGuards?: boolean;

  /**
   * Aktif mock rule listesi.
   * Priority chain: Rules → HAR → Passthrough
   * @default []
   */
  rules?: MockRule[];
}

/** Angular DI token — resolved (Required<HarMockConfig>) konfigürasyonu inject eder */
export const HAR_MOCK_CONFIG = new InjectionToken<Required<HarMockConfig>>('HAR_MOCK_CONFIG');
