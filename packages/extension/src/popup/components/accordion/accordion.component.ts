import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';

@Component({
  selector: 'hm-accordion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border border-slate-200 rounded-md overflow-hidden">
      <button
        class="flex items-center justify-between w-full h-10 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
        role="button"
        [attr.aria-expanded]="isExpanded()"
        [attr.aria-controls]="bodyId()"
        [attr.id]="headerId()"
        (click)="onToggle()"
      >
        <span class="flex items-center gap-2">
          <span>{{ title() }}</span>
          @if (badge()) {
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              [class]="badgeClasses()"
            >
              {{ badge() }}
            </span>
          }
        </span>
        <svg
          class="h-4 w-4 text-slate-400 transition-transform duration-200 ease-in-out"
          [class.rotate-90]="isExpanded()"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
      <div
        role="region"
        [attr.id]="bodyId()"
        [attr.aria-labelledby]="headerId()"
        class="overflow-hidden transition-all duration-200 ease-in-out"
        [style.max-height]="isExpanded() ? '500px' : '0px'"
      >
        <div class="px-3 py-2 text-sm text-slate-600">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class AccordionComponent {
  private static nextId = 0;

  readonly title = input.required<string>();
  readonly badge = input<string>();
  readonly badgeVariant = input<'emerald' | 'blue' | 'default'>('default');
  readonly expanded = input<boolean>(false);
  readonly persistKey = input<string>();
  readonly toggle = output<boolean>();

  private readonly instanceId = AccordionComponent.nextId++;
  readonly headerId = computed(() => `accordion-header-${this.instanceId}`);
  readonly bodyId = computed(() => `accordion-body-${this.instanceId}`);

  readonly isExpanded = signal(false);
  private initialized = false;

  readonly badgeClasses = computed(() => {
    switch (this.badgeVariant()) {
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800';
      case 'blue':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  });

  constructor() {
    // Initialize from persisted state or input — runs only once
    effect(
      () => {
        const key = this.persistKey();
        const expandedInput = this.expanded();
        if (this.initialized) {
          return;
        }
        this.initialized = true;
        if (key) {
          const stored = localStorage.getItem(`hm-accordion-${key}`);
          if (stored !== null) {
            this.isExpanded.set(stored === 'true');
            return;
          }
        }
        this.isExpanded.set(expandedInput);
      },
      { allowSignalWrites: true },
    );
  }

  onToggle(): void {
    const next = !this.isExpanded();
    this.isExpanded.set(next);
    this.toggle.emit(next);

    const key = this.persistKey();
    if (key) {
      localStorage.setItem(`hm-accordion-${key}`, String(next));
    }
  }
}
