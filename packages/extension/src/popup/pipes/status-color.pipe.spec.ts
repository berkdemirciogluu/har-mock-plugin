import { StatusColorPipe } from './status-color.pipe';

describe('StatusColorPipe', () => {
  let pipe: StatusColorPipe;

  beforeEach(() => {
    pipe = new StatusColorPipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  describe('2xx status codes → text-green-600', () => {
    it('should return green class for 200', () => {
      expect(pipe.transform(200)).toBe('text-green-600');
    });

    it('should return green class for 201', () => {
      expect(pipe.transform(201)).toBe('text-green-600');
    });

    it('should return green class for 204', () => {
      expect(pipe.transform(204)).toBe('text-green-600');
    });

    it('should return green class for 299 (boundary)', () => {
      expect(pipe.transform(299)).toBe('text-green-600');
    });
  });

  describe('3xx status codes → text-yellow-600', () => {
    it('should return yellow class for 301', () => {
      expect(pipe.transform(301)).toBe('text-yellow-600');
    });

    it('should return yellow class for 302', () => {
      expect(pipe.transform(302)).toBe('text-yellow-600');
    });

    it('should return yellow class for 304', () => {
      expect(pipe.transform(304)).toBe('text-yellow-600');
    });

    it('should return yellow class for 300 (boundary)', () => {
      expect(pipe.transform(300)).toBe('text-yellow-600');
    });
  });

  describe('4xx status codes → text-red-600', () => {
    it('should return red-600 class for 400', () => {
      expect(pipe.transform(400)).toBe('text-red-600');
    });

    it('should return red-600 class for 401', () => {
      expect(pipe.transform(401)).toBe('text-red-600');
    });

    it('should return red-600 class for 404', () => {
      expect(pipe.transform(404)).toBe('text-red-600');
    });

    it('should return red-600 class for 429', () => {
      expect(pipe.transform(429)).toBe('text-red-600');
    });

    it('should return red-600 class for 499 (boundary)', () => {
      expect(pipe.transform(499)).toBe('text-red-600');
    });
  });

  describe('5xx status codes → text-red-700 font-semibold', () => {
    it('should return red-700 bold class for 500', () => {
      expect(pipe.transform(500)).toBe('text-red-700 font-semibold');
    });

    it('should return red-700 bold class for 502', () => {
      expect(pipe.transform(502)).toBe('text-red-700 font-semibold');
    });

    it('should return red-700 bold class for 503', () => {
      expect(pipe.transform(503)).toBe('text-red-700 font-semibold');
    });

    it('should return red-700 bold class for 599 (boundary)', () => {
      expect(pipe.transform(599)).toBe('text-red-700 font-semibold');
    });
  });

  describe('boundary checks', () => {
    it('should treat 100 as green (< 300)', () => {
      expect(pipe.transform(100)).toBe('text-green-600');
    });

    it('should prioritize 5xx over 4xx (500 is not text-red-600)', () => {
      expect(pipe.transform(500)).not.toBe('text-red-600');
      expect(pipe.transform(500)).toBe('text-red-700 font-semibold');
    });
  });
});
