import { TestBed } from '@angular/core/testing';
import { harMockStorageInitializerFactory } from './har-mock-storage.initializer';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';

describe('harMockStorageInitializerFactory', () => {
  const baseConfig = {
    harUrl: '/assets/har-mock.har',
    mode: 'last-match' as const,
    enabled: true,
    bypassGuards: false,
    preserveGuards: [],
    rules: [],
    domainFilter: [],
    storageEntries: [],
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  function setup(configOverride = {}) {
    TestBed.configureTestingModule({
      providers: [{ provide: HAR_MOCK_CONFIG, useValue: { ...baseConfig, ...configOverride } }],
    });
    return TestBed.runInInjectionContext(() => harMockStorageInitializerFactory());
  }

  it('enabled=true → localStorage.setItem çağrılır', () => {
    const setLocalItem = jest.spyOn(Storage.prototype, 'setItem');
    const fn = setup({
      storageEntries: [{ key: 'token', value: 'abc', type: 'localStorage' }],
    });
    fn();
    expect(setLocalItem).toHaveBeenCalledWith('token', 'abc');
  });

  it('enabled=true → sessionStorage.setItem çağrılır', () => {
    const setSessionItem = jest.spyOn(Storage.prototype, 'setItem');
    const fn = setup({
      storageEntries: [{ key: 'sess', value: 'val', type: 'sessionStorage' }],
    });
    fn();
    expect(setSessionItem).toHaveBeenCalledWith('sess', 'val');
  });

  it('enabled=false → setItem çağrılmaz', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    const fn = setup({
      enabled: false,
      storageEntries: [{ key: 'token', value: 'abc', type: 'localStorage' }],
    });
    fn();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('storageEntries=[] → setItem çağrılmaz', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    const fn = setup({ storageEntries: [] });
    fn();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('storageEntries tanımlanmamışsa → setItem çağrılmaz', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    const fn = setup({ storageEntries: undefined });
    fn();
    expect(setItem).not.toHaveBeenCalled();
  });
});
