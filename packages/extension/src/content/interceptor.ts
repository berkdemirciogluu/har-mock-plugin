/**
 * MAIN World Content Script Entry Point
 * manifest.json → content_scripts[1] → "world": "MAIN", "run_at": "document_start"
 *
 * Bu script sayfanın JS context'inde çalışır:
 * - window.fetch ve XMLHttpRequest override
 * - chrome.runtime API'lerine ERİŞİMİ YOK
 * - ISOLATED world content script ile window.postMessage üzerinden iletişim kurar
 */
import { MockResolver } from './mock-resolver';
import { interceptFetch } from './fetch-interceptor';
import { interceptXhr } from './xhr-interceptor';
import { HAR_MOCK_CHANNEL } from './window-messaging.types';

const resolver = new MockResolver();
interceptFetch(resolver);
interceptXhr(resolver);

// --- Storage Inject ---
// ISOLATED world'den gelen STORAGE_INJECT mesajını dinle → localStorage/sessionStorage'a yaz

/** Önceki inject edilen key'lerin kaydı (silinip üzerine yazılsın semantiği) */
const injectedKeys: Array<{ key: string; type: 'localStorage' | 'sessionStorage' }> = [];

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as Record<string, unknown> | undefined;
  if (data?.['channel'] !== HAR_MOCK_CHANNEL) return;
  if (data?.['type'] !== 'STORAGE_INJECT') return;

  // Önceki inject'leri temizle
  for (const { key, type } of injectedKeys) {
    if (type === 'localStorage') {
      window.localStorage.removeItem(key);
    } else {
      window.sessionStorage.removeItem(key);
    }
  }
  injectedKeys.length = 0;

  // Yeni değerleri yaz
  const entries =
    (data['entries'] as Array<{
      key: string;
      value: string;
      type: 'localStorage' | 'sessionStorage';
    }>) ?? [];
  for (const entry of entries) {
    if (entry.type === 'localStorage') {
      window.localStorage.setItem(entry.key, entry.value);
    } else {
      window.sessionStorage.setItem(entry.key, entry.value);
    }
    injectedKeys.push({ key: entry.key, type: entry.type });
  }
});
