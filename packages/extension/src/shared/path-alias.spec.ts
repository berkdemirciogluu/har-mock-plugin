// Story 1.1 — AC #3: Path alias doğrulama testi
// @har-mock/core → packages/core/src path alias'ının çalıştığını doğrular
import * as core from '@har-mock/core';

describe('@har-mock/core path alias', () => {
    it('should resolve @har-mock/core as a valid module', () => {
        expect(core).toBeDefined();
        expect(typeof core).toBe('object');
    });

    it('should be importable via require without throwing', () => {
        expect(() => { require('@har-mock/core'); }).not.toThrow();
    });
});
