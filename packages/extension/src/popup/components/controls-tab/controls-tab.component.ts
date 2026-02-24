import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AccordionComponent } from '../accordion/accordion.component';

@Component({
  selector: 'hm-controls-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccordionComponent],
  template: `
    <div class="space-y-2 p-2">
      <hm-accordion title="HAR" [expanded]="true" persistKey="har" badge="0" badgeVariant="default">
        <p class="text-xs text-slate-400">HAR dosyası yükleme alanı (Story 2.3)</p>
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
export class ControlsTabComponent {}
