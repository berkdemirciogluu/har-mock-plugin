import { Pipe, PipeTransform } from '@angular/core';
import { formatRelativeTime } from '../utils/format-relative-time';

/**
 * Pure pipe — aynı timestamp değeri için cache'ten döner.
 * Template'te fonksiyon çağrısı yerine kullanılmalıdır.
 *
 * @example {{ event.timestamp | relativeTime }}
 */
@Pipe({
  name: 'relativeTime',
  standalone: true,
  pure: true,
})
export class RelativeTimePipe implements PipeTransform {
  transform(timestamp: number): string {
    return formatRelativeTime(timestamp);
  }
}
