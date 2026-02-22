// Path alias doğrulama testi
// Story 1.1 — AC #3: @har-mock/core barrel export çalışıyor mu?
import {} from '@har-mock/core';

describe('core barrel export', () => {
  it('should export without errors (placeholder module)', () => {
    // @har-mock/core barrel import başarılı olursa bu test geçer
    expect(true).toBe(true);
  });
});
