import { HarMockError } from './har-mock.error';

/**
 * RuleValidationError — Thrown when a mock rule definition is invalid.
 *
 * Provides structured error information per NFR13:
 * - type: always 'RULE_VALIDATION_ERROR'
 * - rootCause: what went wrong
 * - suggestedAction: how to fix it
 */
export class RuleValidationError extends HarMockError {
  readonly type = 'RULE_VALIDATION_ERROR' as const;

  constructor(
    readonly rootCause: string,
    readonly suggestedAction: string,
  ) {
    super(`[RULE_VALIDATION_ERROR] ${rootCause}`);
  }
}
