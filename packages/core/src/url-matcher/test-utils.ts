import type { UrlPattern, ParamType } from '../types/url-pattern.types';

/**
 * UrlPattern test fixture helper.
 *
 * Template string'i parse ederek `{param}` segmentlerini dynamic,
 * diğerlerini static olarak işaretler.
 *
 * @param template - URL template (ör: '/api/users/{param}/orders')
 * @param method   - HTTP method (varsayılan: 'GET')
 * @param paramType - Dynamic segment paramType (varsayılan: 'uuid')
 */
export function createPattern(
  template: string,
  method: string = 'GET',
  paramType: ParamType = 'uuid',
): UrlPattern {
  const segments = template
    .split('/')
    .filter((s) => s !== '')
    .map((s) =>
      s === '{param}'
        ? ({ kind: 'dynamic', paramType } as const)
        : ({ kind: 'static', value: s } as const),
    );
  return {
    original: `https://example.com${template}`,
    template,
    segments,
    method,
  };
}
