import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MonitorTabComponent } from './monitor-tab.component';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';

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

    it('should render multiple events in the feed', () => {
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
    });

    it('should have scroll container when feed has events', () => {
      const event = makeMatchEvent({ source: 'har' });
      stateSignal.set(makeState([event]));
      fixture.detectChanges();
      const scrollContainer = el.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeTruthy();
    });
  });
});
