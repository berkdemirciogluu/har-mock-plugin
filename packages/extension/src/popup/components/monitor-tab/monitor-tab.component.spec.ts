import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MonitorTabComponent } from './monitor-tab.component';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';
import { MessageType } from '../../../shared/messaging.types';

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
      row.click();
      fixture.detectChanges();

      expect(row.classList).toContain('bg-indigo-50');
      expect(row.classList).toContain('border-l-2');
      expect(row.classList).toContain('border-indigo-500');
    });

    it('should have cursor-pointer class on row items', () => {
      stateSignal.set(makeState([makeMatchEvent()]));
      fixture.detectChanges();
      const row = el.querySelector('[data-feed-row]') as HTMLElement;
      expect(row.classList).toContain('cursor-pointer');
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
      // "şimdi" appears for very recent events
      expect(el.textContent).toContain('şimdi');
    });

    it('formatRelativeTime should return correct string for seconds', () => {
      const timestamp = Date.now() - 30_000;
      expect(component.formatRelativeTime(timestamp)).toBe('30s');
    });

    it('formatRelativeTime should return correct string for minutes', () => {
      const timestamp = Date.now() - 5 * 60_000;
      expect(component.formatRelativeTime(timestamp)).toBe('5m');
    });

    it('formatRelativeTime should return correct string for hours', () => {
      const timestamp = Date.now() - 2 * 3_600_000;
      expect(component.formatRelativeTime(timestamp)).toBe('2h');
    });

    it('toDateString should return a non-empty string for any timestamp', () => {
      const timestamp = Date.now();
      const result = component.toDateString(timestamp);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
