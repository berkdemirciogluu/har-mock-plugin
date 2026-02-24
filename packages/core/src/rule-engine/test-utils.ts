import type { MockRule, MockRequest } from '../types/rule.types';
import type { HarHeader } from '../types/har.types';

const defaultHeaders: readonly HarHeader[] = [{ name: 'Content-Type', value: 'application/json' }];

export function createMockRule(overrides: Partial<MockRule> = {}): MockRule {
  return {
    id: 'test-rule-1',
    urlPattern: '/api/test',
    method: 'GET',
    statusCode: 200,
    responseBody: '{"ok":true}',
    responseHeaders: defaultHeaders,
    delay: 0,
    enabled: true,
    ...overrides,
  };
}

export function createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    url: '/api/test',
    method: 'GET',
    ...overrides,
  };
}
