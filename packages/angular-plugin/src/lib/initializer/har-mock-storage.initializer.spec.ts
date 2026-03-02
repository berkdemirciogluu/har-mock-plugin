import { TestBed } from '@angular/core/testing';
import { isDevMode } from '@angular/core';
import { harMockStorageInitializerFactory } from './har-mock-storage.initializer';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';

jest.mock('@angular/core', () => ({
  ...jest.requireActual('@angular/core'),
  isDevMode: jest.fn(),
}));

const mockIsDevMode = isDevMode as jest.MockedFunction<typeof isDevMode>;

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

  function setup(configOverride = {}, devMode = true) {
    mockIsDevMode.mockReturnValue(devMode);
    TestBed.configureTestingModule({
      providers: [{ provide: HAR_MOCK_CONFIG, useValue: { ...baseConfig, ...configOverride } }],
    });
    return TestBed.runInInjectionContext(() => harMockStorageInitializerFactory());
  }

  it('isDevMode=true + enabled=true → localStorage.setItem çağrılır', () => {
    const setLocalItem = jest.spyOn(Storage.prototype, 'setItem');
    const fn = setup({
      storageEntries: [{ key: 'token', value: 'abc', type: 'localStorage' }],
    });
    fn();
    expect(setLocalItem).toHaveBeenCalledWith('token', 'abc');
  });

  it('isDevMode=true + enabled=true → sessionStorage.setItem çağrılır', () => {
    const setSessionItem = jest.spyOn(Storage.prototype, 'setItem');
    const fn = setup({
      storageEntries: [{ key: 'sess', value: 'val', type: 'sessionStorage' }],
    });
    fn();
    expect(setSessionItem).toHaveBeenCalledWith('sess', 'val');
  });

  it('isDevMode=false → setItem çağrılmaz (double-lock)', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    const fn = setup(
      { storageEntries: [{ key: 'token', value: 'abc', type: 'localStorage' }] },
      false,
    );
    fn();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('enabled=false → setItem çağrılmaz (double-lock)', () => {
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
