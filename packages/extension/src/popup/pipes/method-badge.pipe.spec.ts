import { MethodBadgePipe } from './method-badge.pipe';

describe('MethodBadgePipe', () => {
  let pipe: MethodBadgePipe;

  beforeEach(() => {
    pipe = new MethodBadgePipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  describe('known HTTP methods', () => {
    it('should return blue classes for GET', () => {
      expect(pipe.transform('GET')).toBe('bg-blue-100 text-blue-700');
    });

    it('should return green classes for POST', () => {
      expect(pipe.transform('POST')).toBe('bg-green-100 text-green-700');
    });

    it('should return yellow classes for PUT', () => {
      expect(pipe.transform('PUT')).toBe('bg-yellow-100 text-yellow-700');
    });

    it('should return orange classes for PATCH', () => {
      expect(pipe.transform('PATCH')).toBe('bg-orange-100 text-orange-700');
    });

    it('should return red classes for DELETE', () => {
      expect(pipe.transform('DELETE')).toBe('bg-red-100 text-red-700');
    });

    it('should return purple classes for HEAD', () => {
      expect(pipe.transform('HEAD')).toBe('bg-purple-100 text-purple-700');
    });

    it('should return slate classes for OPTIONS', () => {
      expect(pipe.transform('OPTIONS')).toBe('bg-slate-100 text-slate-700');
    });
  });

  describe('unknown / fallback methods', () => {
    it('should return slate fallback for unknown method', () => {
      expect(pipe.transform('UNKNOWN')).toBe('bg-slate-100 text-slate-700');
    });

    it('should return slate fallback for lowercase get (case-sensitive)', () => {
      // Pipe case-sensitive — lowercase gelmemeli ama gelse fallback'e düşmeli
      expect(pipe.transform('get')).toBe('bg-slate-100 text-slate-700');
    });

    it('should return slate fallback for empty string', () => {
      expect(pipe.transform('')).toBe('bg-slate-100 text-slate-700');
    });

    it('should return slate fallback for CONNECT', () => {
      expect(pipe.transform('CONNECT')).toBe('bg-slate-100 text-slate-700');
    });
  });
});
