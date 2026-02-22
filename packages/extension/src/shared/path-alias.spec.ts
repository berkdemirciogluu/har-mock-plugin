// Story 1.1 — AC #3: Path alias doğrulama testi
// @har-mock/core → packages/core/src path alias'ının çalıştığını doğrular
import {} from '@har-mock/core';

describe('@har-mock/core path alias', () => {
  it('should resolve @har-mock/core without errors', () => {
    // Eğer import başarılı olursa path alias doğru çalışıyor demektir
    expect(true).toBe(true);
  });
});
