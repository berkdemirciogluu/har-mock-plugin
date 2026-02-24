import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabBarComponent } from './tab-bar.component';

describe('TabBarComponent', () => {
  let component: TabBarComponent;
  let fixture: ComponentFixture<TabBarComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TabBarComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render two tab buttons', () => {
    const buttons = el.querySelectorAll('button[role="tab"]');
    expect(buttons.length).toBe(2);
  });

  it('should have Controls as default active tab', () => {
    const buttons = el.querySelectorAll('button[role="tab"]');
    const controlsBtn = buttons[0] as HTMLButtonElement;
    expect(controlsBtn.getAttribute('aria-selected')).toBe('true');
    expect(controlsBtn.textContent?.trim()).toBe('Controls');
  });

  it('should mark Monitor tab as not selected by default', () => {
    const buttons = el.querySelectorAll('button[role="tab"]');
    const monitorBtn = buttons[1] as HTMLButtonElement;
    expect(monitorBtn.getAttribute('aria-selected')).toBe('false');
    expect(monitorBtn.textContent?.trim()).toBe('Monitor');
  });

  it('should emit tabChange with "monitor" when Monitor tab clicked', () => {
    const emitSpy = jest.spyOn(component.tabChange, 'emit');
    const buttons = el.querySelectorAll('button[role="tab"]');
    const monitorBtn = buttons[1] as HTMLButtonElement;
    monitorBtn.click();
    expect(emitSpy).toHaveBeenCalledWith('monitor');
  });

  it('should emit tabChange with "controls" when Controls tab clicked', () => {
    const emitSpy = jest.spyOn(component.tabChange, 'emit');
    const buttons = el.querySelectorAll('button[role="tab"]');
    const controlsBtn = buttons[0] as HTMLButtonElement;
    controlsBtn.click();
    expect(emitSpy).toHaveBeenCalledWith('controls');
  });

  it('should have proper ARIA tablist role on container', () => {
    const tablist = el.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
  });

  it('should apply active styling to selected tab', () => {
    const buttons = el.querySelectorAll('button[role="tab"]');
    const controlsBtn = buttons[0] as HTMLButtonElement;
    expect(controlsBtn.className).toContain('border-indigo-500');
    expect(controlsBtn.className).toContain('text-indigo-600');
  });

  it('should apply inactive styling to unselected tab', () => {
    const buttons = el.querySelectorAll('button[role="tab"]');
    const monitorBtn = buttons[1] as HTMLButtonElement;
    expect(monitorBtn.className).toContain('text-slate-500');
  });
});
