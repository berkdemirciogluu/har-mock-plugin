/**
 * hm-json-editor.component.spec.ts
 *
 * CodeMirror modülleri jest.mock ile tamamen mock'lanmıştır — ESM dönüşümü gerekmez.
 * afterNextRender, Angular TestBed'de detectChanges() sırasında tetiklenir.
 */

// ─── CodeMirror Mock Tanımlamaları ─────────────────────────────────────────
// jest.mock HOISTED edilir; factory içinde tanımlanan jest.fn() güvenlidir.

jest.mock('@codemirror/view', () => {
  const mockEditorViewConstructor = jest.fn().mockImplementation(() => ({
    state: {
      doc: {
        toString: jest.fn().mockReturnValue('{}'),
      },
    },
    dispatch: jest.fn(),
    destroy: jest.fn(),
  }));

  // Object.assign avoids `as unknown as` double assertions that Babel cannot parse in hoisted jest.mock factories
  Object.assign(mockEditorViewConstructor, {
    editable: {
      of: jest.fn().mockReturnValue({ _tag: 'ext' }),
    },
    theme: jest.fn().mockReturnValue({ _tag: 'ext' }),
    updateListener: {
      of: jest.fn().mockImplementation((listener) => {
        // Expose the listener so tests can simulate document changes
        Object.assign(mockEditorViewConstructor, { _capturedUpdateListener: listener });
        return { _tag: 'ext' };
      }),
    },
  });

  return {
    EditorView: mockEditorViewConstructor,
    keymap: { of: jest.fn().mockReturnValue({ _tag: 'ext' }) },
    lineNumbers: jest.fn().mockReturnValue({ _tag: 'ext' }),
  };
});

jest.mock('@codemirror/state', () => {
  const mockCompartmentOf = jest.fn().mockReturnValue({ _tag: 'ext' });
  const mockCompartmentReconfigure = jest.fn().mockReturnValue({ _tag: 'stateEffect' });

  const MockCompartment = jest.fn().mockImplementation(() => ({
    of: mockCompartmentOf,
    reconfigure: mockCompartmentReconfigure,
  }));

  return {
    EditorState: {
      create: jest.fn().mockReturnValue({ _tag: 'editorState' }),
      readOnly: { of: jest.fn().mockReturnValue({ _tag: 'ext' }) },
    },
    Compartment: MockCompartment,
  };
});

jest.mock('@codemirror/lang-json', () => ({
  json: jest.fn().mockReturnValue({ _tag: 'ext' }),
  jsonParseLinter: jest.fn().mockReturnValue(() => []),
}));

jest.mock('@codemirror/lint', () => ({
  linter: jest.fn().mockReturnValue({ _tag: 'ext' }),
  lintGutter: jest.fn().mockReturnValue({ _tag: 'ext' }),
}));

jest.mock('@codemirror/commands', () => ({
  defaultKeymap: [],
}));

// ─── Angular & Component ─────────────────────────────────────────────────────
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditorView } from '@codemirror/view';
import { HmJsonEditorComponent } from './hm-json-editor.component';

// Typed alias for the mock constructor
type MockEditorViewInstance = {
  state: { doc: { toString: jest.Mock } };
  dispatch: jest.Mock;
  destroy: jest.Mock;
};
const MockEditorView = EditorView as unknown as {
  new (...args: unknown[]): MockEditorViewInstance;
  _capturedUpdateListener: ((update: Record<string, unknown>) => void) | undefined;
  mock: {
    instances: MockEditorViewInstance[];
    results: Array<{ type: string; value: MockEditorViewInstance }>;
  };
} & jest.Mock;

/** afterNextRender sırasında yaratılan EditorView instance'ını döndürür. */
function getEditorViewMockInstance(): MockEditorViewInstance | undefined {
  return MockEditorView.mock?.results?.[0]?.value as MockEditorViewInstance | undefined;
}

// ─── Test Host Wrapper ────────────────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [HmJsonEditorComponent],
  template: `<hm-json-editor
    [value]="value"
    [isReadOnly]="readOnly"
    (valueChange)="onValueChange($event)"
    (jsonValidityChange)="onJsonValidityChange($event)"
  />`,
})
class TestHostComponent {
  value = '{}';
  readOnly = false;
  lastEmitted: string | null = null;
  lastValidity: boolean | null = null;
  onValueChange(v: string): void {
    this.lastEmitted = v;
  }
  onJsonValidityChange(valid: boolean): void {
    this.lastValidity = valid;
  }
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('HmJsonEditorComponent', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    // Reset all mocks between tests
    jest.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    host = hostFixture.componentInstance;
    el = hostFixture.nativeElement as HTMLElement;
    hostFixture.detectChanges(); // triggers afterNextRender → EditorView init
  });

  // ── Subtask 6.1 ─────────────────────────────────────────────────────────────
  describe('component creation (Subtask 6.1)', () => {
    it('should create the host without errors', () => {
      expect(host).toBeTruthy();
    });

    it('should render the hm-json-editor element in the DOM', () => {
      const editorEl = el.querySelector('hm-json-editor');
      expect(editorEl).not.toBeNull();
    });

    it('should render the #editorContainer div inside the component', () => {
      const container = el.querySelector('.hm-json-editor-host');
      expect(container).not.toBeNull();
    });
  });

  // ── Subtask 6.2 ─────────────────────────────────────────────────────────────
  describe('readonly input (Subtask 6.2, AC: #2)', () => {
    it('should set aria-readonly="false" when readonly is false', () => {
      host.readOnly = false;
      hostFixture.detectChanges();
      const container = el.querySelector('[aria-readonly]');
      expect(container?.getAttribute('aria-readonly')).toBe('false');
    });

    it('should set aria-readonly="true" when readonly is true', () => {
      host.readOnly = true;
      hostFixture.detectChanges();
      const container = el.querySelector('[aria-readonly]');
      expect(container?.getAttribute('aria-readonly')).toBe('true');
    });

    it('should dispatch compartment reconfiguration when readonly changes post-init (AC: #2, Task 4)', () => {
      // Get the created EditorView instance (created during afterNextRender)
      const editorViewInstance = getEditorViewMockInstance();
      expect(editorViewInstance).toBeDefined(); // H2: enforce EditorView was initialized — no silent skips
      if (!editorViewInstance) return;

      // Clear call history but keep the mock functions callable
      editorViewInstance.dispatch.mockClear();

      host.readOnly = true;
      hostFixture.detectChanges(); // triggers effect for readonly

      // dispatch should have been called with compartment reconfigure effects
      expect(editorViewInstance.dispatch).toHaveBeenCalled();
    });
  });

  // ── Subtask 6.3 ─────────────────────────────────────────────────────────────
  describe('value input programmatic update (Subtask 6.3, AC: #6)', () => {
    it('should call EditorView.dispatch when value input changes externally', () => {
      const editorViewInstance = getEditorViewMockInstance();
      expect(editorViewInstance).toBeDefined();
      if (!editorViewInstance) return;

      // Simulate current editor content is '{}'
      editorViewInstance.state.doc.toString.mockReturnValue('{}');
      editorViewInstance.dispatch.mockClear();

      host.value = '{"key": "value"}';
      hostFixture.detectChanges(); // triggers value effect

      expect(editorViewInstance.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.objectContaining({
            insert: '{"key": "value"}',
          }),
        }),
      );
    });

    it('should NOT dispatch when value input equals current editor content', () => {
      const editorViewInstance = getEditorViewMockInstance();
      expect(editorViewInstance).toBeDefined();
      if (!editorViewInstance) return;

      editorViewInstance.state.doc.toString.mockReturnValue('{}');
      editorViewInstance.dispatch.mockClear();

      host.value = '{}'; // same as current mock content
      hostFixture.detectChanges();

      expect(editorViewInstance.dispatch).not.toHaveBeenCalled();
    });
  });

  // ── Subtask 6.4 ─────────────────────────────────────────────────────────────
  describe('valueChange output — JSON validation (Subtask 6.4, AC: #3)', () => {
    const getCapturedListener = () =>
      (MockEditorView as unknown as Record<string, unknown>)['_capturedUpdateListener'] as
        | ((u: Record<string, unknown>) => void)
        | undefined;

    it('should emit valueChange for valid JSON via updateListener', () => {
      const editorViewInstance = getEditorViewMockInstance();
      expect(editorViewInstance).toBeDefined();
      if (!editorViewInstance) return;

      // Retrieve the captured updateListener
      const updateListener = getCapturedListener();
      expect(updateListener).toBeDefined();
      if (!updateListener) return;

      const validJson = '{"foo": 1}';

      // Trigger the listener simulating a doc change with valid JSON
      updateListener({
        docChanged: true,
        state: {
          doc: { toString: () => validJson },
        },
      });

      expect(host.lastEmitted).toBe(validJson);
    });

    it('should NOT emit valueChange for invalid JSON via updateListener', () => {
      const editorViewInstance = getEditorViewMockInstance();
      expect(editorViewInstance).toBeDefined();
      if (!editorViewInstance) return;

      const updateListener = getCapturedListener();
      expect(updateListener).toBeDefined();
      if (!updateListener) return;

      host.lastEmitted = null; // reset

      updateListener({
        docChanged: true,
        state: {
          doc: { toString: () => '{invalid json' },
        },
      });

      expect(host.lastEmitted).toBeNull();
    });

    it('should NOT emit valueChange when doc has not changed', () => {
      const updateListener = getCapturedListener();
      expect(updateListener).toBeDefined();
      if (!updateListener) return;

      host.lastEmitted = null;

      updateListener({ docChanged: false, state: { doc: { toString: () => '{}' } } });

      expect(host.lastEmitted).toBeNull();
    });
  });

  // ── jsonValidityChange output ──────────────────────────────────────────────
  describe('jsonValidityChange output', () => {
    const getCapturedListener2 = () =>
      (MockEditorView as unknown as Record<string, unknown>)['_capturedUpdateListener'] as
        | ((u: Record<string, unknown>) => void)
        | undefined;

    it('should emit true for valid JSON', () => {
      const updateListener = getCapturedListener2();
      expect(updateListener).toBeDefined();
      if (!updateListener) return;

      host.lastValidity = null;

      updateListener({
        docChanged: true,
        state: { doc: { toString: () => '{"valid": true}' } },
      });

      expect(host.lastValidity).toBe(true);
    });

    it('should emit false for invalid JSON', () => {
      const updateListener = getCapturedListener2();
      expect(updateListener).toBeDefined();
      if (!updateListener) return;

      host.lastValidity = null;

      updateListener({
        docChanged: true,
        state: { doc: { toString: () => '{invalid' } },
      });

      expect(host.lastValidity).toBe(false);
    });

    it('should NOT emit when doc has not changed', () => {
      const updateListener = getCapturedListener2();
      expect(updateListener).toBeDefined();
      if (!updateListener) return;

      host.lastValidity = null;

      updateListener({ docChanged: false, state: { doc: { toString: () => '{}' } } });

      expect(host.lastValidity).toBeNull();
    });
  });

  // ── Subtask 6.5 ─────────────────────────────────────────────────────────────
  describe('cleanup on destroy (Subtask 6.5, AC: #7)', () => {
    it('should call editorView.destroy() when component is destroyed', () => {
      const editorViewInstance = getEditorViewMockInstance();
      expect(editorViewInstance).toBeDefined();
      if (!editorViewInstance) return;

      hostFixture.destroy(); // triggers DestroyRef.onDestroy callback

      expect(editorViewInstance.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
