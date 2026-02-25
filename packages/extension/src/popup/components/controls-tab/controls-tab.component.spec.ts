import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlsTabComponent } from './controls-tab.component';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';

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

describe('ControlsTabComponent', () => {
  let component: ControlsTabComponent;
  let fixture: ComponentFixture<ControlsTabComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    jest.clearAllMocks();
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [ControlsTabComponent],
      providers: [{ provide: ExtensionMessagingService, useValue: mockMessagingService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlsTabComponent);
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

  it('should render 3 accordion components', () => {
    const accordions = el.querySelectorAll('hm-accordion');
    expect(accordions.length).toBe(3);
  });

  it('should have HAR accordion expanded by default', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const accordions = el.querySelectorAll('hm-accordion');
    const harAccordion = accordions[0] as HTMLElement;
    const body = harAccordion.querySelector('[role="region"]') as HTMLElement;
    expect(body.style.maxHeight).toBe('500px');
  });

  it('should have Rules accordion collapsed by default', () => {
    const accordions = el.querySelectorAll('hm-accordion');
    const rulesAccordion = accordions[1] as HTMLElement;
    const body = rulesAccordion.querySelector('[role="region"]') as HTMLElement;
    expect(body.style.maxHeight).toBe('0px');
  });

  it('should have Settings accordion collapsed by default', () => {
    const accordions = el.querySelectorAll('hm-accordion');
    const settingsAccordion = accordions[2] as HTMLElement;
    const body = settingsAccordion.querySelector('[role="region"]') as HTMLElement;
    expect(body.style.maxHeight).toBe('0px');
  });

  it('should render hm-har-upload inside HAR accordion', () => {
    const harUpload = el.querySelector('hm-har-upload');
    expect(harUpload).toBeTruthy();
  });

  it('should contain placeholder text for non-HAR sections', () => {
    const text = el.textContent;
    expect(text).toContain('Rule yönetimi');
    expect(text).toContain('Extension ayarları');
  });

  it('should start with null endpointCount signal', () => {
    expect(component.endpointCount()).toBeNull();
  });

  it('should update endpointCount when onEndpointLoaded is emitted', () => {
    component.endpointCount.set(42);
    expect(component.endpointCount()).toBe(42);
    fixture.detectChanges();
  });
});
