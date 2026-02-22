import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'hm-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  imports: [],
})
export class AppComponent {
  // constructor injection YASAK — inject() kullanılır
  // @Input()/@Output() YASAK — input()/output() signal kullanılır
}
