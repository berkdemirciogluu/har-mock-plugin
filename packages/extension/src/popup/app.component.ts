import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'hm-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Story 2.3'te HAR yükleme UI'ı eklenecek -->
    <div class="w-popup max-w-popup p-4">
      <h1>HAR Mock Plugin</h1>
    </div>
  `,
  imports: [],
})
export class AppComponent {
  // constructor injection YASAK — inject() kullanılır
  // @Input()/@Output() YASAK — input()/output() signal kullanılır
}
