import { HarMockError } from './har-mock.error';

/**
 * UrlMatchError — Thrown when URL matching fails.
 *
 * Provides structured error information per NFR13:
 * - type: always 'URL_MATCH_ERROR'
 * - rootCause: what went wrong
 * - suggestedAction: how to fix it
 */
export class UrlMatchError extends HarMockError {
  readonly type = 'URL_MATCH_ERROR' as const;

  constructor(
    readonly rootCause: string,
    readonly suggestedAction: string,
  ) {
    super(`[URL_MATCH_ERROR] ${rootCause}`);
  }
}
