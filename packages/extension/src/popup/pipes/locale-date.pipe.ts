import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pure pipe — timestamp'i locale date string'e çevirir.
 * Template'te fonksiyon çağrısı yerine kullanılmalıdır.
 *
 * @example [title]="event.timestamp | localeDate"
 */
@Pipe({
  name: 'localeDate',
  standalone: true,
  pure: true,
})
export class LocaleDatePipe implements PipeTransform {
  transform(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
}
