import { HarMockError } from './har-mock.error';

/**
 * HarParseError — Thrown when HAR file parsing or validation fails.
 *
 * Provides structured error information per NFR13:
 * - type: always 'HAR_PARSE_ERROR'
 * - rootCause: what went wrong
 * - suggestedAction: how to fix it
 */
export class HarParseError extends HarMockError {
  readonly type = 'HAR_PARSE_ERROR' as const;

  constructor(
    readonly rootCause: string,
    readonly suggestedAction: string,
  ) {
    super(`[HAR_PARSE_ERROR] ${rootCause}`);
  }
}
