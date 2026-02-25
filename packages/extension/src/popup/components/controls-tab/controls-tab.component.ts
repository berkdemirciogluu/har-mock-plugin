import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AccordionComponent } from '../accordion/accordion.component';
import { HarUploadComponent } from '../har-upload/hm-har-upload.component';

@Component({
  selector: 'hm-controls-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccordionComponent, HarUploadComponent],
  template: `
    <div class="space-y-2 p-2">
      <hm-accordion
        title="HAR"
        [expanded]="true"
        persistKey="har"
        [badge]="endpointCount() !== null ? endpointCount()!.toString() : ''"
        [badgeVariant]="endpointCount() !== null ? 'success' : 'default'"
      >
        <hm-har-upload (onEndpointLoaded)="endpointCount.set($event)" />
      </hm-accordion>

      <hm-accordion
        title="Rules"
        [expanded]="false"
        persistKey="rules"
        badge="0"
        badgeVariant="default"
      >
        <p class="text-xs text-slate-400">Rule yönetimi (Story 4.1)</p>
      </hm-accordion>

      <hm-accordion title="Settings" [expanded]="false" persistKey="settings">
        <p class="text-xs text-slate-400">Extension ayarları (Story 2.5)</p>
      </hm-accordion>
    </div>
  `,
})
export class ControlsTabComponent {
  readonly endpointCount = signal<number | null>(null);
}
