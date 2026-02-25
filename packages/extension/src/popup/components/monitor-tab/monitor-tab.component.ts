import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';

@Component({
  selector: 'hm-monitor-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      <div class="overflow-y-auto divide-y divide-slate-100">
        @for (event of matchHistory(); track event.id) {
          <div class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors">
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
}
