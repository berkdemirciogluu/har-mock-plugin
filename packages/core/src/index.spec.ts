// Path alias doğrulama testi
// Story 1.1 — AC #3: @har-mock/core barrel export çalışıyor mu?
import * as core from '@har-mock/core';

describe('core barrel export', () => {
    it('should resolve @har-mock/core as a valid module', () => {
        expect(core).toBeDefined();
        expect(typeof core).toBe('object');
    });

    it('should be importable via require without throwing', () => {
        expect(() => { require('@har-mock/core'); }).not.toThrow();
    });
});
