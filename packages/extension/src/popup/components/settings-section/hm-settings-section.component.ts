import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'hm-settings-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between py-1">
      <span class="text-xs font-medium text-slate-700">
        {{ extensionEnabled() ? 'Extension Aktif' : 'Extension Kapalı' }}
      </span>
      <button
        type="button"
        class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        [class]="extensionEnabled() ? 'bg-green-500' : 'bg-slate-300'"
        role="switch"
        [attr.aria-checked]="extensionEnabled()"
        [attr.aria-label]="
          extensionEnabled()
            ? 'Extension aktif, kapatmak için tıkla'
            : 'Extension kapalı, açmak için tıkla'
        "
        (click)="toggle()"
      >
        <span
          class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
          [class]="extensionEnabled() ? 'translate-x-[18px]' : 'translate-x-0.5'"
        ></span>
      </button>
    </div>
  `,
})
export class SettingsSectionComponent {
  readonly extensionEnabled = input<boolean>(true);
  readonly enabledChange = output<boolean>();

  toggle(): void {
    this.enabledChange.emit(!this.extensionEnabled());
  }
}
