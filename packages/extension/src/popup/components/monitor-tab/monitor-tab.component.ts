import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'hm-monitor-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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
  `,
})
export class MonitorTabComponent {}
