import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  let pipe: RelativeTimePipe;

  beforeEach(() => {
    pipe = new RelativeTimePipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "şimdi" for current timestamp', () => {
    expect(pipe.transform(Date.now())).toBe('şimdi');
  });

  it('should return seconds format for recent timestamps', () => {
    expect(pipe.transform(Date.now() - 30_000)).toBe('30s');
  });

  it('should return minutes format for older timestamps', () => {
    expect(pipe.transform(Date.now() - 5 * 60_000)).toBe('5m');
  });

  it('should return hours format for much older timestamps', () => {
    expect(pipe.transform(Date.now() - 2 * 3_600_000)).toBe('2h');
  });
});
