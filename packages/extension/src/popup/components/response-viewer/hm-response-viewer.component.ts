import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';
import { HmJsonEditorComponent } from '../json-editor/hm-json-editor.component';
import { MessageType } from '../../../shared/messaging.types';
import type { HarEntry } from '@har-mock/core';
import type { EditedResponse, MatchEvent } from '../../../shared/state.types';
import type { UpdateResponsePayload } from '../../../shared/payload.types';

@Component({
  selector: 'hm-response-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HmJsonEditorComponent],
  templateUrl: './hm-response-viewer.component.html',
})
export class HmResponseViewerComponent {
  // Signal-based input
  readonly event = input<MatchEvent | null>(null);

  // Services
  private readonly messaging = inject(ExtensionMessagingService);

  // Edit state signals
  readonly isDirty = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly showSuccess = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Tracked edited body (updated on valueChange)
  private editedBody = signal<string>('');

  /** Computed: resolved response body — priority: editedResponses → harData entries → '{}' */
  readonly resolvedBody = computed<string>(() => {
    const ev = this.event();
    if (!ev || ev.source === 'passthrough') return '';

    const state = this.messaging.state();
    const key = `${ev.method.toUpperCase()}:${ev.url}`;

    // 1. editedResponses (en güncel düzenleme)
    const edited = state?.editedResponses[key];
    if (edited !== undefined) return edited.body;

    // 2. HAR entries üzerinden URL+method eşleşmesi
    const harData = state?.harData;
    if (harData) {
      const entry = harData.entries.find(
        (e: HarEntry) => e.url === ev.url && e.method.toUpperCase() === ev.method.toUpperCase(),
      );
      if (entry) return entry.responseBody;
    }

    // 3. Fallback
    return '{}';
  });

  /** Computed: resolved response headers — for persist alongside body */
  readonly resolvedHeaders = computed(() => {
    const ev = this.event();
    if (!ev || ev.source === 'passthrough') return [];

    const state = this.messaging.state();
    const key = `${ev.method.toUpperCase()}:${ev.url}`;

    const edited = state?.editedResponses[key];
    if (edited !== undefined) return edited.headers;

    const entry = state?.harData?.entries.find(
      (e: HarEntry) => e.url === ev.url && e.method.toUpperCase() === ev.method.toUpperCase(),
    );
    return entry?.responseHeaders ?? [];
  });

  /** Called when the JSON editor value changes */
  onBodyEdit(newBody: string): void {
    this.editedBody.set(newBody);
    this.isDirty.set(true);
    this.errorMessage.set(null);
  }

  /** Sends UPDATE_RESPONSE message to background SW */
  saveResponse(): void {
    const ev = this.event();
    if (!ev || ev.source === 'passthrough') return;

    const key = `${ev.method.toUpperCase()}:${ev.url}`;
    const response: EditedResponse = {
      url: ev.url,
      method: ev.method.toUpperCase(),
      body: this.editedBody(),
      headers: this.resolvedHeaders(),
      statusCode: ev.statusCode ?? 200,
    };

    const payload: UpdateResponsePayload = { key, response };

    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.messaging
      .sendMessage<UpdateResponsePayload>(MessageType.UPDATE_RESPONSE, payload, crypto.randomUUID())
      .then(() => {
        this.isSaving.set(false);
        this.isDirty.set(false);
        this.showSuccess.set(true);
        setTimeout(() => this.showSuccess.set(false), 2000);
      })
      .catch((err: unknown) => {
        this.isSaving.set(false);
        const msg = err instanceof Error ? err.message : 'Kaydetme başarısız oldu';
        this.errorMessage.set(msg);
        console.error('saveResponse failed:', err);
      });
  }
}
