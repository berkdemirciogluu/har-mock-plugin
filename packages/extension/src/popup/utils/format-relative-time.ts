/**
 * Verilen Unix timestamp'i şu ana göre göreli zaman stringine çevirir.
 * Yeni match event geldiğinde component re-render oluştuğundan canlı timer gereksizdir.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns "şimdi" | "Xs" | "Xm" | "Xh"
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 1) return 'şimdi';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}
