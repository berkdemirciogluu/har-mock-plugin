/**
 * hm-response-viewer.component.spec.ts
 *
 * HmJsonEditorComponent jest.mock ile stub'lanmıştır — CodeMirror JSDOM'da çalışmaz.
 * Async state değişiklikleri fakeAsync + tick() ile test edilmektedir.
 */
import { type ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HmResponseViewerComponent } from './hm-response-viewer.component';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';
import { MessageType } from '../../../shared/messaging.types';
import type { MatchEvent } from '../../../shared/state.types';
import type { StateSyncPayload } from '../../../shared/payload.types';
import type { HarEntry } from '@har-mock/core';

// ─── HmJsonEditorComponent Stub ────────────────────────────────────────────
// CodeMirror ESM modülleri JSDOM uyumlu değil — stub kullan
// require() factory içinde kullanılmalı (jest.mock hoisting nedeniyle)
jest.mock('../json-editor/hm-json-editor.component', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Component, EventEmitter } = require('@angular/core') as typeof import('@angular/core');
  class HmJsonEditorStub {
    value = '';
    isReadOnly = false;
    valueChange = new EventEmitter<string>();
  }
  return {
    HmJsonEditorComponent: Component({
      selector: 'hm-json-editor',
      standalone: true,
      template: '<div data-testid="json-editor-stub"></div>',
      inputs: ['value', 'isReadOnly'],
      outputs: ['valueChange'],
    })(HmJsonEditorStub),
  };
});

// ─── Test Helpers ───────────────────────────────────────────────────────────
const makeHarEvent = (override: Partial<MatchEvent> = {}): MatchEvent => ({
  id: 'evt-1',
  url: 'https://api.example.com/user',
  method: 'GET',
  source: 'har',
  statusCode: 200,
  timestamp: Date.now(),
  ...override,
});

const makePassthroughEvent = (): MatchEvent => ({
  id: 'evt-pt',
  url: 'https://api.example.com/unknown',
  method: 'GET',
  source: 'passthrough',
  timestamp: Date.now(),
});

const makeHarEntry = (override: Partial<HarEntry> = {}): HarEntry => ({
  url: 'https://api.example.com/user',
  method: 'GET',
  status: 200,
  statusText: 'OK',
  responseBody: '{"id":1,"isAdmin":false}',
  responseHeaders: [],
  requestHeaders: [],
  timings: { blocked: -1, dns: -1, connect: -1, send: 0, wait: 0, receive: 0, ssl: -1 },
  ...override,
});

const makeState = (overrides: Partial<StateSyncPayload> = {}): StateSyncPayload => ({
  harData: {
    entries: [makeHarEntry()],
    patterns: [],
    fileName: 'test.har',
    loadedAt: Date.now(),
  },
  editedResponses: {},
  activeRules: [],
  settings: {
    enabled: true,
    replayMode: 'last-match',
    timingReplay: false,
    excludeList: [],
    resourceTypeFilter: ['xhr', 'fetch'],
    domainFilter: [],
  },
  matchHistory: [],
  accordionStates: {},
  ...overrides,
});

// ─── Shared Setup ───────────────────────────────────────────────────────────
describe('HmResponseViewerComponent', () => {
  let component: HmResponseViewerComponent;
  let fixture: ComponentFixture<HmResponseViewerComponent>;
  let el: HTMLElement;
  let stateSignal: ReturnType<typeof signal<StateSyncPayload | null>>;
  let sendMessageMock: jest.Mock;

  const setupTestBed = async () => {
    stateSignal = signal<StateSyncPayload | null>(null);
    sendMessageMock = jest.fn().mockResolvedValue({ success: true });

    const messagingStub = {
      state: stateSignal.asReadonly(),
      sendMessage: sendMessageMock,
    };

    await TestBed.configureTestingModule({
      imports: [HmResponseViewerComponent],
      providers: [{ provide: ExtensionMessagingService, useValue: messagingStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(HmResponseViewerComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
  };

  describe('Subtask 5.1: event null iken render olabilmeli', () => {
    beforeEach(async () => {
      await setupTestBed();
      fixture.detectChanges();
    });

    it('should create without errors when event is null (default)', () => {
      expect(component).toBeTruthy();
    });

    it('should render empty content when event is null', () => {
      expect(el.querySelector('[data-testid="passthrough-message"]')).toBeNull();
      expect(el.querySelector('[data-testid="response-viewer"]')).toBeNull();
    });
  });

  describe('Subtask 5.2: Passthrough event — eşleşmedi mesajı', () => {
    beforeEach(async () => {
      await setupTestBed();
      stateSignal.set(makeState());
      fixture.componentRef.setInput('event', makePassthroughEvent());
      fixture.detectChanges();
    });

    it('should show passthrough message for passthrough event', () => {
      const msg = el.querySelector('[data-testid="passthrough-message"]');
      expect(msg).toBeTruthy();
      expect(msg!.textContent).toContain("Bu request HAR'da eşleşmedi");
    });

    it('should NOT render editor for passthrough event', () => {
      expect(el.querySelector('[data-testid="editor-container"]')).toBeNull();
    });

    it('should NOT render response-viewer panel for passthrough event', () => {
      expect(el.querySelector('[data-testid="response-viewer"]')).toBeNull();
    });
  });

  describe("Subtask 5.3: HAR event — editör görünmeli; resolvedBody editedResponses'dan gelmeli", () => {
    beforeEach(async () => {
      await setupTestBed();
    });

    it('should show editor for har event (body from harData.entries)', () => {
      stateSignal.set(makeState());
      fixture.componentRef.setInput('event', makeHarEvent());
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="editor-container"]')).toBeTruthy();
    });

    it('should resolve body from harData.entries when no editedResponse exists', () => {
      stateSignal.set(makeState());
      fixture.componentRef.setInput('event', makeHarEvent());
      fixture.detectChanges();
      expect(component.resolvedBody()).toBe('{"id":1,"isAdmin":false}');
    });

    it('should prioritize editedResponses over harData.entries', () => {
      const key = 'GET:https://api.example.com/user';
      stateSignal.set(
        makeState({
          editedResponses: {
            [key]: {
              url: 'https://api.example.com/user',
              method: 'GET',
              body: '{"id":1,"isAdmin":true}',
              headers: [],
              statusCode: 200,
            },
          },
        }),
      );
      fixture.componentRef.setInput('event', makeHarEvent());
      fixture.detectChanges();
      expect(component.resolvedBody()).toBe('{"id":1,"isAdmin":true}');
    });

    it('should return "{}" when no harData and no editedResponse', () => {
      stateSignal.set(makeState({ harData: null }));
      fixture.componentRef.setInput('event', makeHarEvent());
      fixture.detectChanges();
      expect(component.resolvedBody()).toBe('{}');
    });
  });

  describe('Subtask 5.4: valueChange — isDirty true, Kaydet enabled', () => {
    beforeEach(async () => {
      await setupTestBed();
      stateSignal.set(makeState());
      fixture.componentRef.setInput('event', makeHarEvent());
      fixture.detectChanges();
    });

    it('should set isDirty=true when onBodyEdit is called', () => {
      expect(component.isDirty()).toBe(false);
      component.onBodyEdit('{"isAdmin":true}');
      expect(component.isDirty()).toBe(true);
    });

    it('should enable save button when isDirty is true', () => {
      component.onBodyEdit('{"isAdmin":true}');
      fixture.detectChanges();
      const btn = el.querySelector<HTMLButtonElement>('[data-testid="save-button"]');
      expect(btn).toBeTruthy();
      expect(btn!.disabled).toBe(false);
    });

    it('should disable save button when isDirty is false', () => {
      fixture.detectChanges();
      const btn = el.querySelector<HTMLButtonElement>('[data-testid="save-button"]');
      expect(btn).toBeTruthy();
      expect(btn!.disabled).toBe(true);
    });

    it('should clear errorMessage when onBodyEdit is called (L4)', () => {
      component.errorMessage.set('Previous error');
      component.onBodyEdit('{"isAdmin":true}');
      expect(component.errorMessage()).toBeNull();
    });

    it('should not mark dirty when onBodyEdit value matches resolvedBody (M1)', () => {
      stateSignal.set(makeState());
      fixture.componentRef.setInput('event', makeHarEvent());
      fixture.detectChanges();
      // Call onBodyEdit with the same value as resolvedBody — should NOT be dirty
      component.onBodyEdit(component.resolvedBody());
      expect(component.isDirty()).toBe(false);
    });
  });

  describe('Subtask 5.5: saveResponse — UPDATE_RESPONSE doğru key ve payload ile gönderilmeli', () => {
    beforeEach(async () => {
      await setupTestBed();
      stateSignal.set(makeState());
      fixture.componentRef.setInput('event', makeHarEvent());
      fixture.detectChanges();
    });

    it('should call sendMessage with UPDATE_RESPONSE type and correct key', fakeAsync(() => {
      component.onBodyEdit('{"isAdmin":true}');
      component.saveResponse();
      tick();

      expect(sendMessageMock).toHaveBeenCalledWith(
        MessageType.UPDATE_RESPONSE,
        expect.objectContaining({
          key: 'GET:https://api.example.com/user',
          response: expect.objectContaining({
            url: 'https://api.example.com/user',
            method: 'GET',
            body: '{"isAdmin":true}',
            statusCode: 200,
          }),
        }),
        expect.any(String), // requestId (crypto.randomUUID())
      );
      tick(2000); // drain showSuccess setTimeout
    }));

    it('should set isSaving=true during save, then false on success', fakeAsync(() => {
      component.onBodyEdit('{"isAdmin":true}');
      component.saveResponse();
      expect(component.isSaving()).toBe(true);
      tick();
      expect(component.isSaving()).toBe(false);
      tick(2000); // drain showSuccess setTimeout
    }));
  });

  describe('Subtask 5.6: Başarılı kaydet — isDirty=false, isSaving=false', () => {
    beforeEach(async () => {
      await setupTestBed();
      stateSignal.set(makeState());
      fixture.componentRef.setInput('event', makeHarEvent());
      fixture.detectChanges();
    });

    it('should set isDirty=false after successful save', fakeAsync(() => {
      component.onBodyEdit('{"isAdmin":true}');
      expect(component.isDirty()).toBe(true);
      component.saveResponse();
      tick();
      expect(component.isDirty()).toBe(false);
      tick(2000); // drain showSuccess setTimeout
    }));

    it('should set isSaving=false after successful save', fakeAsync(() => {
      component.onBodyEdit('{"isAdmin":true}');
      component.saveResponse();
      tick();
      expect(component.isSaving()).toBe(false);
      tick(2000); // drain showSuccess setTimeout
    }));

    it('should show success indicator briefly after save', fakeAsync(() => {
      component.onBodyEdit('{"x":1}');
      component.saveResponse();
      tick();
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="success-indicator"]')).toBeTruthy();
      tick(2000);
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="success-indicator"]')).toBeNull();
    }));

    it('should show error message when save fails', fakeAsync(() => {
      sendMessageMock.mockRejectedValueOnce(new Error('Network error'));
      component.onBodyEdit('{"x":1}');
      component.saveResponse();
      tick();
      fixture.detectChanges();
      const errorEl = el.querySelector('[data-testid="error-message"]');
      expect(errorEl).toBeTruthy();
      expect(errorEl!.textContent).toContain('Network error');
      expect(component.isSaving()).toBe(false);
    }));

    it('should have aria-label on save button (L2)', () => {
      stateSignal.set(makeState());
      fixture.componentRef.setInput('event', makeHarEvent());
      fixture.detectChanges();
      const btn = el.querySelector<HTMLButtonElement>('[data-testid="save-button"]');
      expect(btn).toBeTruthy();
      expect(btn!.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('H1: Event switch resets transient state', () => {
    beforeEach(async () => {
      await setupTestBed();
      stateSignal.set(makeState());
    });

    it('should reset isDirty when event changes', () => {
      fixture.componentRef.setInput('event', makeHarEvent());
      fixture.detectChanges();
      component.onBodyEdit('{"isAdmin":true}');
      expect(component.isDirty()).toBe(true);

      // Switch to different event
      fixture.componentRef.setInput(
        'event',
        makeHarEvent({ id: 'evt-2', url: 'https://api.example.com/other' }),
      );
      fixture.detectChanges();
      expect(component.isDirty()).toBe(false);
    });

    it('should reset showSuccess when event changes', fakeAsync(() => {
      fixture.componentRef.setInput('event', makeHarEvent());
      fixture.detectChanges();
      component.onBodyEdit('{"x":1}');
      component.saveResponse();
      tick();
      expect(component.showSuccess()).toBe(true);

      // Switch event
      fixture.componentRef.setInput(
        'event',
        makeHarEvent({ id: 'evt-2', url: 'https://api.example.com/other' }),
      );
      fixture.detectChanges();
      expect(component.showSuccess()).toBe(false);
      tick(2000); // drain success timer
    }));

    it('should reset errorMessage when event changes', fakeAsync(() => {
      fixture.componentRef.setInput('event', makeHarEvent());
      fixture.detectChanges();
      sendMessageMock.mockRejectedValueOnce(new Error('fail'));
      component.onBodyEdit('{"x":1}');
      component.saveResponse();
      tick();
      expect(component.errorMessage()).toBe('fail');

      // Switch event
      fixture.componentRef.setInput(
        'event',
        makeHarEvent({ id: 'evt-2', url: 'https://api.example.com/other' }),
      );
      fixture.detectChanges();
      expect(component.errorMessage()).toBeNull();
    }));
  });
});
