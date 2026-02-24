import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have controls as default active tab', () => {
    expect(component.activeTab()).toBe('controls');
  });

  it('should render tab bar', () => {
    const tabBar = el.querySelector('hm-tab-bar');
    expect(tabBar).toBeTruthy();
  });

  it('should render controls tab by default', () => {
    const controlsTab = el.querySelector('hm-controls-tab');
    expect(controlsTab).toBeTruthy();
  });

  it('should not render monitor tab by default', () => {
    const monitorTab = el.querySelector('hm-monitor-tab');
    expect(monitorTab).toBeFalsy();
  });

  it('should switch to monitor tab when activeTab changes', () => {
    component.activeTab.set('monitor');
    fixture.detectChanges();

    const controlsTab = el.querySelector('hm-controls-tab');
    const monitorTab = el.querySelector('hm-monitor-tab');
    expect(controlsTab).toBeFalsy();
    expect(monitorTab).toBeTruthy();
  });

  it('should switch back to controls tab', () => {
    component.activeTab.set('monitor');
    fixture.detectChanges();
    component.activeTab.set('controls');
    fixture.detectChanges();

    const controlsTab = el.querySelector('hm-controls-tab');
    expect(controlsTab).toBeTruthy();
  });

  it('should have 400px width class', () => {
    const container = el.querySelector('div') as HTMLElement;
    expect(container.className).toContain('w-[400px]');
  });

  it('should have min/max height classes', () => {
    const container = el.querySelector('div') as HTMLElement;
    expect(container.className).toContain('min-h-[500px]');
    expect(container.className).toContain('max-h-[600px]');
  });
});
