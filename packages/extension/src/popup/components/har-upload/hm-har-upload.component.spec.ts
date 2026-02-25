import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarUploadComponent } from './hm-har-upload.component';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';
import { MessageType } from '../../../shared/messaging.types';
import { HarParseError } from '@har-mock/core';

// Mock @har-mock/core
jest.mock('@har-mock/core', () => ({
  parseHar: jest.fn(),
  parameterize: jest.fn(),
  HarParseError: class HarParseError extends Error {
    readonly type = 'HAR_PARSE_ERROR' as const;
    rootCause: string;
    suggestedAction: string;
    constructor(rootCause: string, suggestedAction: string) {
      super(rootCause);
      this.name = 'HarParseError';
      this.rootCause = rootCause;
      this.suggestedAction = suggestedAction;
    }
  },
}));

import { parseHar, parameterize } from '@har-mock/core';
const mockParseHar = parseHar as jest.MockedFunction<typeof parseHar>;
const mockParameterize = parameterize as jest.MockedFunction<typeof parameterize>;

// JSDOM does not implement File.prototype.text — polyfill it
Object.defineProperty(File.prototype, 'text', {
  value: jest.fn().mockResolvedValue('{}'),
  writable: true,
  configurable: true,
});

// JSDOM does not implement crypto.randomUUID — polyfill it
const randomUUIDMock = jest.fn().mockReturnValue('test-uuid-1234');
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: randomUUIDMock },
    writable: true,
    configurable: true,
  });
} else if (!globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: randomUUIDMock,
    writable: true,
    configurable: true,
  });
}

function createMockDropEvent(file: File): DragEvent {
  const event = new Event('drop') as unknown as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { files: [file] },
    writable: false,
  });
  Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
  return event;
}

function createMockDragEvent(type: string): DragEvent {
  const event = new Event(type) as unknown as DragEvent;
  Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
  return event;
}

describe('HarUploadComponent', () => {
  let component: HarUploadComponent;
  let fixture: ComponentFixture<HarUploadComponent>;
  let mockMessagingService: jest.Mocked<ExtensionMessagingService>;

  const fakeHarFile = {
    version: '1.2',
    creator: { name: 'test', version: '1.0' },
    entries: [{ request: { url: '/api/users', method: 'GET' } }],
  };

  const fakePatterns = [
    { original: '/api/users', template: '/api/users', method: 'GET', segments: [] },
  ];

  beforeEach(async () => {
    mockMessagingService = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue({ success: true, data: { patternCount: 3 } }),
      state: jest.fn().mockReturnValue(null),
      ngOnDestroy: jest.fn(),
    } as unknown as jest.Mocked<ExtensionMessagingService>;

    // Setup default mocks
    mockParseHar.mockReturnValue(fakeHarFile as unknown as ReturnType<typeof parseHar>);
    mockParameterize.mockReturnValue(fakePatterns as unknown as ReturnType<typeof parameterize>);

    await TestBed.configureTestingModule({
      imports: [HarUploadComponent],
      providers: [{ provide: ExtensionMessagingService, useValue: mockMessagingService }],
    }).compileComponents();

    fixture = TestBed.createComponent(HarUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial state with all signals null/false', () => {
    expect(component.isDragOver()).toBe(false);
    expect(component.isLoading()).toBe(false);
    expect(component.loadedFileName()).toBeNull();
    expect(component.endpointCount()).toBeNull();
    expect(component.errorMessage()).toBeNull();
  });

  describe('drag events', () => {
    it('onDragOver should set isDragOver to true', () => {
      const event = createMockDragEvent('dragover');
      component.onDragOver(event);
      expect(component.isDragOver()).toBe(true);
    });

    it('onDragLeave should set isDragOver to false', () => {
      component.isDragOver.set(true);
      const event = createMockDragEvent('dragleave');
      component.onDragLeave(event);
      expect(component.isDragOver()).toBe(false);
    });

    it('onDrop should process .har file and update signals', async () => {
      const file = new File(['{}'], 'test.har', { type: 'application/json' });
      const dropEvent = createMockDropEvent(file);

      const emittedValues: number[] = [];
      component.onEndpointLoaded.subscribe((v: number) => emittedValues.push(v));

      component.onDrop(dropEvent);

      await new Promise((r) => setTimeout(r, 10));

      expect(mockParseHar).toHaveBeenCalled();
      expect(mockParameterize).toHaveBeenCalledWith(fakeHarFile.entries);
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        MessageType.LOAD_HAR,
        expect.objectContaining({ fileName: 'test.har' }),
        expect.any(String),
      );
      expect(component.endpointCount()).toBe(3);
      expect(component.loadedFileName()).toBe('test.har');
      expect(component.isLoading()).toBe(false);
      expect(emittedValues).toContain(3);
    });

    it('onDrop should reject non-.har files', () => {
      const file = new File(['{}'], 'test.json', { type: 'application/json' });
      const dropEvent = createMockDropEvent(file);

      component.onDrop(dropEvent);

      expect(component.errorMessage()).toBe('Sadece .har uzantılı dosyalar desteklenir.');
      expect(mockParseHar).not.toHaveBeenCalled();
    });

    it('onDrop should do nothing if dataTransfer has no files', () => {
      const event = new Event('drop') as unknown as DragEvent;
      Object.defineProperty(event, 'dataTransfer', { value: { files: [] }, writable: false });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      component.onDrop(event);
      expect(mockParseHar).not.toHaveBeenCalled();
    });

    it('onDrop should reset isDragOver', () => {
      component.isDragOver.set(true);
      const file = new File(['{}'], 'test.har');
      const dropEvent = createMockDropEvent(file);
      component.onDrop(dropEvent);
      expect(component.isDragOver()).toBe(false);
    });
  });

  describe('file input', () => {
    it('onFileInputChange should process selected file', async () => {
      const file = new File(['{}'], 'selected.har');
      const input = { files: [file], value: '' } as unknown as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      component.onFileInputChange(event);
      await new Promise((r) => setTimeout(r, 10));

      expect(mockParseHar).toHaveBeenCalled();
      expect(component.loadedFileName()).toBe('selected.har');
    });

    it('onFileInputChange should do nothing if no file selected', () => {
      const input = { files: null, value: '' } as unknown as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      component.onFileInputChange(event);

      expect(mockParseHar).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should show HarParseError message with type, rootCause, suggestedAction', async () => {
      const parseError = new HarParseError('JSON parse hatası', 'Geçerli bir HAR dosyası yükleyin');
      mockParseHar.mockImplementation(() => {
        throw parseError;
      });

      const file = new File(['invalid'], 'bad.har');
      const dropEvent = createMockDropEvent(file);
      component.onDrop(dropEvent);
      await new Promise((r) => setTimeout(r, 10));

      expect(component.errorMessage()).toContain('HAR_PARSE_ERROR');
      expect(component.errorMessage()).toContain('JSON parse hatası');
      expect(component.errorMessage()).toContain('Geçerli bir HAR dosyası yükleyin');
    });

    it('should show generic error message for unknown errors', async () => {
      mockParseHar.mockImplementation(() => {
        throw new Error('Unknown error');
      });

      const file = new File(['invalid'], 'bad.har');
      const dropEvent = createMockDropEvent(file);
      component.onDrop(dropEvent);
      await new Promise((r) => setTimeout(r, 10));

      expect(component.errorMessage()).toBe('HAR dosyası işlenirken beklenmeyen hata oluştu.');
    });

    it('should show error when response.success is false', async () => {
      mockMessagingService.sendMessage.mockResolvedValue({
        success: false,
        error: { type: 'STORAGE_ERROR', message: 'Storage başarısız' },
      });

      const file = new File(['{}'], 'ok.har');
      const dropEvent = createMockDropEvent(file);
      component.onDrop(dropEvent);
      await new Promise((r) => setTimeout(r, 10));

      expect(component.errorMessage()).toBe('Storage başarısız');
    });

    it('should use 0 as patternCount when data is undefined in response', async () => {
      mockMessagingService.sendMessage.mockResolvedValue({ success: true });

      const file = new File(['{}'], 'test.har');
      component.onDrop(createMockDropEvent(file));
      await new Promise((r) => setTimeout(r, 10));

      expect(component.endpointCount()).toBe(0);
    });

    it('should use default error message when response.error.message is missing', async () => {
      mockMessagingService.sendMessage.mockResolvedValue({ success: false });

      const file = new File(['{}'], 'test.har');
      component.onDrop(createMockDropEvent(file));
      await new Promise((r) => setTimeout(r, 10));

      expect(component.errorMessage()).toBe('Bilinmeyen hata');
    });

    it('clearError should reset errorMessage', () => {
      component.errorMessage.set('Hata var');
      component.clearError();
      expect(component.errorMessage()).toBeNull();
    });
  });

  describe('loading state', () => {
    it('should set isLoading during processFile', () => {
      let loadingDuringProcess = false;
      mockMessagingService.sendMessage.mockImplementation(async () => {
        loadingDuringProcess = component.isLoading();
        return { success: true, data: { patternCount: 0 } };
      });

      const file = new File(['{}'], 'test.har');
      const dropEvent = createMockDropEvent(file);
      component.onDrop(dropEvent);

      // isLoading might already be set synchronously via signal
      expect(component.isLoading()).toBe(true);
    });
  });
});
