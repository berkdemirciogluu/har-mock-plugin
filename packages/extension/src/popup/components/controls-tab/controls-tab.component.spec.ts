import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ControlsTabComponent } from './controls-tab.component';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';
import type { StateSyncPayload } from '../../../shared/payload.types';

// Mock @har-mock/core to avoid side-effect imports in JSDOM
jest.mock('@har-mock/core', () => ({
  parseHar: jest.fn(),
  parameterize: jest.fn(),
  HarParseError: class HarParseError extends Error {},
}));

const makeStateSyncPayload = (overrides: Partial<StateSyncPayload> = {}): StateSyncPayload => ({
  harData: null,
  activeRules: [],
  settings: {
    enabled: true,
    replayMode: 'last-match',
    timingReplay: false,
    excludeList: [],
  },
  editedResponses: {},
  matchHistory: [],
  accordionStates: {},
  ...overrides,
});

const createMockMessagingService = (stateValue: StateSyncPayload | null = null) => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  sendMessage: jest.fn().mockResolvedValue({ success: true }),
  state: signal(stateValue),
  ngOnDestroy: jest.fn(),
});

describe('ControlsTabComponent', () => {
  let component: ControlsTabComponent;
  let fixture: ComponentFixture<ControlsTabComponent>;
  let el: HTMLElement;
  let mockMessagingService: ReturnType<typeof createMockMessagingService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    localStorage.clear();

    mockMessagingService = createMockMessagingService(null);

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

  it('should contain placeholder text for Rules section', () => {
    const text = el.textContent;
    expect(text).toContain('Rule yönetimi');
  });

  it('should start with null endpointCount signal', () => {
    expect(component.endpointCount()).toBeNull();
  });

  it('should update endpointCount when set', () => {
    component.endpointCount.set(42);
    expect(component.endpointCount()).toBe(42);
    fixture.detectChanges();
  });

  describe('hm-strategy-toggle (progressive disclosure)', () => {
    it('should NOT render hm-strategy-toggle when state is null', () => {
      mockMessagingService.state.set(null);
      fixture.detectChanges();
      expect(el.querySelector('hm-strategy-toggle')).toBeNull();
    });

    it('should NOT render hm-strategy-toggle when harData is null in state', () => {
      mockMessagingService.state.set(makeStateSyncPayload({ harData: null }));
      fixture.detectChanges();
      expect(el.querySelector('hm-strategy-toggle')).toBeNull();
    });

    it('should render hm-strategy-toggle when harData is present', () => {
      mockMessagingService.state.set(
        makeStateSyncPayload({
          harData: {
            entries: [],
            patterns: [],
            fileName: 'test.har',
            loadedAt: Date.now(),
          },
        }),
      );
      fixture.detectChanges();
      expect(el.querySelector('hm-strategy-toggle')).toBeTruthy();
    });

    it('should reflect replayMode "sequential" from state', () => {
      mockMessagingService.state.set(
        makeStateSyncPayload({
          settings: {
            enabled: true,
            replayMode: 'sequential',
            timingReplay: false,
            excludeList: [],
          },
        }),
      );
      fixture.detectChanges();
      expect(component.replayMode()).toBe('sequential');
    });

    it('should default replayMode to "last-match" when state is null', () => {
      mockMessagingService.state.set(null);
      fixture.detectChanges();
      expect(component.replayMode()).toBe('last-match');
    });
  });

  describe('hm-settings-section', () => {
    it('should render hm-settings-section', () => {
      expect(el.querySelector('hm-settings-section')).toBeTruthy();
    });

    it('should reflect extensionEnabled=true from state', () => {
      mockMessagingService.state.set(makeStateSyncPayload());
      fixture.detectChanges();
      expect(component.extensionEnabled()).toBe(true);
    });

    it('should reflect extensionEnabled=false from state', () => {
      mockMessagingService.state.set(
        makeStateSyncPayload({
          settings: {
            enabled: false,
            replayMode: 'last-match',
            timingReplay: false,
            excludeList: [],
          },
        }),
      );
      fixture.detectChanges();
      expect(component.extensionEnabled()).toBe(false);
    });

    it('should default extensionEnabled to true when state is null', () => {
      mockMessagingService.state.set(null);
      fixture.detectChanges();
      expect(component.extensionEnabled()).toBe(true);
    });
  });

  describe('onReplayModeChange', () => {
    it('should call sendMessage with UPDATE_SETTINGS and sequential mode', () => {
      component.onReplayModeChange('sequential');
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'UPDATE_SETTINGS',
        { settings: { replayMode: 'sequential' } },
        expect.any(String),
      );
    });

    it('should call sendMessage with UPDATE_SETTINGS and last-match mode', () => {
      component.onReplayModeChange('last-match');
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'UPDATE_SETTINGS',
        { settings: { replayMode: 'last-match' } },
        expect.any(String),
      );
    });

    it('should log error when sendMessage rejects', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMessagingService.sendMessage.mockRejectedValueOnce(new Error('network fail'));
      component.onReplayModeChange('sequential');
      await Promise.resolve();
      await Promise.resolve();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HAR Mock] Replay mode güncellenemedi:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('HAR Timing Replay toggle (progressive disclosure)', () => {
    const harDataMock = {
      entries: [],
      patterns: [],
      fileName: 'test.har',
      loadedAt: Date.now(),
    };

    it('should NOT render timing replay toggle when state is null', () => {
      mockMessagingService.state.set(null);
      fixture.detectChanges();
      expect(el.querySelector('[role="switch"][aria-label="HAR Timing Replay toggle"]')).toBeNull();
    });

    it('should NOT render timing replay toggle when harData is null', () => {
      mockMessagingService.state.set(makeStateSyncPayload({ harData: null }));
      fixture.detectChanges();
      expect(el.querySelector('[role="switch"][aria-label="HAR Timing Replay toggle"]')).toBeNull();
    });

    it('should render timing replay toggle when HAR is loaded', () => {
      mockMessagingService.state.set(makeStateSyncPayload({ harData: harDataMock }));
      fixture.detectChanges();
      expect(
        el.querySelector('[role="switch"][aria-label="HAR Timing Replay toggle"]'),
      ).toBeTruthy();
    });

    it('should default timingReplay to false when state is null', () => {
      mockMessagingService.state.set(null);
      fixture.detectChanges();
      expect(component.timingReplay()).toBe(false);
    });

    it('should reflect timingReplay=true from state', () => {
      mockMessagingService.state.set(
        makeStateSyncPayload({
          harData: harDataMock,
          settings: {
            enabled: true,
            replayMode: 'last-match',
            timingReplay: true,
            excludeList: [],
          },
        }),
      );
      fixture.detectChanges();
      expect(component.timingReplay()).toBe(true);
      const toggle = el.querySelector(
        '[role="switch"][aria-label="HAR Timing Replay toggle"]',
      ) as HTMLButtonElement;
      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });

    it('should call sendMessage with timingReplay=true when toggle clicked', () => {
      mockMessagingService.state.set(makeStateSyncPayload({ harData: harDataMock }));
      fixture.detectChanges();
      const toggle = el.querySelector(
        '[role="switch"][aria-label="HAR Timing Replay toggle"]',
      ) as HTMLButtonElement;
      toggle.click();
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'UPDATE_SETTINGS',
        { settings: { timingReplay: true } },
        expect.any(String),
      );
    });

    it('should call sendMessage with timingReplay=false when toggle turned off', () => {
      mockMessagingService.state.set(
        makeStateSyncPayload({
          harData: harDataMock,
          settings: {
            enabled: true,
            replayMode: 'last-match',
            timingReplay: true,
            excludeList: [],
          },
        }),
      );
      fixture.detectChanges();
      const toggle = el.querySelector(
        '[role="switch"][aria-label="HAR Timing Replay toggle"]',
      ) as HTMLButtonElement;
      toggle.click();
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'UPDATE_SETTINGS',
        { settings: { timingReplay: false } },
        expect.any(String),
      );
    });

    it('should log error when onTimingReplayChange sendMessage rejects', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMessagingService.sendMessage.mockRejectedValueOnce(new Error('network fail'));
      component.onTimingReplayChange(true);
      await Promise.resolve();
      await Promise.resolve();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HAR Mock] Timing replay güncellenemedi:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('onEnabledChange', () => {
    it('should call sendMessage with UPDATE_SETTINGS and enabled=false', () => {
      component.onEnabledChange(false);
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'UPDATE_SETTINGS',
        { settings: { enabled: false } },
        expect.any(String),
      );
    });

    it('should call sendMessage with UPDATE_SETTINGS and enabled=true', () => {
      component.onEnabledChange(true);
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'UPDATE_SETTINGS',
        { settings: { enabled: true } },
        expect.any(String),
      );
    });

    it('should log error when sendMessage rejects', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMessagingService.sendMessage.mockRejectedValueOnce(new Error('network fail'));
      component.onEnabledChange(false);
      await Promise.resolve();
      await Promise.resolve();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HAR Mock] Extension toggle güncellenemedi:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });
});
