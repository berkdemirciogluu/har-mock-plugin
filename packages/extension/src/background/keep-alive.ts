/**
 * Keep-Alive — MV3 Service Worker idle timeout koruması
 * chrome.alarms API ile periyodik wake-up sağlar.
 * Extension aktifken başlatılır, deaktif olduğunda durdurulur.
 */

const KEEP_ALIVE_ALARM = 'har-mock-keep-alive';

/** Extension aktifken keep-alive alarm başlat — ilk alarm hemen, sonra periyodik */
export async function startKeepAlive(): Promise<void> {
  await chrome.alarms.create(KEEP_ALIVE_ALARM, {
    when: Date.now() + 1000, // İlk alarm 1sn sonra — SW'nin hemen uyumamasını garanti eder
    periodInMinutes: 0.4, // Sonrası ~24sn'de bir (Chrome clamps to min 0.5 in prod)
  });
}

/** Extension deaktif olduğunda keep-alive durdur */
export async function stopKeepAlive(): Promise<void> {
  await chrome.alarms.clear(KEEP_ALIVE_ALARM);
}

/** Alarm listener — SW'nin uyanması yeterli, ekstra iş gerekmiyor */
export function initKeepAliveListener(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === KEEP_ALIVE_ALARM) {
      // Noop — SW'nin uyanması yeterli
    }
  });
}
