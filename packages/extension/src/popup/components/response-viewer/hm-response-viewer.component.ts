import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';
import { HmJsonEditorComponent } from '../json-editor/hm-json-editor.component';
import { MessageType } from '../../../shared/messaging.types';
import type { HarEntry, HarHeader } from '@har-mock/core';
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
  private readonly destroyRef = inject(DestroyRef);

  // Edit state signals
  readonly isDirty = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly showSuccess = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Tracked edited body (updated on valueChange)
  private readonly editedBody = signal<string>('');

  // setTimeout tracking for cleanup (L5)
  private successTimerId: ReturnType<typeof setTimeout> | null = null;

  /** Shared computed: event key + entry lookup — avoids duplication in resolvedBody/resolvedHeaders (L3) */
  private readonly eventLookup = computed<{
    readonly key: string;
    readonly body: string;
    readonly headers: readonly HarHeader[];
  } | null>(() => {
    const ev = this.event();
    if (!ev || ev.source === 'passthrough') return null;

    const state = this.messaging.state();
    const key = `${ev.method.toUpperCase()}:${ev.url}`;

    // 1. editedResponses (en güncel düzenleme)
    const edited = state?.editedResponses[key];
    if (edited !== undefined) return { key, body: edited.body, headers: edited.headers };

    // 2. HAR entries üzerinden URL+method eşleşmesi
    const entry = state?.harData?.entries.find(
      (e: HarEntry) => e.url === ev.url && e.method.toUpperCase() === ev.method.toUpperCase(),
    );
    if (entry) return { key, body: entry.responseBody, headers: entry.responseHeaders };

    // 3. Fallback
    return { key, body: '{}', headers: [] as readonly HarHeader[] };
  });

  /** Computed: resolved response body — priority: editedResponses → harData entries → '{}' */
  readonly resolvedBody = computed<string>(() => this.eventLookup()?.body ?? '');

  /** Computed: resolved response headers — for persist alongside body */
  readonly resolvedHeaders = computed(() => this.eventLookup()?.headers ?? []);

  constructor() {
    // H1: Reset transient state when selected event changes
    effect(() => {
      this.event(); // track the event signal
      untracked(() => {
        this.isDirty.set(false);
        this.editedBody.set('');
        this.showSuccess.set(false);
        this.errorMessage.set(null);
      });
    });

    // L5: Cleanup setTimeout on destroy
    this.destroyRef.onDestroy(() => {
      if (this.successTimerId !== null) {
        clearTimeout(this.successTimerId);
      }
    });
  }

  /** Called when the JSON editor value changes */
  onBodyEdit(newBody: string): void {
    this.editedBody.set(newBody);
    // M1: Don't mark dirty if value matches resolved body (programmatic update from event switch)
    this.isDirty.set(newBody !== this.resolvedBody());
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
        if (this.successTimerId !== null) {
          clearTimeout(this.successTimerId);
        }
        this.successTimerId = setTimeout(() => {
          this.showSuccess.set(false);
          this.successTimerId = null;
        }, 2000);
      })
      .catch((err: unknown) => {
        this.isSaving.set(false);
        const msg = err instanceof Error ? err.message : 'Save failed';
        this.errorMessage.set(msg);
        console.error('saveResponse failed:', err);
      });
  }
}
