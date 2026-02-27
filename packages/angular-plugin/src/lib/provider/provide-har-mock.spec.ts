import { TestBed } from '@angular/core/testing';
import { provideHarMock } from './provide-har-mock';
import { HAR_MOCK_CONFIG } from '../types/har-mock-config.types';
import type { MockRule } from '@har-mock/core';

describe('provideHarMock', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should return EnvironmentProviders (not null/undefined)', () => {
    const result = provideHarMock();
    expect(result).toBeDefined();
  });

  it('should apply zero-config defaults when called with no arguments (AC2)', () => {
    TestBed.configureTestingModule({ providers: [provideHarMock()] });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.harUrl).toBe('/assets/har-mock.har');
    expect(config.mode).toBe('last-match');
    expect(config.enabled).toBe(true);
    expect(config.bypassGuards).toBe(false);
    expect(config.rules).toEqual([]);
  });

  it('should use all provided config values (AC3)', () => {
    const rule: MockRule = {
      id: 'test-rule-1',
      urlPattern: '/api/*',
      method: 'GET',
      statusCode: 200,
      responseBody: '{}',
      responseHeaders: [],
      delay: 0,
      enabled: true,
    };
    TestBed.configureTestingModule({
      providers: [
        provideHarMock({
          harUrl: '/assets/custom.har',
          mode: 'sequential',
          enabled: true,
          bypassGuards: true,
          rules: [rule],
        }),
      ],
    });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.harUrl).toBe('/assets/custom.har');
    expect(config.mode).toBe('sequential');
    expect(config.enabled).toBe(true);
    expect(config.bypassGuards).toBe(true);
    expect(config.rules).toHaveLength(1);
    expect(config.rules[0]).toEqual(rule);
  });

  it('should merge partial config with defaults (AC2+AC3)', () => {
    TestBed.configureTestingModule({
      providers: [provideHarMock({ harUrl: '/custom.har' })],
    });
    const config = TestBed.inject(HAR_MOCK_CONFIG);
    expect(config.harUrl).toBe('/custom.har');
    expect(config.mode).toBe('last-match');    // default
    expect(config.enabled).toBe(true);         // default
    expect(config.bypassGuards).toBe(false);   // default
    expect(config.rules).toEqual([]);          // default
  });
});
