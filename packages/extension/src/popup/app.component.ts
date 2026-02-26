import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TabBarComponent } from './components/tab-bar/tab-bar.component';
import { ControlsTabComponent } from './components/controls-tab/controls-tab.component';
import { MonitorTabComponent } from './components/monitor-tab/monitor-tab.component';
import { ExtensionMessagingService } from './services/extension-messaging.service';

@Component({
  selector: 'hm-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TabBarComponent, ControlsTabComponent, MonitorTabComponent],
  template: `
    <div class="w-[400px] min-h-[500px] max-h-[600px] flex flex-col bg-white">
      <hm-tab-bar [activeTab]="activeTab()" (tabChange)="activeTab.set($event)" />
      <div class="flex-1 min-h-0 overflow-hidden">
        @if (activeTab() === 'controls') {
          <hm-controls-tab />
        }
        @if (activeTab() === 'monitor') {
          <hm-monitor-tab />
        }
      </div>
    </div>
  `,
})
export class AppComponent implements OnInit {
  private readonly messagingService = inject(ExtensionMessagingService);
  readonly activeTab = signal<'controls' | 'monitor'>('controls');

  ngOnInit(): void {
    this.messagingService.connect();
  }
}
