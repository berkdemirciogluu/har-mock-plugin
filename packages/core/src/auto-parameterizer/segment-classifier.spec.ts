import { classifySegment } from './segment-classifier';
import type { PatternSegment } from '../types';

describe('classifySegment', () => {
  // ─── UUID Testleri (Subtask 4.2) ──────────────────────────────

  describe('UUID segments', () => {
    it.each([
      '550e8400-e29b-41d4-a716-446655440000', // standart lowercase
      'A550E840-E29B-41D4-A716-446655440000', // uppercase
      '550E8400-e29b-41D4-a716-446655440000', // mixed case
    ])('should classify "%s" as dynamic uuid', (segment) => {
      const result = classifySegment(segment);
      expect(result).toEqual<PatternSegment>({
        kind: 'dynamic',
        paramType: 'uuid',
      });
    });
  });

  // ─── Numeric ID Testleri (Subtask 4.3) ─────────────────────────

  describe('Numeric ID segments', () => {
    it.each([
      '5', // tek haneli
      '42', // çift haneli
      '123456', // çok haneli
    ])('should classify "%s" as dynamic numeric', (segment) => {
      const result = classifySegment(segment);
      expect(result).toEqual<PatternSegment>({
        kind: 'dynamic',
        paramType: 'numeric',
      });
    });

    it('should classify "0" as dynamic numeric', () => {
      const result = classifySegment('0');
      expect(result).toEqual<PatternSegment>({
        kind: 'dynamic',
        paramType: 'numeric',
      });
    });
  });

  // ─── Hex Token Testleri (Subtask 4.4) ──────────────────────────

  describe('Hex token segments', () => {
    it.each([
      'a1b2c3d4e5f67890', // tam 16 karakter
      'abcdef1234567890abcdef12', // 24 karakter
      'a1b2c3d4e5f67890abcdef1234567890', // 32 karakter
    ])('should classify "%s" as dynamic hex', (segment) => {
      const result = classifySegment(segment);
      expect(result).toEqual<PatternSegment>({
        kind: 'dynamic',
        paramType: 'hex',
      });
    });
  });

  // ─── Base64/JWT Testleri (Subtask 4.5) ─────────────────────────

  describe('Base64/JWT segments', () => {
    it.each([
      'eyJhbGciOiJIUzI1NiJ9', // JWT header segment
      'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo', // uzun base64 string
      'dGhpc19pc191cmxfc2FmZQ', // URL-safe base64
    ])('should classify "%s" as dynamic base64', (segment) => {
      const result = classifySegment(segment);
      expect(result).toEqual<PatternSegment>({
        kind: 'dynamic',
        paramType: 'base64',
      });
    });
  });

  // ─── Nullable Testleri (Subtask 4.6) ───────────────────────────

  describe('Nullable segments', () => {
    it('should classify "null" as dynamic nullable', () => {
      expect(classifySegment('null')).toEqual<PatternSegment>({
        kind: 'dynamic',
        paramType: 'nullable',
      });
    });

    it('should classify "undefined" as dynamic nullable', () => {
      expect(classifySegment('undefined')).toEqual<PatternSegment>({
        kind: 'dynamic',
        paramType: 'nullable',
      });
    });

    it('should classify empty string as dynamic nullable', () => {
      expect(classifySegment('')).toEqual<PatternSegment>({
        kind: 'dynamic',
        paramType: 'nullable',
      });
    });
  });

  // ─── Static Segment Testleri (Subtask 4.7) ─────────────────────

  describe('Static segments', () => {
    it.each(['api', 'users', 'v2'])('should classify "%s" as static', (segment) => {
      const result = classifySegment(segment);
      expect(result).toEqual<PatternSegment>({
        kind: 'static',
        value: segment,
      });
    });
  });

  // ─── Edge Case / Sınır Testleri (Subtask 4.8) ──────────────────

  describe('Edge cases', () => {
    it('should classify 15-char hex-like string as static (below hex minimum 16)', () => {
      // 15 karakter hex-like → hex minimum 16 karakter, bu hex olmaz
      // Ancak 15 char tamamı digit değilse numeric de olmaz → static
      const result = classifySegment('a1b2c3d4e5f6789'); // 15 char, hex chars
      expect(result).toEqual<PatternSegment>({
        kind: 'static',
        value: 'a1b2c3d4e5f6789',
      });
    });

    it('should classify 19-char base64-like string as static (below base64 minimum 20)', () => {
      // 19 karakter alfanumerik → base64 minimum 20, bu base64 olmaz
      const result = classifySegment('abcdefghij123456789'); // 19 char
      expect(result).toEqual<PatternSegment>({
        kind: 'static',
        value: 'abcdefghij123456789',
      });
    });

    it('should classify very long numeric string as numeric (not hex)', () => {
      // Sadece rakam ama çok uzun — numeric regex önce gelir
      const result = classifySegment('123456789012345678');
      expect(result).toEqual<PatternSegment>({
        kind: 'dynamic',
        paramType: 'numeric',
      });
    });

    it('should classify "0" as numeric', () => {
      const result = classifySegment('0');
      expect(result).toEqual<PatternSegment>({
        kind: 'dynamic',
        paramType: 'numeric',
      });
    });
  });

  // ─── False Positive Regresyon Testleri (Subtask 4.9) ────────────

  describe('False positive regression', () => {
    it('should NOT classify "users" as hex (5 chars < 16 minimum)', () => {
      const result = classifySegment('users');
      expect(result.kind).toBe('static');
    });

    it('should NOT classify "profile" as base64 (7 chars < 20 minimum)', () => {
      const result = classifySegment('profile');
      expect(result.kind).toBe('static');
    });

    it('should NOT classify "v2" as numeric (starts with letter "v")', () => {
      const result = classifySegment('v2');
      expect(result).toEqual<PatternSegment>({
        kind: 'static',
        value: 'v2',
      });
    });

    it('should NOT classify "orders" as hex', () => {
      const result = classifySegment('orders');
      expect(result.kind).toBe('static');
    });

    it('should NOT classify "details" as base64', () => {
      const result = classifySegment('details');
      expect(result.kind).toBe('static');
    });
  });
});
