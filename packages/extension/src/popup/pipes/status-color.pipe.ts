import { Pipe, PipeTransform } from '@angular/core';

/**
 * StatusColorPipe — HTTP durum kodu için Tailwind CSS renk class'ı döndürür
 * Template'te fonksiyon çağrısı yasak; pure pipe kullanılır.
 */
@Pipe({ name: 'statusColor', standalone: true, pure: true })
export class StatusColorPipe implements PipeTransform {
  transform(statusCode: number): string {
    if (statusCode >= 500) return 'text-red-700 font-semibold';
    if (statusCode >= 400) return 'text-red-600';
    if (statusCode >= 300) return 'text-yellow-600';
    return 'text-green-600';
  }
}
