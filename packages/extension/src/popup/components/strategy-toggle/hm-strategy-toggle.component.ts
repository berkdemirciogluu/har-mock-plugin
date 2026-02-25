import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type ReplayMode = 'sequential' | 'last-match';

@Component({
  selector: 'hm-strategy-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex rounded overflow-hidden border border-slate-200"
      role="group"
      aria-label="Replay mode seçimi"
    >
      <button
        type="button"
        class="flex-1 px-3 py-1.5 text-xs font-medium transition-colors"
        [class]="
          replayMode() === 'sequential'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        "
        [attr.aria-checked]="replayMode() === 'sequential'"
        role="radio"
        (click)="select('sequential')"
      >
        Sequential
      </button>
      <button
        type="button"
        class="flex-1 px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-200"
        [class]="
          replayMode() === 'last-match'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        "
        [attr.aria-checked]="replayMode() === 'last-match'"
        role="radio"
        (click)="select('last-match')"
      >
        Last-Match
      </button>
    </div>
  `,
})
export class StrategyToggleComponent {
  readonly replayMode = input<ReplayMode>('last-match');
  readonly modeChange = output<ReplayMode>();

  select(mode: ReplayMode): void {
    if (mode !== this.replayMode()) {
      this.modeChange.emit(mode);
    }
  }
}
