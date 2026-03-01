import { HarParseError } from '../errors';
import type { HarEntry, HarFile, HarHeader, HarRawEntry, HarTimings } from '../types';
import { validateHarSchema } from './har-validator';

/** Default timings applied when HAR entry has missing or partial timing data */
const DEFAULT_TIMINGS: HarTimings = {
  blocked: -1,
  dns: -1,
  connect: -1,
  send: 0,
  wait: 0,
  receive: 0,
  ssl: -1,
};

/**
 * Parses a raw JSON string into a validated HarFile.
 *
 * @param rawJson - Raw JSON string, expected to be a Chrome DevTools HAR 1.2 export
 * @returns Parsed and normalized HarFile
 * @throws {HarParseError} when JSON is invalid or HAR schema validation fails
 */
export function parseHar(rawJson: string): HarFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch (error: unknown) {
    // M2-R2: JSON.parse always throws SyntaxError (extends Error), so `String(error)` branch
    // is dead code in practice. The fallback is kept for theoretical safety only.
    // istanbul ignore next
    const detail = error instanceof Error ? error.message : String(error);
    throw new HarParseError(
      `Invalid JSON format — ${detail}`,
      'Ensure the file is valid JSON exported from Chrome DevTools. Re-export the HAR file and try again.',
    );
  }

  // Validate against HAR 1.2 schema — narrows to HarRawRoot shape
  validateHarSchema(parsed);

  // After validation, parsed is narrowed to HarRawRoot via asserts
  const log = parsed.log;

  const entries: HarEntry[] = log.entries.map((rawEntry: HarRawEntry) => mapEntry(rawEntry));

  return {
    version: log.version,
    creator: {
      name: log.creator.name,
      version: log.creator.version,
    },
    entries,
  };
}

/**
 * Maps a raw HAR entry to a normalized HarEntry.
 */
function mapEntry(raw: HarRawEntry): HarEntry {
  const responseHeaders: HarHeader[] = Array.isArray(raw.response.headers)
    ? raw.response.headers.map((h: HarHeader) => ({ name: h.name, value: h.value }))
    : [];

  const requestHeaders: HarHeader[] = Array.isArray(raw.request.headers)
    ? raw.request.headers.map((h: HarHeader) => ({ name: h.name, value: h.value }))
    : [];

  // response.content.text: empty string if undefined/null
  // If encoding === 'base64', preserve as-is (consumer decodes)
  const contentText = raw.response.content.text;
  const responseBody: string = contentText !== undefined && contentText !== null ? contentText : '';

  const timings = mapTimings(raw.timings);

  // Chrome DevTools _resourceType custom field — undefined if not present
  const resourceType = (raw as unknown as Record<string, unknown>)['_resourceType'] as
    | string
    | undefined;

  return {
    url: raw.request.url,
    method: raw.request.method,
    status: raw.response.status,
    statusText: raw.response.statusText ?? '',
    responseBody,
    responseHeaders,
    requestHeaders,
    timings,
    ...(resourceType !== undefined && resourceType !== null ? { resourceType } : {}),
  };
}

/**
 * Maps raw HAR timings to normalized HarTimings, applying defaults for missing fields.
 */
function mapTimings(raw: HarRawEntry['timings'] | undefined): HarTimings {
  if (!raw) {
    return { ...DEFAULT_TIMINGS };
  }

  return {
    blocked: raw.blocked ?? DEFAULT_TIMINGS.blocked,
    dns: raw.dns ?? DEFAULT_TIMINGS.dns,
    connect: raw.connect ?? DEFAULT_TIMINGS.connect,
    send: raw.send ?? DEFAULT_TIMINGS.send,
    wait: raw.wait ?? DEFAULT_TIMINGS.wait,
    receive: raw.receive ?? DEFAULT_TIMINGS.receive,
    ssl: raw.ssl ?? DEFAULT_TIMINGS.ssl,
  };
}
