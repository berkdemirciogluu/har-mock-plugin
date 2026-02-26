import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { Compartment, EditorState } from '@codemirror/state';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { defaultKeymap } from '@codemirror/commands';

@Component({
  selector: 'hm-json-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hm-json-editor.component.html',
  imports: [],
})
export class HmJsonEditorComponent {
  // Signal-based inputs (AC: #5)
  readonly value = input<string>('');
  readonly readonly = input<boolean>(false);

  // Signal-based output (AC: #5)
  readonly valueChange = output<string>();

  // ViewChild signal reference to editor container DOM element (AC: #5)
  private readonly editorContainer = viewChild<ElementRef<HTMLElement>>('editorContainer');

  // DestroyRef for cleanup (AC: #7)
  private readonly destroyRef = inject(DestroyRef);

  // Runtime-configurable Compartments for readonly/editable state updates
  private readonly editableCompartment = new Compartment();
  private readonly themeCompartment = new Compartment();

  // EditorView instance — null until afterNextRender initializes it
  private editorView: EditorView | null = null;

  constructor() {
    // Register cleanup before EditorView is created — safe to register in constructor (AC: #7)
    this.destroyRef.onDestroy(() => {
      this.editorView?.destroy();
      this.editorView = null;
    });

    // Initialize EditorView after first render when DOM is ready (AC: #1, #2)
    afterNextRender(() => {
      const container = this.editorContainer()?.nativeElement;
      if (!container || this.editorView) return;

      this.editorView = new EditorView({
        state: this.createEditorState(),
        parent: container,
      });
    });

    // Effect: update EditorView content when `value` input changes programmatically (AC: #6)
    effect(() => {
      const newValue = this.value();
      if (!this.editorView) return;

      const currentValue = this.editorView.state.doc.toString();
      if (currentValue === newValue) return; // avoid unnecessary dispatch

      this.editorView.dispatch({
        changes: { from: 0, to: currentValue.length, insert: newValue },
      });
    });

    // Effect: update readonly/editable compartments when `readonly` input changes (AC: #2, Task 4)
    effect(() => {
      const isReadOnly = this.readonly();
      if (!this.editorView) return;

      this.editorView.dispatch({
        effects: [
          this.editableCompartment.reconfigure([
            EditorState.readOnly.of(isReadOnly),
            EditorView.editable.of(!isReadOnly),
          ]),
          this.themeCompartment.reconfigure(this.buildTheme(isReadOnly)),
        ],
      });
    });
  }

  /** Builds the CodeMirror EditorState with all required extensions. */
  private createEditorState(): EditorState {
    const isReadOnly = this.readonly();

    return EditorState.create({
      doc: this.value(),
      extensions: [
        json(),
        linter(jsonParseLinter()),
        lintGutter(),
        lineNumbers(),
        keymap.of(defaultKeymap),
        // Compartment: controls editable/readonly — reconfigured via effect()
        this.editableCompartment.of([
          EditorState.readOnly.of(isReadOnly),
          EditorView.editable.of(!isReadOnly),
        ]),
        // Compartment: controls theme (including cursor visibility)
        this.themeCompartment.of(this.buildTheme(isReadOnly)),
        // Listener: emit valueChange only for valid JSON (AC: #3)
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const content = update.state.doc.toString();
          try {
            JSON.parse(content);
            this.valueChange.emit(content);
          } catch {
            // Invalid JSON — do not emit (AC: #3)
          }
        }),
      ],
    });
  }

  /** Builds the Editor theme — cursor hidden in read-only mode (AC: #2, Subtask 4.2). */
  private buildTheme(isReadOnly: boolean): ReturnType<typeof EditorView.theme> {
    return EditorView.theme({
      '&': { fontSize: '12px', height: '200px', border: '1px solid #e2e8f0', borderRadius: '4px' },
      '.cm-scroller': { overflow: 'auto', fontFamily: 'monospace' },
      '.cm-cursor': { display: isReadOnly ? 'none' : 'block' },
    });
  }
}
