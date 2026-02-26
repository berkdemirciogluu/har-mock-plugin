import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input, signal } from '@angular/core';
import { MonitorTabComponent } from './monitor-tab.component';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';
import { MessageType } from '../../../shared/messaging.types';
import type { MatchEvent } from '../../../shared/state.types';

// ─── HmResponseViewerComponent Stub ────────────────────────────────────────
// HmResponseViewerComponent → HmJsonEditorComponent → CodeMirror (JSDOM uyumsuz)
// Monitor-tab testleri response viewer işlevselliğini test etmez → stub yeterli
jest.mock('../response-viewer/hm-response-viewer.component', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Component } = require('@angular/core') as typeof import('@angular/core');
  return {
    HmResponseViewerComponent: Component({
      selector: 'hm-response-viewer',
      standalone: true,
      template: '<div data-testid="response-viewer-stub"></div>',
      inputs: ['event'],
    })(class {}),
  };
});

const makeMatchEvent = (
  override: Partial<{
    id: string;
    url: string;
    method: string;
    source: 'rule' | 'har' | 'passthrough';
    statusCode: number;
    timestamp: number;
  }> = {},
) => ({
  id: 'evt-1',
  url: 'https://api.example.com/data',
  method: 'GET',
  source: 'har' as const,
  statusCode: 200,
  timestamp: Date.now(),
  ...override,
});

const makeState = (matchHistory: ReturnType<typeof makeMatchEvent>[]) => ({
  harData: null,
  activeRules: [],
  settings: {} as never,
  editedResponses: {},
  matchHistory,
  accordionStates: {},
});

describe('MonitorTabComponent', () => {
  let component: MonitorTabComponent;
  let fixture: ComponentFixture<MonitorTabComponent>;
  let el: HTMLElement;
  let stateSignal: ReturnType<typeof signal<ReturnType<typeof makeState> | null>>;

  beforeEach(async () => {
    stateSignal = signal<ReturnType<typeof makeState> | null>(null);

    const messagingStub = {
      state: stateSignal.asReadonly(),
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
    };

    await TestBed.configureTestingModule({
      imports: [MonitorTabComponent],
      providers: [{ provide: ExtensionMessagingService, useValue: messagingStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(MonitorTabComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('empty state', () => {
    it('should display empty state message when matchHistory is empty', () => {
      stateSignal.set(makeState([]));
      fixture.detectChanges();
      expect(el.textContent).toContain('Henüz intercept edilmiş request yok');
    });

    it('should display instruction text in empty state', () => {
      stateSignal.set(makeState([]));
      fixture.detectChanges();
      expect(el.textContent).toContain('Sayfayı yenileyip bir istek başlatın');
    });

    it('should show empty state when state is null', () => {
      stateSignal.set(null);
      fixture.detectChanges();
      expect(el.textContent).toContain('Henüz intercept edilmiş request yok');
    });
  });

  describe('feed list', () => {
    it('should display URL for an event', () => {
      const event = makeMatchEvent({ url: 'https://api.example.com/users', source: 'har' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      expect(el.textContent).toContain('https://api.example.com/users');
    });

    it('should display method badge', () => {
      const event = makeMatchEvent({ method: 'POST', source: 'har' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      expect(el.textContent).toContain('POST');
    });

    it('should display "HAR ✓" badge for har source event', () => {
      const event = makeMatchEvent({ source: 'har' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      expect(el.textContent).toContain('HAR ✓');
    });

    it('should display "Rule ✓" badge for rule source event', () => {
      const event = makeMatchEvent({ source: 'rule' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      expect(el.textContent).toContain('Rule ✓');
    });

    it('should display "→" badge for passthrough source event', () => {
      const event = makeMatchEvent({ source: 'passthrough' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      expect(el.textContent).toContain('→');
    });

    it('should render multiple events in correct DOM order', () => {
      const events = [
        makeMatchEvent({ id: 'e1', url: 'https://api.example.com/a', source: 'rule' }),
        makeMatchEvent({ id: 'e2', url: 'https://api.example.com/b', source: 'har' }),
        makeMatchEvent({ id: 'e3', url: 'https://api.example.com/c', source: 'passthrough' }),
      ];
      stateSignal.set(makeState(events));
      fixture.detectChanges();
      expect(el.textContent).toContain('Rule ✓');
      expect(el.textContent).toContain('HAR ✓');
      expect(el.textContent).toContain('→');

      const rows = el.querySelectorAll('.flex.items-center.gap-2');
      expect(rows.length).toBe(3);
      expect(rows[0]!.textContent).toContain('https://api.example.com/a');
      expect(rows[1]!.textContent).toContain('https://api.example.com/b');
      expect(rows[2]!.textContent).toContain('https://api.example.com/c');
    });

    it('should have scroll container when feed has events', () => {
      const event = makeMatchEvent({ source: 'har' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      const scrollContainer = el.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeTruthy();
    });

    it('should apply green CSS classes for rule source badge', () => {
      const event = makeMatchEvent({ source: 'rule' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      const badge = el.querySelector('.rounded-full');
      expect(badge).toBeTruthy();
      expect(badge!.classList).toContain('bg-green-100');
      expect(badge!.classList).toContain('text-green-700');
    });

    it('should apply blue CSS classes for har source badge', () => {
      const event = makeMatchEvent({ source: 'har' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      const badge = el.querySelector('.rounded-full');
      expect(badge).toBeTruthy();
      expect(badge!.classList).toContain('bg-blue-100');
      expect(badge!.classList).toContain('text-blue-700');
    });

    it('should apply slate CSS classes for passthrough source badge', () => {
      const event = makeMatchEvent({ source: 'passthrough' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      const badge = el.querySelector('.rounded-full');
      expect(badge).toBeTruthy();
      expect(badge!.classList).toContain('bg-slate-100');
      expect(badge!.classList).toContain('text-slate-500');
    });

    it('should have tooltip on source badge', () => {
      const event = makeMatchEvent({ source: 'rule' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      const badge = el.querySelector('.rounded-full') as HTMLElement;
      expect(badge?.title).toBe('Rule eşleşmesi');
    });

    it('should display statusCode when present', () => {
      const event = makeMatchEvent({ statusCode: 404 });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      expect(el.textContent).toContain('404');
    });

    it('should not display statusCode when undefined', () => {
      const event = makeMatchEvent({ statusCode: undefined });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      const statusSpans = el.querySelectorAll('.font-mono.text-slate-400');
      expect(statusSpans.length).toBe(0);
    });
  });

  describe('height constraint', () => {
    it('should have flex flex-col classes on host element', () => {
      expect(el.classList).toContain('flex');
      expect(el.classList).toContain('flex-col');
    });

    it('should have flex-1 and overflow-y-auto on feed container when events exist', () => {
      stateSignal.set(makeState([makeMatchEvent()]));
      fixture.detectChanges();
      const container = el.querySelector('.overflow-y-auto') as HTMLElement;
      expect(container).toBeTruthy();
      expect(container.classList).toContain('flex-1');
    });

    it('should have #feedContainer template ref accessible when events exist', () => {
      stateSignal.set(makeState([makeMatchEvent()]));
      fixture.detectChanges();
      // feedContainer viewChild should resolve to the element with #feedContainer
      const refEl = component['feedContainer']();
      expect(refEl).toBeTruthy();
    });
  });

  describe('scroll position preservation', () => {
    it('should not throw when new events are added while scrolled down', () => {
      stateSignal.set(makeState([makeMatchEvent({ id: 'e1' })]));
      fixture.detectChanges();

      const container = el.querySelector('.overflow-y-auto') as HTMLElement;
      // Simulate scrolled-down state
      Object.defineProperty(container, 'scrollTop', { value: 100, writable: true });

      // Add a new event — should trigger effect + rAF compensation without throwing
      expect(() => {
        stateSignal.set(makeState([makeMatchEvent({ id: 'e2' }), makeMatchEvent({ id: 'e1' })]));
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should render data-feed-row attributes for scroll targeting', () => {
      const events = [makeMatchEvent({ id: 'e1' }), makeMatchEvent({ id: 'e2' })];
      stateSignal.set(makeState(events));
      fixture.detectChanges();
      const rows = el.querySelectorAll('[data-feed-row]');
      expect(rows.length).toBe(2);
    });

    it('should compensate scrollTop by first row offsetHeight', () => {
      const events = [makeMatchEvent({ id: 'e1' }), makeMatchEvent({ id: 'e2' })];
      stateSignal.set(makeState(events));
      fixture.detectChanges();

      const container = el.querySelector('.overflow-y-auto') as HTMLElement;
      const firstRow = container.querySelector('[data-feed-row]') as HTMLElement;
      Object.defineProperty(firstRow, 'offsetHeight', { value: 40, configurable: true });
      Object.defineProperty(container, 'scrollTop', {
        value: 0,
        writable: true,
        configurable: true,
      });

      component.compensateScroll(container, 50);
      expect(container.scrollTop).toBe(90); // 50 + 40
    });
  });

  describe('row click selection', () => {
    it('should update selectedEventId when a row is clicked', () => {
      const event = makeMatchEvent({ id: 'clicked-id' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();

      const row = el.querySelector('[data-feed-row]') as HTMLElement;
      row.click();
      fixture.detectChanges();

      expect(component.selectedEventId()).toBe('clicked-id');
    });

    it('should emit eventSelected output when a row is clicked', () => {
      const event = makeMatchEvent({ id: 'emit-test-id' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();

      const emitSpy = jest.spyOn(component.eventSelected, 'emit');
      const row = el.querySelector('[data-feed-row]') as HTMLElement;
      row.click();

      expect(emitSpy).toHaveBeenCalledWith(event);
    });

    it('should apply selection highlight classes to the clicked row', () => {
      const event = makeMatchEvent({ id: 'highlight-id' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();

      const row = el.querySelector('[data-feed-row]') as HTMLElement;
      // Before selection: border-transparent should be present
      expect(row.classList).toContain('border-transparent');
      expect(row.classList).not.toContain('border-indigo-500');

      row.click();
      fixture.detectChanges();

      expect(row.classList).toContain('bg-indigo-50');
      expect(row.classList).toContain('border-l-2');
      expect(row.classList).toContain('border-indigo-500');
      expect(row.classList).not.toContain('border-transparent');
    });

    it('should have cursor-pointer class on row items', () => {
      stateSignal.set(makeState([makeMatchEvent()]));
      fixture.detectChanges();
      const row = el.querySelector('[data-feed-row]') as HTMLElement;
      expect(row.classList).toContain('cursor-pointer');
    });

    it('should have border-transparent on unselected rows', () => {
      const events = [makeMatchEvent({ id: 'a' }), makeMatchEvent({ id: 'b' })];
      stateSignal.set(makeState(events));
      fixture.detectChanges();
      const rows = el.querySelectorAll('[data-feed-row]');
      rows.forEach((row) => {
        expect(row.classList).toContain('border-l-2');
        expect(row.classList).toContain('border-transparent');
      });
    });
  });

  describe('feed header', () => {
    it('should display correct request count', () => {
      const events = [
        makeMatchEvent({ id: 'a' }),
        makeMatchEvent({ id: 'b' }),
        makeMatchEvent({ id: 'c' }),
      ];
      stateSignal.set(makeState(events));
      fixture.detectChanges();
      expect(el.textContent).toContain('3 request yakalandı');
    });

    it('should update count when history changes', () => {
      stateSignal.set(makeState([makeMatchEvent({ id: 'a' })]));
      fixture.detectChanges();
      expect(el.textContent).toContain('1 request yakalandı');

      stateSignal.set(makeState([makeMatchEvent({ id: 'b' }), makeMatchEvent({ id: 'a' })]));
      fixture.detectChanges();
      expect(el.textContent).toContain('2 request yakalandı');
    });

    it('should not show header when matchHistory is empty', () => {
      stateSignal.set(makeState([]));
      fixture.detectChanges();
      expect(el.textContent).not.toContain('request yakalandı');
    });

    it('should render Temizle button when events exist', () => {
      stateSignal.set(makeState([makeMatchEvent()]));
      fixture.detectChanges();
      const btn = el.querySelector('button') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.textContent?.trim()).toBe('Temizle');
    });

    it('should call sendMessage with CLEAR_HISTORY when Temizle is clicked', () => {
      const messagingService = TestBed.inject(ExtensionMessagingService) as unknown as {
        sendMessage: jest.Mock;
      };

      stateSignal.set(makeState([makeMatchEvent()]));
      fixture.detectChanges();

      const btn = el.querySelector('button') as HTMLButtonElement;
      btn.click();

      expect(messagingService.sendMessage).toHaveBeenCalledTimes(1);
      const [type] = messagingService.sendMessage.mock.calls[0] as [MessageType, unknown, string];
      expect(type).toBe(MessageType.CLEAR_HISTORY);
    });
  });

  describe('timestamp display', () => {
    it('should display a timestamp string for each event', () => {
      const now = Date.now();
      const event = makeMatchEvent({ timestamp: now });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      // "şimdi" appears for very recent events via relativeTime pipe
      expect(el.textContent).toContain('şimdi');
    });

    it('should render relative time via pipe for older events', () => {
      const event = makeMatchEvent({ timestamp: Date.now() - 120_000 });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      expect(el.textContent).toContain('2m');
    });

    it('should render locale date string in title attribute via pipe', () => {
      const timestamp = Date.now();
      const event = makeMatchEvent({ timestamp });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      const timestampSpan = el.querySelector('.text-slate-300.font-mono') as HTMLElement;
      expect(timestampSpan?.title).toBeTruthy();
      expect(timestampSpan.title).toContain('2026');
    });
  });
});

// ─── Subtask 5.7: selectedEvent computed ───────────────────────────────────
describe('MonitorTabComponent — selectedEvent computed (Subtask 5.7)', () => {
  let fixture: ComponentFixture<MonitorTabComponent>;
  let component: MonitorTabComponent;

  const makeEvt = (id: string, url: string): MatchEvent => ({
    id,
    url,
    method: 'GET',
    source: 'har',
    statusCode: 200,
    timestamp: Date.now(),
  });

  const makeStateWith = (events: MatchEvent[]) => ({
    harData: null as null,
    activeRules: [] as never[],
    settings: {} as never,
    editedResponses: {} as Record<string, never>,
    matchHistory: events,
    accordionStates: {} as Record<string, never>,
  });

  let stateSignal57: ReturnType<typeof signal<ReturnType<typeof makeStateWith> | null>>;

  beforeEach(async () => {
    stateSignal57 = signal<ReturnType<typeof makeStateWith> | null>(null);

    const messagingStub = {
      state: stateSignal57.asReadonly(),
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
    };

    await TestBed.configureTestingModule({
      imports: [MonitorTabComponent],
      providers: [{ provide: ExtensionMessagingService, useValue: messagingStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(MonitorTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should return null when no event is selected', () => {
    stateSignal57.set(makeStateWith([makeEvt('e1', 'https://a.com')]));
    fixture.detectChanges();
    expect(component.selectedEvent()).toBeNull();
  });

  it('should return correct MatchEvent when selectedEventId matches', () => {
    const evt1 = makeEvt('e1', 'https://api.com/a');
    const evt2 = makeEvt('e2', 'https://api.com/b');
    stateSignal57.set(makeStateWith([evt1, evt2]));
    fixture.detectChanges();
    component.selectEvent(evt2);
    expect(component.selectedEvent()).toEqual(evt2);
  });

  it('should update selectedEvent when a different event is selected', () => {
    const evt1 = makeEvt('e1', 'https://api.com/a');
    const evt2 = makeEvt('e2', 'https://api.com/b');
    stateSignal57.set(makeStateWith([evt1, evt2]));
    fixture.detectChanges();
    component.selectEvent(evt1);
    expect(component.selectedEvent()?.id).toBe('e1');
    component.selectEvent(evt2);
    expect(component.selectedEvent()?.id).toBe('e2');
  });
});
