import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnChanges,
  signal,
} from '@angular/core';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';
import { MessageType } from '../../../shared/messaging.types';
import type { StorageEntry } from '../../../shared/state.types';

type StorageType = 'localStorage' | 'sessionStorage';

@Component({
  selector: 'hm-storage-inject',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <!-- Mevcut entries listesi -->
      @if (localEntries().length === 0) {
        <p class="text-xs text-slate-400 italic">Inject edilecek kayıt yok.</p>
      } @else {
        <ul class="space-y-1">
          @for (entry of localEntries(); track $index) {
            <li class="flex items-center gap-2 rounded bg-slate-50 px-2 py-1.5 text-xs">
              <span
                class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                [class]="
                  entry.type === 'localStorage'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-violet-100 text-violet-700'
                "
              >
                {{ entry.type === 'localStorage' ? 'LS' : 'SS' }}
              </span>
              <span class="min-w-0 flex-1 truncate font-mono font-medium text-slate-700">{{
                entry.key
              }}</span>
              <span class="text-slate-400">=</span>
              <span class="min-w-0 flex-1 truncate font-mono text-slate-500">{{
                entry.value
              }}</span>
              <button
                type="button"
                class="ml-1 shrink-0 rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-1 focus:ring-red-400"
                [attr.aria-label]="'Sil: ' + entry.key"
                (click)="removeEntry($index)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </li>
          }
        </ul>
      }

      <!-- Yeni kayıt formu -->
      <div class="space-y-1.5">
        <!-- Type toggle -->
        <div class="flex rounded border border-slate-200 overflow-hidden text-xs">
          <button
            type="button"
            class="flex-1 py-1 font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-indigo-400"
            [class]="
              newType() === 'localStorage'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            "
            (click)="newType.set('localStorage')"
          >
            localStorage
          </button>
          <button
            type="button"
            class="flex-1 py-1 font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-indigo-400"
            [class]="
              newType() === 'sessionStorage'
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            "
            (click)="newType.set('sessionStorage')"
          >
            sessionStorage
          </button>
        </div>

        <!-- Key input -->
        <input
          type="text"
          class="w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          placeholder="key"
          aria-label="Storage key"
          [value]="newKey()"
          (input)="newKey.set(getInputValue($event)); keyError.set(false)"
        />

        <!-- Value input -->
        <input
          type="text"
          class="w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          placeholder="value (string, JSON, vb.)"
          aria-label="Storage value"
          [value]="newValue()"
          (input)="newValue.set(getInputValue($event))"
        />

        @if (keyError()) {
          <p class="text-xs text-red-500">Key boş olamaz.</p>
        }

        <!-- Add butonu -->
        <button
          type="button"
          class="w-full rounded border border-slate-200 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          (click)="addEntry()"
        >
          + Ekle
        </button>
      </div>

      <!-- Save butonu -->
      <button
        type="button"
        class="w-full rounded bg-indigo-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50"
        [disabled]="saving()"
        (click)="save()"
      >
        {{
          saving()
            ? 'Kaydediliyor…'
            : localEntries().length === 0
              ? 'Tümünü Kaldır & Uygula'
              : 'Kaydet & Inject Et'
        }}
      </button>

      @if (saveError()) {
        <p class="text-xs text-red-500">{{ saveError() }}</p>
      }
    </div>
  `,
})
export class StorageInjectComponent implements OnChanges {
  private readonly messaging = inject(ExtensionMessagingService);

  /** STATE_SYNC'ten gelen persist edilmiş entries (initial value) */
  readonly entries = input<readonly StorageEntry[]>([]);

  /** Local mutable kopya — kullanıcı düzenlemeleri burada tutulur */
  readonly localEntries = signal<StorageEntry[]>([]);

  readonly newKey = signal('');
  readonly newValue = signal('');
  readonly newType = signal<StorageType>('localStorage');
  readonly keyError = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  /** F4: Kullanıcı entry ekledi/sildi ama henüz kaydetmedi — incoming STATE_SYNC localEntries'i ezmesin */
  private readonly dirty = signal(false);

  ngOnChanges(): void {
    // input() değiştiğinde local kopya güncellenir — ancak kullanıcı unsaved değişiklik yaptıysa ezilmez
    if (!this.dirty()) {
      this.localEntries.set([...this.entries()]);
    }
  }

  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  addEntry(): void {
    const key = this.newKey().trim();
    if (!key) {
      this.keyError.set(true);
      return;
    }
    this.keyError.set(false);
    this.localEntries.update((prev) => [
      ...prev,
      { key, value: this.newValue(), type: this.newType() },
    ]);
    this.newKey.set('');
    this.newValue.set('');
    // F10: newType kasıtlı olarak sıfırlanmaz — kullanıcı genellikle aynı tipte art arda entry ekler
    this.dirty.set(true);
  }

  removeEntry(index: number): void {
    this.localEntries.update((prev) => prev.filter((_, i) => i !== index));
    this.dirty.set(true);
  }

  save(): void {
    this.saving.set(true);
    this.saveError.set('');

    this.messaging
      .sendMessage(
        MessageType.UPDATE_STORAGE_ENTRIES,
        { entries: this.localEntries() },
        crypto.randomUUID(),
      )
      .then(() => {
        this.saving.set(false);
        this.dirty.set(false); // Kayıt başarılı — incoming STATE_SYNC kabul edilebilir
      })
      .catch((err: unknown) => {
        this.saving.set(false);
        this.saveError.set(err instanceof Error ? err.message : 'Kaydetme başarısız.');
      });
  }
}
