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
    resourceTypeFilter: ['xhr', 'fetch'],
    domainFilter: [],
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

  it('should render hm-rule-form inside Rules accordion', () => {
    const ruleForm = el.querySelector('hm-rule-form');
    expect(ruleForm).toBeTruthy();
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
            resourceTypeFilter: ['xhr', 'fetch'],
            domainFilter: [],
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
            resourceTypeFilter: ['xhr', 'fetch'],
            domainFilter: [],
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
            resourceTypeFilter: ['xhr', 'fetch'],
            domainFilter: [],
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
            resourceTypeFilter: ['xhr', 'fetch'],
            domainFilter: [],
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

  // Subtask 4.7: excludeList computed signal reads from state correctly
  describe('excludeList computed signal', () => {
    it('should default to empty array when state is null', () => {
      mockMessagingService.state.set(null);
      fixture.detectChanges();
      expect(component.excludeList()).toEqual([]);
    });

    it('should read excludeList from state', () => {
      mockMessagingService.state.set(
        makeStateSyncPayload({
          settings: {
            enabled: true,
            replayMode: 'last-match',
            timingReplay: false,
            excludeList: ['/api/auth', '/api/health'],
            resourceTypeFilter: ['xhr', 'fetch'],
            domainFilter: [],
          },
        }),
      );
      fixture.detectChanges();
      expect(component.excludeList()).toEqual(['/api/auth', '/api/health']);
    });

    it('should read empty excludeList from state', () => {
      mockMessagingService.state.set(makeStateSyncPayload());
      fixture.detectChanges();
      expect(component.excludeList()).toEqual([]);
    });

    it('should render hm-exclude-list in Settings accordion', () => {
      expect(el.querySelector('hm-exclude-list')).toBeTruthy();
    });
  });

  // Subtask 4.8: onExcludeListChange sends UPDATE_SETTINGS
  describe('onExcludeListChange', () => {
    it('should call sendMessage with UPDATE_SETTINGS and excludeList payload', () => {
      component.onExcludeListChange(['/api/auth', '/api/health']);
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'UPDATE_SETTINGS',
        { settings: { excludeList: ['/api/auth', '/api/health'] } },
        expect.any(String),
      );
    });

    it('should call sendMessage with empty excludeList', () => {
      component.onExcludeListChange([]);
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'UPDATE_SETTINGS',
        { settings: { excludeList: [] } },
        expect.any(String),
      );
    });

    it('should log error when sendMessage rejects', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMessagingService.sendMessage.mockRejectedValueOnce(new Error('network fail'));
      component.onExcludeListChange(['/api/auth']);
      await Promise.resolve();
      await Promise.resolve();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HAR Mock] Exclude list güncellenemedi:',
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

  // Subtask 4.10: activeRules computed signal state'ten doğru okuma
  describe('activeRules computed signal', () => {
    it('should default to empty array when state is null', () => {
      mockMessagingService.state.set(null);
      fixture.detectChanges();
      expect(component.activeRules()).toEqual([]);
    });

    it('should read activeRules from state', () => {
      const mockRule = {
        id: 'test-rule-1',
        urlPattern: '/api/test/*',
        method: 'GET',
        statusCode: 200,
        responseBody: '{"ok":true}',
        responseHeaders: [],
        delay: 0,
        enabled: true,
      };
      mockMessagingService.state.set(makeStateSyncPayload({ activeRules: [mockRule] }));
      fixture.detectChanges();
      expect(component.activeRules()).toEqual([mockRule]);
    });

    it('should return empty array when activeRules is empty in state', () => {
      mockMessagingService.state.set(makeStateSyncPayload({ activeRules: [] }));
      fixture.detectChanges();
      expect(component.activeRules()).toEqual([]);
    });
  });

  // Subtask 4.11: onRuleCreated ADD_RULE mesajı doğru payload ile gönderilmeli
  describe('onRuleCreated', () => {
    const mockRule = {
      id: 'test-rule-1',
      urlPattern: '/api/test',
      method: 'POST',
      statusCode: 201,
      responseBody: '{"created":true}',
      responseHeaders: [] as const,
      delay: 0,
      enabled: true,
    };

    it('should call sendMessage with ADD_RULE and correct payload', () => {
      component.onRuleCreated(mockRule);
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'ADD_RULE',
        { rule: mockRule },
        expect.any(String),
      );
    });

    it('should log error when sendMessage rejects', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMessagingService.sendMessage.mockRejectedValueOnce(new Error('network fail'));
      component.onRuleCreated(mockRule);
      await Promise.resolve();
      await Promise.resolve();
      expect(consoleSpy).toHaveBeenCalledWith('[HAR Mock] Rule eklenemedi:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  // Subtask 4.12: Rules accordion badge activeRules length göstermeli
  describe('Rules accordion badge', () => {
    it('should show badge as "0" when no active rules', () => {
      mockMessagingService.state.set(makeStateSyncPayload({ activeRules: [] }));
      fixture.detectChanges();
      expect(component.activeRulesBadge()).toBe('0');
      expect(component.activeRulesBadgeVariant()).toBe('default');
    });

    it('should show badge count matching activeRules length', () => {
      const rules = [
        {
          id: 'r1',
          urlPattern: '/api/a',
          method: 'GET',
          statusCode: 200,
          responseBody: '{}',
          responseHeaders: [] as const,
          delay: 0,
          enabled: true,
        },
        {
          id: 'r2',
          urlPattern: '/api/b',
          method: 'POST',
          statusCode: 201,
          responseBody: '{}',
          responseHeaders: [] as const,
          delay: 0,
          enabled: true,
        },
      ];
      mockMessagingService.state.set(makeStateSyncPayload({ activeRules: rules }));
      fixture.detectChanges();
      expect(component.activeRulesBadge()).toBe('2');
      expect(component.activeRulesBadgeVariant()).toBe('info');
    });
  });

  // Story 4-2 testleri: hm-rule-list entegrasyonu, edit/delete handler'ları
  describe('Story 4-2: rule list integration', () => {
    const mockRule = {
      id: 'r1',
      urlPattern: '/api/users',
      method: 'GET',
      statusCode: 200,
      responseBody: '{}',
      responseHeaders: [] as const,
      delay: 0,
      enabled: true,
    };

    // Subtask 5.11 — onEditRuleRequested çağrıldığında editingRule signal güncellemeli
    it('should update editingRule signal when onEditRuleRequested is called', () => {
      expect(component.editingRule()).toBeNull();
      component.onEditRuleRequested(mockRule);
      expect(component.editingRule()).toEqual(mockRule);
    });

    it('should start with editingRule = null', () => {
      expect(component.editingRule()).toBeNull();
    });

    // M2: Aynı rule için tekrar onEditRuleRequested çağrıldığında editingRule referansı değişmeli
    it('should always set a new object reference for editingRule (M2 edge case fix)', () => {
      component.onEditRuleRequested(mockRule);
      const firstRef = component.editingRule();

      // Aynı rule ile tekrar çağrılınca yeni spread referansı üretilmeli
      component.onEditRuleRequested(mockRule);
      const secondRef = component.editingRule();

      // Değerler eşit ama referanslar farklı olmalı (spread garantisi)
      expect(secondRef).toEqual(firstRef);
      expect(secondRef).not.toBe(firstRef); // farklı referans → effect() tetiklenir
    });

    // Subtask 5.12 — onRuleUpdated çağrıldığında UPDATE_RULE mesajı doğru payload ile gönderilmeli ve editingRule null olmalı
    it('should send UPDATE_RULE message and set editingRule to null when onRuleUpdated is called', async () => {
      component.editingRule.set(mockRule);
      component.onRuleUpdated(mockRule);

      expect(component.editingRule()).toBeNull();
      await Promise.resolve(); // microtask flush
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'UPDATE_RULE',
        { rule: mockRule },
        expect.any(String),
      );
    });

    // Subtask 5.13 — onRuleDeleted çağrıldığında DELETE_RULE mesajı doğru ruleId ile gönderilmeli
    it('should send DELETE_RULE message with correct ruleId when onRuleDeleted is called', async () => {
      component.onRuleDeleted('r1');
      await Promise.resolve(); // microtask flush
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'DELETE_RULE',
        { ruleId: 'r1' },
        expect.any(String),
      );
    });

    // Subtask 5.14 — activeRules 0 iken badge "0" gösterilmeli; variant "default" olmalı (regresyon)
    it('should show badge "0" and variant "default" when activeRules is empty (AC #4)', () => {
      mockMessagingService.state.set(makeStateSyncPayload({ activeRules: [] }));
      fixture.detectChanges();
      expect(component.activeRulesBadge()).toBe('0');
      expect(component.activeRulesBadgeVariant()).toBe('default');
    });

    // hm-rule-list render edilmeli
    it('should render hm-rule-list component inside Rules accordion', () => {
      const ruleList = el.querySelector('hm-rule-list');
      expect(ruleList).toBeTruthy();
    });
  });
});
