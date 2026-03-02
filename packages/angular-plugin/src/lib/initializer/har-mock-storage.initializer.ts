import { inject, isDevMode } from '@angular/core';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';

/**
 * APP_INITIALIZER factory — uygulama bootstrap'ından önce localStorage/sessionStorage inject eder.
 *
 * Double-lock: isDevMode()===false veya enabled===false ise hiçbir şey yapmaz.
 * Bu guard diğer initializer'larla (harMockGuardBypassFactory vb.) tutarlıdır.
 * Staging/production ortamında storage inject gerekiyorsa bu factory yerine
 * doğrudan localStorage/sessionStorage.setItem kullanılmalıdır.
 *
 * Aynı key için setItem zaten üzerine yazar — tutarlı davranış.
 */
export function harMockStorageInitializerFactory(): () => void {
  const config = inject(HAR_MOCK_CONFIG);
  return () => {
    // Double-lock: production'da veya devre dışıysa inject yapma
    if (!isDevMode() || !config.enabled) return;

    const entries = config.storageEntries ?? [];
    if (entries.length === 0) return;

    for (const entry of entries) {
      try {
        if (entry.type === 'localStorage') {
          localStorage.setItem(entry.key, entry.value);
        } else {
          sessionStorage.setItem(entry.key, entry.value);
        }
      } catch (e) {
        console.warn(`[HarMock] Storage inject failed for key "${entry.key}":`, e);
      }
    }
  };
}
