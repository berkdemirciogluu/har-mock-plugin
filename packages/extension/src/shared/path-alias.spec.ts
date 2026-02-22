// Story 1.1 — AC #3: Path alias doğrulama testi
// @har-mock/core → packages/core/src path alias'ının çalıştığını doğrular
import * as core from '@har-mock/core';

describe('@har-mock/core path alias', () => {
  it('should resolve @har-mock/core as a valid module', () => {
    expect(core).toBeDefined();
    expect(typeof core).toBe('object');
  });

  it('should export a module object with known keys or empty', () => {
    expect(Object.keys(core)).toEqual(expect.any(Array));
  });
});
