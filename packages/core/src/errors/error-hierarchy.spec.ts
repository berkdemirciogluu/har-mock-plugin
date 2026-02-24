import { HarMockError } from './har-mock.error';
import { HarParseError } from './har-parse.error';
import { UrlMatchError } from './url-match.error';
import { RuleValidationError } from './rule-validation.error';
import { StorageError } from './storage.error';
import { MessagingError } from './messaging.error';

// ─── Error Class Hierarchy Tests ──────────────────────────────

const errorClasses = [
  {
    Class: HarParseError,
    type: 'HAR_PARSE_ERROR',
    name: 'HarParseError',
  },
  {
    Class: UrlMatchError,
    type: 'URL_MATCH_ERROR',
    name: 'UrlMatchError',
  },
  {
    Class: RuleValidationError,
    type: 'RULE_VALIDATION_ERROR',
    name: 'RuleValidationError',
  },
  {
    Class: StorageError,
    type: 'STORAGE_ERROR',
    name: 'StorageError',
  },
  {
    Class: MessagingError,
    type: 'MESSAGING_ERROR',
    name: 'MessagingError',
  },
] as const;

describe('Error Class Hierarchy', () => {
  describe.each(errorClasses)('$name', ({ Class, type, name }) => {
    const rootCause = 'Test root cause';
    const suggestedAction = 'Test suggested action';
    const error = new Class(rootCause, suggestedAction);

    it('should be instanceof HarMockError', () => {
      expect(error).toBeInstanceOf(HarMockError);
    });

    it('should be instanceof Error', () => {
      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct type field', () => {
      expect(error.type).toBe(type);
      expect(typeof error.type).toBe('string');
    });

    it('should have correct rootCause field', () => {
      expect(error.rootCause).toBe(rootCause);
      expect(typeof error.rootCause).toBe('string');
    });

    it('should have correct suggestedAction field', () => {
      expect(error.suggestedAction).toBe(suggestedAction);
      expect(typeof error.suggestedAction).toBe('string');
    });

    it('should have name matching class name', () => {
      expect(error.name).toBe(name);
    });

    it('should have message in format [TYPE] rootCause', () => {
      expect(error.message).toBe(`[${type}] ${rootCause}`);
    });
  });

  describe('unique type values', () => {
    it('each error class should have a unique type', () => {
      const types = errorClasses.map((ec) => {
        const instance = new ec.Class('test', 'test');
        return instance.type;
      });
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });
  });

  describe('error fields are non-empty strings', () => {
    it.each(errorClasses)('$name fields should be non-empty', ({ Class }) => {
      const error = new Class('some cause', 'some action');
      expect(error.type.length).toBeGreaterThan(0);
      expect(error.rootCause.length).toBeGreaterThan(0);
      expect(error.suggestedAction.length).toBeGreaterThan(0);
    });
  });
});
