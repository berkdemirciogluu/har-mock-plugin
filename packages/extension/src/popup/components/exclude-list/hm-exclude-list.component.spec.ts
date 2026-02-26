import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HmExcludeListComponent } from './hm-exclude-list.component';

describe('HmExcludeListComponent', () => {
  let component: HmExcludeListComponent;
  let fixture: ComponentFixture<HmExcludeListComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HmExcludeListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HmExcludeListComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Subtask 4.1: Empty list state message
  describe('empty state', () => {
    it('should show empty state message when excludeList is empty', () => {
      fixture.componentRef.setInput('excludeList', []);
      fixture.detectChanges();
      expect(el.textContent).toContain('Exclude listesi boş');
    });

    it('should not show empty state message when list has items', () => {
      fixture.componentRef.setInput('excludeList', ['/api/auth']);
      fixture.detectChanges();
      expect(el.textContent).not.toContain('Exclude listesi boş');
    });
  });

  // Subtask 4.2: Pattern ekleme → excludeListChange emit
  describe('addPattern', () => {
    it('should emit excludeListChange with new pattern when valid input is added', () => {
      const emitted: (readonly string[])[] = [];
      const sub = component.excludeListChange.subscribe((list) => {
        emitted.push(list);
      });

      fixture.componentRef.setInput('excludeList', []);
      fixture.detectChanges();

      component.newPattern.set('/api/auth');
      component.addPattern();

      expect(emitted.length).toBe(1);
      expect(emitted[0]).toEqual(['/api/auth']);
      sub.unsubscribe();
    });

    it('should emit updated list including existing patterns and new pattern', () => {
      const emitted: (readonly string[])[] = [];
      const sub = component.excludeListChange.subscribe((list) => {
        emitted.push(list);
      });

      fixture.componentRef.setInput('excludeList', ['/api/health']);
      fixture.detectChanges();

      component.newPattern.set('/api/auth');
      component.addPattern();

      expect(emitted.length).toBe(1);
      expect(emitted[0]).toEqual(['/api/health', '/api/auth']);
      sub.unsubscribe();
    });

    // Subtask 4.6: Input cleared after successful add
    it('should clear newPattern after successful add', () => {
      fixture.componentRef.setInput('excludeList', []);
      fixture.detectChanges();

      component.newPattern.set('/api/auth');
      component.addPattern();

      expect(component.newPattern()).toBe('');
    });
  });

  // Subtask 4.3: Boş input ile ekleme → hiçbir emit, hata mesajı
  describe('empty input validation', () => {
    it('should NOT emit excludeListChange when input is empty', () => {
      const emitted: (readonly string[])[] = [];
      const sub = component.excludeListChange.subscribe((list) => {
        emitted.push(list);
      });

      component.newPattern.set('');
      component.addPattern();

      expect(emitted.length).toBe(0);
      sub.unsubscribe();
    });

    it('should show "URL pattern gerekli" message when input is empty and add attempted', () => {
      component.newPattern.set('');
      component.addPattern();
      fixture.detectChanges();

      expect(el.textContent).toContain('URL pattern gerekli');
    });

    it('should NOT emit and show error when input is whitespace only', () => {
      const emitted: (readonly string[])[] = [];
      const sub = component.excludeListChange.subscribe((list) => {
        emitted.push(list);
      });

      component.newPattern.set('   ');
      component.addPattern();
      fixture.detectChanges();

      expect(emitted.length).toBe(0);
      expect(el.textContent).toContain('URL pattern gerekli');
      sub.unsubscribe();
    });
  });

  // Subtask 4.4: Duplicate pattern → hiçbir emit, hata mesajı
  describe('duplicate validation', () => {
    it('should NOT emit excludeListChange when pattern is duplicate', () => {
      const emitted: (readonly string[])[] = [];
      const sub = component.excludeListChange.subscribe((list) => {
        emitted.push(list);
      });

      fixture.componentRef.setInput('excludeList', ['/api/auth']);
      fixture.detectChanges();

      component.newPattern.set('/api/auth');
      component.addPattern();

      expect(emitted.length).toBe(0);
      sub.unsubscribe();
    });

    it('should show "Bu pattern zaten listede" when duplicate added', () => {
      fixture.componentRef.setInput('excludeList', ['/api/auth']);
      fixture.detectChanges();

      component.newPattern.set('/api/auth');
      component.addPattern();
      fixture.detectChanges();

      expect(el.textContent).toContain('Bu pattern zaten listede');
    });
  });

  // Validation clearing
  describe('validation error clearing', () => {
    it('should clear validation error after successful add following a previous error', () => {
      fixture.componentRef.setInput('excludeList', ['/api/auth']);
      fixture.detectChanges();

      // Trigger duplicate error
      component.newPattern.set('/api/auth');
      component.addPattern();
      fixture.detectChanges();
      expect(el.textContent).toContain('Bu pattern zaten listede');

      // Now add a valid, different pattern
      component.newPattern.set('/api/health');
      component.addPattern();
      fixture.detectChanges();
      expect(el.textContent).not.toContain('Bu pattern zaten listede');
      expect(el.textContent).not.toContain('URL pattern gerekli');
    });

    it('should clear validation error when user starts typing', () => {
      // Trigger empty error
      component.newPattern.set('');
      component.addPattern();
      fixture.detectChanges();
      expect(el.textContent).toContain('URL pattern gerekli');

      // Simulate typing via onNewPatternInput
      const inputEvent = new Event('input');
      Object.defineProperty(inputEvent, 'target', { value: { value: '/api' } });
      component.onNewPatternInput(inputEvent);
      fixture.detectChanges();

      expect(el.textContent).not.toContain('URL pattern gerekli');
      expect(component.newPattern()).toBe('/api');
    });

    it('should clear validation error when removePattern is called', () => {
      fixture.componentRef.setInput('excludeList', ['/api/auth', '/api/health']);
      fixture.detectChanges();

      // Trigger duplicate error
      component.newPattern.set('/api/auth');
      component.addPattern();
      fixture.detectChanges();
      expect(el.textContent).toContain('Bu pattern zaten listede');

      // Remove a pattern — error should clear
      component.removePattern(0);
      fixture.detectChanges();
      expect(el.textContent).not.toContain('Bu pattern zaten listede');
    });
  });

  // Subtask 4.5: Pattern kaldırma
  describe('removePattern', () => {
    it('should emit excludeListChange without removed pattern', () => {
      const emitted: (readonly string[])[] = [];
      const sub = component.excludeListChange.subscribe((list) => {
        emitted.push(list);
      });

      fixture.componentRef.setInput('excludeList', ['/api/auth', '/api/health']);
      fixture.detectChanges();

      component.removePattern(0);

      expect(emitted.length).toBe(1);
      expect(emitted[0]).toEqual(['/api/health']);
      sub.unsubscribe();
    });

    it('should emit empty list after removing last pattern', () => {
      const emitted: (readonly string[])[] = [];
      const sub = component.excludeListChange.subscribe((list) => {
        emitted.push(list);
      });

      fixture.componentRef.setInput('excludeList', ['/api/auth']);
      fixture.detectChanges();

      component.removePattern(0);

      expect(emitted.length).toBe(1);
      expect(emitted[0]).toEqual([]);
      sub.unsubscribe();
    });
  });

  // A11y
  describe('accessibility', () => {
    it('should have aria-label on the input field', () => {
      const input = el.querySelector('input');
      expect(input?.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have aria-label on Ekle button', () => {
      const addBtn = el.querySelector('button[aria-label*="Ekle"]');
      expect(addBtn).toBeTruthy();
    });

    it('should have role="list" on pattern list when items exist', () => {
      fixture.componentRef.setInput('excludeList', ['/api/auth']);
      fixture.detectChanges();
      const list = el.querySelector('[role="list"]');
      expect(list).toBeTruthy();
    });

    it('should have role="listitem" on each pattern item', () => {
      fixture.componentRef.setInput('excludeList', ['/api/auth', '/api/health']);
      fixture.detectChanges();
      const items = el.querySelectorAll('[role="listitem"]');
      expect(items.length).toBe(2);
    });
  });

  // Template rendering
  describe('template', () => {
    it('should render pattern text in the list', () => {
      fixture.componentRef.setInput('excludeList', ['/api/auth']);
      fixture.detectChanges();
      expect(el.textContent).toContain('/api/auth');
    });

    it('should render Kaldır button for each item', () => {
      fixture.componentRef.setInput('excludeList', ['/api/auth', '/api/health']);
      fixture.detectChanges();
      const removeButtons = el.querySelectorAll('button[aria-label*="Kaldır"]');
      expect(removeButtons.length).toBe(2);
    });

    it('should call removePattern when Kaldır button clicked', () => {
      const removeSpy = jest.spyOn(component, 'removePattern');
      fixture.componentRef.setInput('excludeList', ['/api/auth']);
      fixture.detectChanges();
      const removeBtn = el.querySelector('button[aria-label*="Kaldır"]') as HTMLButtonElement;
      removeBtn.click();
      expect(removeSpy).toHaveBeenCalledWith(0);
    });

    it('should call addPattern when Ekle button clicked', () => {
      const addSpy = jest.spyOn(component, 'addPattern');
      const input = el.querySelector('input') as HTMLInputElement;
      input.value = '/api/test';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      const addBtn = el.querySelector('button[aria-label*="Ekle"]') as HTMLButtonElement;
      addBtn.click();
      expect(addSpy).toHaveBeenCalled();
    });

    it('should call onNewPatternInput when typing in input field', () => {
      const spy = jest.spyOn(component, 'onNewPatternInput');
      const input = el.querySelector('input') as HTMLInputElement;
      input.value = '/api/test';
      input.dispatchEvent(new Event('input'));
      expect(spy).toHaveBeenCalled();
    });
  });
});
