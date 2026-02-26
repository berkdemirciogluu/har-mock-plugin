import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { ExtensionMessagingService } from './services/extension-messaging.service';

// Mock @har-mock/core to avoid side-effect imports in JSDOM
jest.mock('@har-mock/core', () => ({
  parseHar: jest.fn(),
  parameterize: jest.fn(),
  HarParseError: class HarParseError extends Error {},
}));

const mockMessagingService = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  sendMessage: jest.fn(),
  state: jest.fn().mockReturnValue(null),
  ngOnDestroy: jest.fn(),
};

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    jest.clearAllMocks();
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: ExtensionMessagingService, useValue: mockMessagingService }],
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

  it('should call messaging connect() on init', () => {
    expect(mockMessagingService.connect).toHaveBeenCalledTimes(1);
  });

  it('should have flex flex-col layout classes for proper height constraint', () => {
    const container = el.querySelector('div') as HTMLElement;
    expect(container.className).toContain('flex');
    expect(container.className).toContain('flex-col');
  });

  it('should have tab content wrapper with flex-1 and min-h-0', () => {
    // Use native DOM API to find first direct div child (avoids :scope selector JSDOM issues)
    const outerDiv = el.querySelector('div') as HTMLElement;
    const wrapper = Array.from(outerDiv.children).find((child) => child.tagName === 'DIV') as
      | HTMLElement
      | undefined;
    expect(wrapper).toBeTruthy();
    expect(wrapper!.className).toContain('flex-1');
    expect(wrapper!.className).toContain('min-h-0');
  });
});
