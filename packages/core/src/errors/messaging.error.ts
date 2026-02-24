import { HarMockError } from './har-mock.error';

/**
 * MessagingError — Thrown when extension port/messaging operations fail.
 *
 * Defined in core for platform-agnostic error handling.
 * Used by extension package (Epic 2).
 *
 * Provides structured error information per NFR13:
 * - type: always 'MESSAGING_ERROR'
 * - rootCause: what went wrong
 * - suggestedAction: how to fix it
 */
export class MessagingError extends HarMockError {
  readonly type = 'MESSAGING_ERROR' as const;

  constructor(
    readonly rootCause: string,
    readonly suggestedAction: string,
  ) {
    super(`[MESSAGING_ERROR] ${rootCause}`);
  }
}
