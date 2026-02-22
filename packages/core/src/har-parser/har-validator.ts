import { HarParseError } from '../errors';
import type { HarRawRoot } from '../types';

/**
 * Validates that the given data conforms to HAR 1.2 required schema.
 * Uses TypeScript `asserts` keyword for type narrowing: unknown → HarRawRoot.
 *
 * **Scope (L3-R2):** This validator checks the fields required for parsing:
 * log.version, log.creator (name/version as strings), log.entries array,
 * and per-entry: request.url, request.method, response.status, response.content.
 * Fields not required for parsing (startedDateTime, httpVersion, cookies,
 * queryString, headers arrays, content.size, content.mimeType, timings) are
 * intentionally not validated here — the parser applies safe defaults for these.
 *
 * @param data - Unknown input, expected to be a parsed HAR root object
 * @throws {HarParseError} when required fields are missing or have wrong types
 */
export function validateHarSchema(data: unknown): asserts data is HarRawRoot {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new HarParseError(
      "Invalid HAR data: expected an object but received '" + typeof data + "'",
      'Ensure the HAR file is a valid JSON object exported from Chrome DevTools.',
    );
  }

  const root = data as Record<string, unknown>;

  // Validate root "log" property
  if (
    !('log' in root) ||
    root['log'] === null ||
    root['log'] === undefined ||
    typeof root['log'] !== 'object'
  ) {
    throw new HarParseError(
      "Missing 'log' property in HAR root object",
      "Ensure the HAR file contains a top-level 'log' object. Re-export the HAR file from Chrome DevTools.",
    );
  }

  const log = root['log'] as Record<string, unknown>;

  // Validate log.version
  if (!('version' in log) || typeof log['version'] !== 'string') {
    throw new HarParseError(
      "Missing or invalid 'log.version' — expected a string",
      "Ensure the HAR file contains 'log.version' as a string (e.g., '1.2').",
    );
  }

  // Validate log.entries
  if (!('entries' in log) || !Array.isArray(log['entries'])) {
    throw new HarParseError(
      "Missing or invalid 'log.entries' — expected an array",
      "Ensure the HAR file contains a valid 'log.entries' array. Re-export from Chrome DevTools.",
    );
  }

  const entries = log['entries'] as unknown[];

  // Validate log.creator (HAR 1.2 required field) — H1-R2: also validate creator.name and creator.version as strings
  if (!('creator' in log)) {
    throw new HarParseError(
      "Missing 'log.creator' — required by HAR 1.2 specification",
      "Ensure the HAR file contains a 'log.creator' object with 'name' and 'version' fields.",
    );
  }

  if (log['creator'] === null || typeof log['creator'] !== 'object') {
    throw new HarParseError(
      "Invalid 'log.creator' — expected an object with 'name' and 'version'",
      "Ensure the HAR file contains a valid 'log.creator' object. Re-export from Chrome DevTools.",
    );
  }

  const creator = log['creator'] as Record<string, unknown>;

  if (!('name' in creator) || typeof creator['name'] !== 'string') {
    throw new HarParseError(
      "Missing or invalid 'log.creator.name' — expected a string",
      "Ensure the HAR file's 'log.creator' object contains a 'name' string field.",
    );
  }

  if (!('version' in creator) || typeof creator['version'] !== 'string') {
    throw new HarParseError(
      "Missing or invalid 'log.creator.version' — expected a string",
      "Ensure the HAR file's 'log.creator' object contains a 'version' string field.",
    );
  }

  // Validate each entry
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (entry === null || entry === undefined || typeof entry !== 'object') {
      throw new HarParseError(
        `Invalid entry at index ${i}: expected an object`,
        `Check entry at index ${i} in log.entries. Each entry must be a valid object.`,
      );
    }

    const entryObj = entry as Record<string, unknown>;

    // Validate request
    if (
      !('request' in entryObj) ||
      entryObj['request'] === null ||
      typeof entryObj['request'] !== 'object'
    ) {
      throw new HarParseError(
        `Missing 'request' in entry at index ${i}`,
        `Ensure entry at index ${i} contains a 'request' object with 'url' and 'method' fields.`,
      );
    }

    const request = entryObj['request'] as Record<string, unknown>;

    // Validate request.url
    if (!('url' in request) || typeof request['url'] !== 'string') {
      throw new HarParseError(
        `Missing or invalid 'request.url' in entry at index ${i} — expected a string`,
        `Ensure entry at index ${i} has a valid 'request.url' string.`,
      );
    }

    // Validate request.method
    if (!('method' in request) || typeof request['method'] !== 'string') {
      throw new HarParseError(
        `Missing or invalid 'request.method' in entry at index ${i} — expected a string`,
        `Ensure entry at index ${i} has a valid 'request.method' string (e.g., 'GET', 'POST').`,
      );
    }

    // Validate response
    if (
      !('response' in entryObj) ||
      entryObj['response'] === null ||
      typeof entryObj['response'] !== 'object'
    ) {
      throw new HarParseError(
        `Missing 'response' in entry at index ${i}`,
        `Ensure entry at index ${i} contains a 'response' object with 'status' and 'content' fields.`,
      );
    }

    const response = entryObj['response'] as Record<string, unknown>;

    // Validate response.status
    if (!('status' in response) || typeof response['status'] !== 'number') {
      throw new HarParseError(
        `Missing or invalid 'response.status' in entry at index ${i} — expected a number`,
        `Ensure entry at index ${i} has a valid 'response.status' number (e.g., 200, 404).`,
      );
    }

    // Validate response.content
    if (
      !('content' in response) ||
      response['content'] === null ||
      typeof response['content'] !== 'object'
    ) {
      throw new HarParseError(
        `Missing or invalid 'response.content' in entry at index ${i} — expected an object`,
        `Ensure entry at index ${i} has a valid 'response.content' object.`,
      );
    }
  }
}
