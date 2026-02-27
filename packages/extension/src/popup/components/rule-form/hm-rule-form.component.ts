import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import type { MockRule } from '@har-mock/core';
import { HmJsonEditorComponent } from '../json-editor/hm-json-editor.component';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

@Component({
  selector: 'hm-rule-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hm-rule-form.component.html',
  imports: [HmJsonEditorComponent],
})
export class HmRuleFormComponent {
  // Signal-based output (Subtask 1.2)
  readonly ruleCreated = output<MockRule>();

  // Exposed constants for template
  readonly httpMethods = HTTP_METHODS;

  // Form state signals (Subtask 1.3)
  readonly urlPattern = signal<string>('');
  readonly method = signal<string>('GET');
  readonly statusCode = signal<number>(200);
  readonly responseBody = signal<string>('{\n  \n}');
  readonly delay = signal<number>(0);
  readonly showForm = signal<boolean>(false);

  // Validation signals (Subtask 1.4)
  readonly urlPatternError = signal<string>('');
  readonly statusCodeError = signal<string>('');
  readonly jsonValid = signal<boolean>(true);

  // onSave metodu (Subtask 1.5)
  onSave(): void {
    // URL pattern boş kontrolü
    if (!this.urlPattern().trim()) {
      this.urlPatternError.set('URL pattern zorunludur');
      return;
    }

    // Status code aralık kontrolü
    const code = this.statusCode();
    if (code < 100 || code > 599) {
      this.statusCodeError.set('Status code 100-599 arasında olmalıdır');
      return;
    }

    // JSON geçersiz kontrolü
    if (!this.jsonValid()) {
      return;
    }

    const rule: MockRule = {
      id: crypto.randomUUID(),
      urlPattern: this.urlPattern().trim(),
      method: this.method(),
      statusCode: this.statusCode(),
      responseBody: this.responseBody(),
      responseHeaders: [],
      delay: this.delay(),
      enabled: true,
    };

    this.ruleCreated.emit(rule);
    this.resetForm();
  }

  // resetForm metodu (Subtask 1.6)
  resetForm(): void {
    this.urlPattern.set('');
    this.method.set('GET');
    this.statusCode.set(200);
    this.responseBody.set('{\n  \n}');
    this.delay.set(0);
    this.urlPatternError.set('');
    this.statusCodeError.set('');
    this.jsonValid.set(true);
    this.showForm.set(false);
  }

  // onResponseBodyChange handler (Subtask 1.7)
  onResponseBodyChange(value: string): void {
    this.responseBody.set(value);
    this.jsonValid.set(true);
  }

  // URL pattern input handler — validation error'ı temizle
  onUrlPatternInput(event: Event): void {
    this.urlPattern.set((event.target as HTMLInputElement).value);
    this.urlPatternError.set('');
  }

  // Method change handler
  onMethodChange(event: Event): void {
    this.method.set((event.target as HTMLSelectElement).value);
  }

  // Status code change handler
  onStatusCodeChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.statusCode.set(isNaN(val) ? 200 : val);
    this.statusCodeError.set('');
  }

  // Delay change handler
  onDelayChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.delay.set(isNaN(val) ? 0 : val);
  }

  // Form submit handler — Enter tuşu desteği
  onSubmit(event: Event): void {
    event.preventDefault();
    this.onSave();
  }
}
