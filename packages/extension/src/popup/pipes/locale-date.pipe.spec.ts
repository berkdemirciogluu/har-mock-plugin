import { LocaleDatePipe } from './locale-date.pipe';

describe('LocaleDatePipe', () => {
  let pipe: LocaleDatePipe;

  beforeEach(() => {
    pipe = new LocaleDatePipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return a non-empty string', () => {
    const result = pipe.transform(Date.now());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return a valid locale date string', () => {
    const timestamp = new Date(2026, 1, 27, 14, 30, 0).getTime();
    const result = pipe.transform(timestamp);
    // toLocaleString çıktısı locale-dependent ama tarih bileşenlerini içermeli
    expect(result).toContain('2026');
  });
});
