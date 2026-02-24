import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TabBarComponent } from './components/tab-bar/tab-bar.component';
import { ControlsTabComponent } from './components/controls-tab/controls-tab.component';
import { MonitorTabComponent } from './components/monitor-tab/monitor-tab.component';

@Component({
  selector: 'hm-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TabBarComponent, ControlsTabComponent, MonitorTabComponent],
  template: `
    <div class="w-[400px] min-h-[500px] max-h-[600px] overflow-y-auto bg-white">
      <hm-tab-bar [activeTab]="activeTab()" (tabChange)="activeTab.set($event)" />
      @if (activeTab() === 'controls') {
        <hm-controls-tab />
      }
      @if (activeTab() === 'monitor') {
        <hm-monitor-tab />
      }
    </div>
  `,
})
export class AppComponent {
  readonly activeTab = signal<'controls' | 'monitor'>('controls');
}
