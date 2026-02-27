import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type ReplayMode = 'sequential' | 'last-match';

@Component({
  selector: 'hm-strategy-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex rounded overflow-hidden border border-slate-200"
      role="radiogroup"
      aria-label="Replay mode seçimi"
    >
      <button
        type="button"
        class="flex-1 px-3 py-1.5 text-xs font-medium transition-colors"
        [class.bg-indigo-600]="replayMode() === 'sequential'"
        [class.text-white]="replayMode() === 'sequential'"
        [class.bg-slate-100]="replayMode() !== 'sequential'"
        [class.text-slate-600]="replayMode() !== 'sequential'"
        [attr.aria-checked]="replayMode() === 'sequential'"
        role="radio"
        (click)="select('sequential')"
      >
        Sequential
      </button>
      <button
        type="button"
        class="flex-1 px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-200"
        [class.bg-indigo-600]="replayMode() === 'last-match'"
        [class.text-white]="replayMode() === 'last-match'"
        [class.bg-slate-100]="replayMode() !== 'last-match'"
        [class.text-slate-600]="replayMode() !== 'last-match'"
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
