import { ChangeDetectionStrategy, Component, input, output, signal, computed } from '@angular/core';

type ValidationError = 'empty' | 'duplicate' | null;

@Component({
  selector: 'hm-exclude-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hm-exclude-list.component.html',
})
export class HmExcludeListComponent {
  readonly excludeList = input<readonly string[]>([]);
  readonly excludeListChange = output<readonly string[]>();
  readonly placeholder = input<string>('URL pattern (e.g. /api/auth)');
  readonly emptyMessage = input<string>(
    'Exclude list is empty. All matching endpoints are being mocked.',
  );
  readonly inputAriaLabel = input<string>('Enter new exclude pattern');

  readonly newPattern = signal<string>('');
  readonly validationError = signal<ValidationError>(null);

  readonly errorMessage = computed<string>(() => {
    const err = this.validationError();
    if (err === 'empty') return 'URL pattern is required';
    if (err === 'duplicate') return 'This pattern is already in the list';
    return '';
  });

  onNewPatternInput(event: Event): void {
    this.newPattern.set((event.target as HTMLInputElement).value);
    this.validationError.set(null);
  }

  addPattern(): void {
    const pattern = this.newPattern().trim();

    if (!pattern) {
      this.validationError.set('empty');
      return;
    }

    if (this.excludeList().includes(pattern)) {
      this.validationError.set('duplicate');
      return;
    }

    this.validationError.set(null);
    this.excludeListChange.emit([...this.excludeList(), pattern]);
    this.newPattern.set('');
  }

  removePattern(index: number): void {
    this.validationError.set(null);
    const updated = this.excludeList().filter((_, i) => i !== index);
    this.excludeListChange.emit(updated);
  }
}
