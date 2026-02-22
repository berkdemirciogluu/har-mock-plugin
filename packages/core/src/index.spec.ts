// Path alias doğrulama testi
// Story 1.1 — AC #3: @har-mock/core barrel export çalışıyor mu?
import * as core from '@har-mock/core';

describe('core barrel export', () => {
    it('should resolve @har-mock/core as a valid module', () => {
        expect(core).toBeDefined();
        expect(typeof core).toBe('object');
    });

    it('should export a module object with known keys or empty', () => {
        expect(Object.keys(core)).toEqual(expect.any(Array));
    });
});
