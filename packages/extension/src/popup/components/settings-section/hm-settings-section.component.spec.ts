import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsSectionComponent } from './hm-settings-section.component';

describe('SettingsSectionComponent', () => {
  let component: SettingsSectionComponent;
  let fixture: ComponentFixture<SettingsSectionComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsSectionComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Default rendering (enabled=true)', () => {
    it('should show "Extension Aktif" label when enabled', () => {
      expect(el.textContent).toContain('Extension Aktif');
    });

    it('should apply green color to toggle when enabled', () => {
      const toggleBtn = el.querySelector('button') as HTMLButtonElement;
      expect(toggleBtn.classList.contains('bg-green-500')).toBe(true);
    });

    it('should set aria-checked="true" when enabled', () => {
      const toggleBtn = el.querySelector('button') as HTMLButtonElement;
      expect(toggleBtn.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('Disabled state (enabled=false)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('extensionEnabled', false);
      fixture.detectChanges();
    });

    it('should show "Extension Kapalı" label when disabled', () => {
      expect(el.textContent).toContain('Extension Kapalı');
    });

    it('should apply slate color to toggle when disabled', () => {
      const toggleBtn = el.querySelector('button') as HTMLButtonElement;
      expect(toggleBtn.classList.contains('bg-slate-300')).toBe(true);
    });

    it('should set aria-checked="false" when disabled', () => {
      const toggleBtn = el.querySelector('button') as HTMLButtonElement;
      expect(toggleBtn.getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('Toggle interaction', () => {
    it('should emit enabledChange with false when toggle is clicked while enabled', () => {
      const emitted: boolean[] = [];
      component.enabledChange.subscribe((v: boolean) => emitted.push(v));

      (el.querySelector('button') as HTMLButtonElement).click();

      expect(emitted).toEqual([false]);
    });

    it('should emit enabledChange with true when toggle is clicked while disabled', () => {
      fixture.componentRef.setInput('extensionEnabled', false);
      fixture.detectChanges();

      const emitted: boolean[] = [];
      component.enabledChange.subscribe((v: boolean) => emitted.push(v));

      (el.querySelector('button') as HTMLButtonElement).click();

      expect(emitted).toEqual([true]);
    });
  });

  describe('Accessibility', () => {
    it('should have role="switch" on the toggle button', () => {
      const switchEl = el.querySelector('[role="switch"]');
      expect(switchEl).toBeTruthy();
    });
  });
});
