import { Pipe, PipeTransform } from '@angular/core';

/**
 * MethodBadgePipe — HTTP method için Tailwind CSS renk class'ı döndürür
 * Template'te fonksiyon çağrısı yasak; pure pipe kullanılır.
 */
@Pipe({ name: 'methodBadge', standalone: true, pure: true })
export class MethodBadgePipe implements PipeTransform {
  private static readonly METHOD_CLASSES: Readonly<Record<string, string>> = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    PATCH: 'bg-orange-100 text-orange-700',
    DELETE: 'bg-red-100 text-red-700',
    HEAD: 'bg-purple-100 text-purple-700',
    OPTIONS: 'bg-slate-100 text-slate-700',
  };

  transform(method: string): string {
    return MethodBadgePipe.METHOD_CLASSES[method] ?? 'bg-slate-100 text-slate-700';
  }
}
