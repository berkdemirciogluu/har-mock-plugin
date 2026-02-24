import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccordionComponent } from './accordion.component';

describe('AccordionComponent', () => {
  let component: AccordionComponent;
  let fixture: ComponentFixture<AccordionComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AccordionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccordionComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    // Set required input
    fixture.componentRef.setInput('title', 'Test Accordion');
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the title', () => {
    const header = el.querySelector('button[role="button"]');
    expect(header?.textContent).toContain('Test Accordion');
  });

  it('should be collapsed by default', () => {
    expect(component.isExpanded()).toBe(false);
  });

  it('should expand when toggled', () => {
    component.onToggle();
    fixture.detectChanges();
    expect(component.isExpanded()).toBe(true);
  });

  it('should collapse when toggled twice', () => {
    component.onToggle();
    component.onToggle();
    fixture.detectChanges();
    expect(component.isExpanded()).toBe(false);
  });

  it('should emit toggle event with new state', () => {
    const emitSpy = jest.spyOn(component.toggle, 'emit');
    component.onToggle();
    expect(emitSpy).toHaveBeenCalledWith(true);

    component.onToggle();
    expect(emitSpy).toHaveBeenCalledWith(false);
  });

  it('should have proper ARIA attributes on header', () => {
    const header = el.querySelector('button[role="button"]');
    expect(header?.getAttribute('aria-expanded')).toBe('false');

    component.onToggle();
    fixture.detectChanges();
    expect(header?.getAttribute('aria-expanded')).toBe('true');
  });

  it('should have proper ARIA attributes on body', () => {
    const body = el.querySelector('[role="region"]');
    expect(body).toBeTruthy();
    expect(body?.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('should apply chevron rotation when expanded', () => {
    const svg = el.querySelector('svg');
    expect(svg?.classList.contains('rotate-90')).toBe(false);

    component.onToggle();
    fixture.detectChanges();
    expect(svg?.classList.contains('rotate-90')).toBe(true);
  });

  it('should use max-height transition for collapse/expand', () => {
    const body = el.querySelector('[role="region"]') as HTMLElement;
    expect(body.style.maxHeight).toBe('0px');

    component.onToggle();
    fixture.detectChanges();
    expect(body.style.maxHeight).toBe('500px');
  });

  describe('with persistKey', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('persistKey', 'test-key');
      fixture.detectChanges();
    });

    it('should persist expanded state to localStorage', () => {
      component.onToggle();
      expect(localStorage.getItem('hm-accordion-test-key')).toBe('true');

      component.onToggle();
      expect(localStorage.getItem('hm-accordion-test-key')).toBe('false');
    });

    it('should restore state from localStorage', () => {
      localStorage.setItem('hm-accordion-test-key', 'true');

      // Recreate to pick up persisted state
      const newFixture = TestBed.createComponent(AccordionComponent);
      newFixture.componentRef.setInput('title', 'Persisted');
      newFixture.componentRef.setInput('persistKey', 'test-key');
      newFixture.detectChanges();

      expect(newFixture.componentInstance.isExpanded()).toBe(true);
    });
  });

  describe('with badge', () => {
    it('should render badge when provided', () => {
      fixture.componentRef.setInput('badge', '5');
      fixture.detectChanges();
      const badge = el.querySelector('span.inline-flex');
      expect(badge).toBeTruthy();
      expect(badge?.textContent?.trim()).toBe('5');
    });

    it('should apply emerald badge classes', () => {
      fixture.componentRef.setInput('badge', '3');
      fixture.componentRef.setInput('badgeVariant', 'emerald');
      fixture.detectChanges();
      const badge = el.querySelector('span.inline-flex') as HTMLElement;
      expect(badge.className).toContain('bg-emerald-100');
    });

    it('should apply blue badge classes', () => {
      fixture.componentRef.setInput('badge', '3');
      fixture.componentRef.setInput('badgeVariant', 'blue');
      fixture.detectChanges();
      const badge = el.querySelector('span.inline-flex') as HTMLElement;
      expect(badge.className).toContain('bg-blue-100');
    });
  });

  describe('with expanded default', () => {
    it('should start expanded when expanded input is true', async () => {
      const expandedFixture = TestBed.createComponent(AccordionComponent);
      expandedFixture.componentRef.setInput('title', 'Expanded');
      expandedFixture.componentRef.setInput('expanded', true);
      expandedFixture.detectChanges();
      await expandedFixture.whenStable();

      expect(expandedFixture.componentInstance.isExpanded()).toBe(true);
    });
  });
});
