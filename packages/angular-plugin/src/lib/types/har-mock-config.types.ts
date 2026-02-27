import type { MockRule } from '@har-mock/core';
import { InjectionToken } from '@angular/core';

/** HAR mock response selection mode */
export type MockMode = 'last-match' | 'sequential';

/**
 * Configuration for the provideHarMock() factory function.
 * All fields are optional; unspecified fields use zero-config defaults.
 */
export interface HarMockConfig {
  /**
   * URL of the HAR file.
   * Loaded from the Angular assets folder.
   * @default '/assets/har-mock.har'
   */
  harUrl?: string;

  /**
   * HAR response selection mode.
   * - 'last-match': Uses the last matching entry for the URL pattern
   * - 'sequential': Uses the next entry in sequence for each request
   * @default 'last-match'
   */
  mode?: MockMode;

  /**
   * Enables/disables the plugin.
   * Double-lock: If isDevMode() is false, the plugin stays inactive regardless of this value.
   * @default true
   */
  enabled?: boolean;

  /**
   * Disables Angular route guards in dev mode.
   * Uses APP_INITIALIZER to mutate Router.config.
   * @default false
   */
  bypassGuards?: boolean;

  /**
   * Active mock rule list.
   * Priority chain: Rules > HAR > Passthrough
   * @default []
   */
  rules?: MockRule[];
}

/** Angular DI token — injects the resolved (Required<HarMockConfig>) configuration */
export const HAR_MOCK_CONFIG = new InjectionToken<Required<HarMockConfig>>('HAR_MOCK_CONFIG');
