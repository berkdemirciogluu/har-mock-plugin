/**
 * HarMockError — Abstract base class for all har-mock errors.
 *
 * Every error provides three structured fields (NFR13):
 * - type: Error type identifier
 * - rootCause: Root cause description
 * - suggestedAction: Suggested resolution
 */
export abstract class HarMockError extends Error {
  abstract readonly type: string;
  abstract readonly rootCause: string;
  abstract readonly suggestedAction: string;

  protected constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
