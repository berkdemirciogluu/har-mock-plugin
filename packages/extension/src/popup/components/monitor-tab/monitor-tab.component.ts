import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';
import { MatchEvent } from '../../../shared/state.types';
import { MessageType } from '../../../shared/messaging.types';
import { formatRelativeTime } from '../../utils/format-relative-time';

@Component({
  selector: 'hm-monitor-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col flex-1 min-h-0' },
  template: `
    @if (matchHistory().length === 0) {
      <div class="flex flex-col items-center justify-center p-8 text-center">
        <svg
          class="h-12 w-12 text-slate-300 mb-3"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <p class="text-sm text-slate-500">Henüz intercept edilmiş request yok.</p>
        <p class="text-xs text-slate-400 mt-1">Sayfayı yenileyip bir istek başlatın.</p>
      </div>
    } @else {
      <!-- Feed Header: count + clear button -->
      <div
        class="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 bg-slate-50/50 shrink-0"
      >
        <span class="text-[10px] text-slate-500 font-medium">
          {{ matchHistory().length }} request yakalandı
        </span>
        <button
          class="text-[10px] text-red-400 hover:text-red-600 cursor-pointer"
          (click)="clearHistory()"
        >
          Temizle
        </button>
      </div>
      <!-- Feed List -->
      <div class="flex-1 overflow-y-auto divide-y divide-slate-100" #feedContainer>
        @for (event of matchHistory(); track event.id) {
          <div
            class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors"
            [class.bg-indigo-50]="selectedEventId() === event.id"
            [class.border-l-2]="selectedEventId() === event.id"
            [class.border-indigo-500]="selectedEventId() === event.id"
            (click)="selectEvent(event)"
            data-feed-row
          >
            <!-- Method badge -->
            <span
              class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-600"
            >
              {{ event.method }}
            </span>
            <!-- URL -->
            <span class="flex-1 min-w-0 truncate text-xs text-slate-700" [title]="event.url">{{
              event.url
            }}</span>
            <!-- Status code -->
            @if (event.statusCode) {
              <span class="shrink-0 text-[10px] font-mono text-slate-400">
                {{ event.statusCode }}
              </span>
            }
            <!-- Relative timestamp -->
            <span
              class="shrink-0 text-[10px] text-slate-300 font-mono"
              [title]="toDateString(event.timestamp)"
            >
              {{ formatRelativeTime(event.timestamp) }}
            </span>
            <!-- Source badge -->
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              [class.bg-green-100]="event.source === 'rule'"
              [class.text-green-700]="event.source === 'rule'"
              [class.bg-blue-100]="event.source === 'har'"
              [class.text-blue-700]="event.source === 'har'"
              [class.bg-slate-100]="event.source === 'passthrough'"
              [class.text-slate-500]="event.source === 'passthrough'"
              [title]="
                event.source === 'rule'
                  ? 'Rule eşleşmesi'
                  : event.source === 'har'
                    ? 'HAR eşleşmesi'
                    : 'Passthrough (eşleşme yok)'
              "
            >
              @if (event.source === 'rule') {
                Rule ✓
              } @else if (event.source === 'har') {
                HAR ✓
              } @else {
                →
              }
            </span>
          </div>
        }
      </div>
    }
  `,
})
export class MonitorTabComponent {
  private readonly messaging = inject(ExtensionMessagingService);

  readonly matchHistory = computed(() => this.messaging.state()?.matchHistory ?? []);
  readonly selectedEventId = signal<string | null>(null);
  readonly eventSelected = output<MatchEvent>();

  private readonly feedContainer = viewChild<ElementRef>('feedContainer');

  constructor() {
    effect(() => {
      const history = this.matchHistory(); // signal tracked
      const container = this.feedContainer()?.nativeElement as HTMLElement | undefined;
      if (!container || history.length === 0) return;

      // Kullanıcı en üstte ise (scrollTop < threshold) auto-scroll'u koru
      const isAtTop = container.scrollTop < 10;
      if (!isAtTop) {
        // DOM update sonrası scroll pozisyonunu kompanse et
        const prevScrollTop = container.scrollTop;
        requestAnimationFrame(() => {
          const firstRow = container.querySelector('[data-feed-row]') as HTMLElement | null;
          if (firstRow) {
            container.scrollTop = prevScrollTop + firstRow.offsetHeight;
          }
        });
      }
    });
  }

  selectEvent(event: MatchEvent): void {
    this.selectedEventId.set(event.id);
    this.eventSelected.emit(event);
  }

  clearHistory(): void {
    void this.messaging.sendMessage(MessageType.CLEAR_HISTORY, {}, crypto.randomUUID());
  }

  formatRelativeTime(timestamp: number): string {
    return formatRelativeTime(timestamp);
  }

  toDateString(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
}
