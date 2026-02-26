import { formatRelativeTime } from './format-relative-time';

describe('formatRelativeTime', () => {
  it('should return "şimdi" for a timestamp less than 1 second ago', () => {
    const now = Date.now();
    expect(formatRelativeTime(now)).toBe('şimdi');
  });

  it('should return "1s" for a 1-second-old timestamp', () => {
    const timestamp = Date.now() - 1000;
    expect(formatRelativeTime(timestamp)).toBe('1s');
  });

  it('should return "30s" for a 30-second-old timestamp', () => {
    const timestamp = Date.now() - 30_000;
    expect(formatRelativeTime(timestamp)).toBe('30s');
  });

  it('should return "59s" for a 59-second-old timestamp', () => {
    const timestamp = Date.now() - 59_000;
    expect(formatRelativeTime(timestamp)).toBe('59s');
  });

  it('should return "1m" for a 60-second-old timestamp', () => {
    const timestamp = Date.now() - 60_000;
    expect(formatRelativeTime(timestamp)).toBe('1m');
  });

  it('should return "5m" for a 5-minute-old timestamp', () => {
    const timestamp = Date.now() - 5 * 60_000;
    expect(formatRelativeTime(timestamp)).toBe('5m');
  });

  it('should return "59m" for a 59-minute-old timestamp', () => {
    const timestamp = Date.now() - 59 * 60_000;
    expect(formatRelativeTime(timestamp)).toBe('59m');
  });

  it('should return "1h" for a 1-hour-old timestamp (3600 seconds)', () => {
    const timestamp = Date.now() - 3_600_000;
    expect(formatRelativeTime(timestamp)).toBe('1h');
  });

  it('should return "2h" for a 2-hour-old timestamp', () => {
    const timestamp = Date.now() - 2 * 3_600_000;
    expect(formatRelativeTime(timestamp)).toBe('2h');
  });
});
