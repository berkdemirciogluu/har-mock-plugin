import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'hm-tab-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex border-b border-slate-200" role="tablist">
      <button
        role="tab"
        [attr.aria-selected]="activeTab() === 'controls'"
        [class]="
          activeTab() === 'controls'
            ? 'border-b-2 border-indigo-500 text-indigo-600 font-medium'
            : 'text-slate-500 hover:text-slate-700'
        "
        class="flex-1 py-2 text-sm text-center cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
        (click)="tabChange.emit('controls')"
      >
        Controls
      </button>
      <button
        role="tab"
        [attr.aria-selected]="activeTab() === 'monitor'"
        [class]="
          activeTab() === 'monitor'
            ? 'border-b-2 border-indigo-500 text-indigo-600 font-medium'
            : 'text-slate-500 hover:text-slate-700'
        "
        class="flex-1 py-2 text-sm text-center cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
        (click)="tabChange.emit('monitor')"
      >
        Monitor
      </button>
    </div>
  `,
})
export class TabBarComponent {
  readonly activeTab = input<'controls' | 'monitor'>('controls');
  readonly tabChange = output<'controls' | 'monitor'>();
}
