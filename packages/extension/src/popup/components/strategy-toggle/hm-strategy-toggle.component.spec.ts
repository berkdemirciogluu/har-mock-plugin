import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StrategyToggleComponent, type ReplayMode } from './hm-strategy-toggle.component';

describe('StrategyToggleComponent', () => {
  let component: StrategyToggleComponent;
  let fixture: ComponentFixture<StrategyToggleComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrategyToggleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StrategyToggleComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Default rendering', () => {
    it('should render two buttons', () => {
      const buttons = el.querySelectorAll('button');
      expect(buttons.length).toBe(2);
    });

    it('should show "Last-Match" as active by default', () => {
      const buttons = el.querySelectorAll('button');
      const lastMatchBtn = buttons[1] as HTMLButtonElement;
      expect(lastMatchBtn.textContent?.trim()).toBe('Last-Match');
      expect(lastMatchBtn.classList.contains('bg-indigo-600')).toBe(true);
    });

    it('should show "Sequential" as inactive by default', () => {
      const buttons = el.querySelectorAll('button');
      const seqBtn = buttons[0] as HTMLButtonElement;
      expect(seqBtn.classList.contains('bg-slate-100')).toBe(true);
    });

    it('should set aria-checked="true" on Last-Match by default', () => {
      const buttons = el.querySelectorAll('button');
      const lastMatchBtn = buttons[1] as HTMLButtonElement;
      expect(lastMatchBtn.getAttribute('aria-checked')).toBe('true');
    });

    it('should set aria-checked="false" on Sequential by default', () => {
      const buttons = el.querySelectorAll('button');
      const seqBtn = buttons[0] as HTMLButtonElement;
      expect(seqBtn.getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('Mode switching', () => {
    it('should emit modeChange when Sequential is clicked', () => {
      const emitted: ReplayMode[] = [];
      component.modeChange.subscribe((m: ReplayMode) => emitted.push(m));

      const buttons = el.querySelectorAll('button');
      (buttons[0] as HTMLButtonElement).click();

      expect(emitted).toEqual(['sequential']);
    });

    it('should NOT emit modeChange when Last-Match is clicked while already Last-Match', () => {
      const emitted: ReplayMode[] = [];
      component.modeChange.subscribe((m: ReplayMode) => emitted.push(m));

      const buttons = el.querySelectorAll('button');
      (buttons[1] as HTMLButtonElement).click();

      expect(emitted).toEqual([]);
    });

    it('should apply active CSS class to Sequential when replayMode input is sequential', () => {
      fixture.componentRef.setInput('replayMode', 'sequential');
      fixture.detectChanges();

      const buttons = el.querySelectorAll('button');
      const seqBtn = buttons[0] as HTMLButtonElement;
      const lastMatchBtn = buttons[1] as HTMLButtonElement;

      expect(seqBtn.classList.contains('bg-indigo-600')).toBe(true);
      expect(lastMatchBtn.classList.contains('bg-slate-100')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have role="radiogroup" on the wrapper', () => {
      const group = el.querySelector('[role="radiogroup"]');
      expect(group).toBeTruthy();
    });

    it('should have role="radio" on each button', () => {
      const radioButtons = el.querySelectorAll('[role="radio"]');
      expect(radioButtons.length).toBe(2);
    });
  });
});
