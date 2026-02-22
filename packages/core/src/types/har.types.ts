/**
 * HAR 1.2 Specification Type Definitions
 * @see http://www.softwareishard.com/blog/har-12-spec/
 *
 * Two type sets:
 * 1. Raw HAR types (HarLog, HarRawEntry, etc.) — represent original HAR file structure
 * 2. Parsed output types (HarFile, HarEntry, etc.) — normalized for application use
 */

// ─── HTTP Method ───────────────────────────────────────────────

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | 'CONNECT'
  | 'TRACE';

// ─── Shared Types ──────────────────────────────────────────────

export interface HarHeader {
  readonly name: string;
  readonly value: string;
}

export interface HarQueryParam {
  readonly name: string;
  readonly value: string;
}

// ─── Parsed Output Types (Application Use) ─────────────────────

export interface HarTimings {
  readonly blocked: number; // -1 if not applicable
  readonly dns: number; // -1 if not applicable
  readonly connect: number; // -1 if not applicable
  readonly send: number;
  readonly wait: number;
  readonly receive: number;
  readonly ssl: number; // -1 if not applicable
}

export interface HarEntry {
  readonly url: string;
  readonly method: string;
  readonly status: number;
  readonly statusText: string;
  readonly responseBody: string; // content.text or empty string
  readonly responseHeaders: readonly HarHeader[];
  readonly requestHeaders: readonly HarHeader[];
  readonly timings: HarTimings;
}

export interface HarCreator {
  readonly name: string;
  readonly version: string;
}

export interface HarFile {
  readonly version: string;
  readonly creator: HarCreator;
  readonly entries: readonly HarEntry[];
}

// ─── Raw HAR Types (Validator Input) ───────────────────────────

export interface HarRawContent {
  readonly size: number;
  readonly compression?: number;
  readonly mimeType: string;
  readonly text?: string;
  readonly encoding?: string; // "base64" for binary content
}

export interface HarRawPostData {
  readonly mimeType: string;
  readonly text: string;
}

export interface HarRawCookie {
  readonly name: string;
  readonly value: string;
}

export interface HarRawRequest {
  readonly method: string;
  readonly url: string;
  readonly httpVersion: string;
  readonly cookies: readonly HarRawCookie[];
  readonly headers: readonly HarHeader[];
  readonly queryString: readonly HarQueryParam[];
  readonly headersSize: number;
  readonly bodySize: number;
  readonly postData?: HarRawPostData;
}

export interface HarRawResponse {
  readonly status: number;
  readonly statusText: string;
  readonly httpVersion: string;
  readonly cookies: readonly HarRawCookie[];
  readonly headers: readonly HarHeader[];
  readonly content: HarRawContent;
  readonly redirectURL: string;
  readonly headersSize: number;
  readonly bodySize: number;
}

export interface HarRawTimings {
  readonly blocked?: number;
  readonly dns?: number; // M1-R2: optional — real HAR files may omit timing fields; parser applies defaults
  readonly connect?: number;
  readonly send?: number;
  readonly wait?: number;
  readonly receive?: number;
  readonly ssl?: number;
}

export interface HarRawEntry {
  readonly startedDateTime: string;
  readonly time: number;
  readonly request: HarRawRequest;
  readonly response: HarRawResponse;
  readonly timings?: HarRawTimings; // M1-R2: optional — some HAR exporters omit timings entirely
}

export interface HarRawCreator {
  readonly name: string;
  readonly version: string;
}

export interface HarLog {
  readonly version: string;
  readonly creator: HarRawCreator;
  readonly entries: readonly HarRawEntry[];
}

export interface HarRawRoot {
  readonly log: HarLog;
}
