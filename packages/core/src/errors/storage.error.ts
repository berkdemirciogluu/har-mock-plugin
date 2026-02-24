import { HarMockError } from './har-mock.error';

/**
 * StorageError — Thrown when chrome.storage.local operations fail.
 *
 * Defined in core for platform-agnostic error handling.
 * Used by extension package (Epic 2).
 *
 * Provides structured error information per NFR13:
 * - type: always 'STORAGE_ERROR'
 * - rootCause: what went wrong
 * - suggestedAction: how to fix it
 */
export class StorageError extends HarMockError {
  readonly type = 'STORAGE_ERROR' as const;

  constructor(
    readonly rootCause: string,
    readonly suggestedAction: string,
  ) {
    super(`[STORAGE_ERROR] ${rootCause}`);
  }
}
