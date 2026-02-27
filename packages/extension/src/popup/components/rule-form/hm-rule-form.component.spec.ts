import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Component, input, output } from '@angular/core';
import { HmRuleFormComponent } from './hm-rule-form.component';
import { HmJsonEditorComponent } from '../json-editor/hm-json-editor.component';
import type { MockRule } from '@har-mock/core';

// Mock @har-mock/core to avoid side-effect imports in JSDOM
jest.mock('@har-mock/core', () => ({
  parseHar: jest.fn(),
  parameterize: jest.fn(),
  HarParseError: class HarParseError extends Error {},
}));

// Mock HmJsonEditorComponent to avoid CodeMirror DOM requirements
@Component({
  selector: 'hm-json-editor',
  standalone: true,
  template: `<div class="mock-json-editor"></div>`,
})
class MockHmJsonEditorComponent {
  readonly value = input<string>('');
  readonly isReadOnly = input<boolean>(false);
  readonly valueChange = output<string>();
}

describe('HmRuleFormComponent', () => {
  let component: HmRuleFormComponent;
  let fixture: ComponentFixture<HmRuleFormComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    jest.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [HmRuleFormComponent],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(HmRuleFormComponent, {
        remove: { imports: [HmJsonEditorComponent] },
        add: { imports: [MockHmJsonEditorComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HmRuleFormComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  // AC #1: Form açılış durumu
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Subtask 4.1: İlk açılışta "Yeni Rule Ekle" butonu gösterilmeli, form gizli olmalı
  it('should show "Yeni Rule Ekle" button and hide form on initial load', () => {
    const addButton = el.querySelector('[data-testid="add-rule-button"]');
    const form = el.querySelector('[data-testid="rule-form"]');
    expect(addButton).toBeTruthy();
    expect(form).toBeNull();
  });

  // Subtask 4.2: "Yeni Rule Ekle" tıklanınca form görünür olmalı
  it('should show form when "Yeni Rule Ekle" button is clicked', () => {
    const addButton = el.querySelector<HTMLButtonElement>('[data-testid="add-rule-button"]');
    addButton?.click();
    fixture.detectChanges();

    const form = el.querySelector('[data-testid="rule-form"]');
    const addButtonAfter = el.querySelector('[data-testid="add-rule-button"]');
    expect(form).toBeTruthy();
    expect(addButtonAfter).toBeNull();
  });

  // Subtask 4.3: URL pattern boş iken kaydet → validation error, ruleCreated emit yok
  it('should show validation error and NOT emit ruleCreated when URL pattern is empty', () => {
    const ruleCreatedSpy = jest.fn();
    component.ruleCreated.subscribe(ruleCreatedSpy);

    // Form'u aç
    component.showForm.set(true);
    fixture.detectChanges();

    // URL pattern boş bırak, kaydet
    const saveButton = el.querySelector<HTMLButtonElement>('[data-testid="save-button"]');
    saveButton?.click();
    fixture.detectChanges();

    expect(component.urlPatternError()).toBe('URL pattern zorunludur');
    expect(ruleCreatedSpy).not.toHaveBeenCalled();
  });

  // Subtask 4.4: Tüm alanlar doldurulmuş → ruleCreated doğru MockRule ile emit edilmeli
  it('should emit ruleCreated with correct MockRule when all fields are filled', () => {
    const emittedRules: MockRule[] = [];
    component.ruleCreated.subscribe((rule: MockRule) => emittedRules.push(rule));

    component.showForm.set(true);
    component.urlPattern.set('/api/test');
    component.method.set('POST');
    component.statusCode.set(201);
    component.responseBody.set('{"created":true}');
    component.delay.set(100);
    fixture.detectChanges();

    const saveButton = el.querySelector<HTMLButtonElement>('[data-testid="save-button"]');
    saveButton?.click();
    fixture.detectChanges();

    expect(emittedRules.length).toBe(1);
    const rule = emittedRules[0] as MockRule;
    expect(rule.urlPattern).toBe('/api/test');
    expect(rule.method).toBe('POST');
    expect(rule.statusCode).toBe(201);
    expect(rule.responseBody).toBe('{"created":true}');
    expect(rule.delay).toBe(100);
    expect(rule.enabled).toBe(true);
    expect(rule.responseHeaders).toEqual([]);
    expect(rule.id).toBeTruthy(); // UUID
  });

  // Subtask 4.5: delay boş bırakıldığında → rule.delay = 0
  it('should set delay to 0 when delay field is empty/default', () => {
    const emittedRules: MockRule[] = [];
    component.ruleCreated.subscribe((rule: MockRule) => emittedRules.push(rule));

    component.showForm.set(true);
    component.urlPattern.set('/api/test');
    // delay default 0 - değiştirme
    fixture.detectChanges();

    const saveButton = el.querySelector<HTMLButtonElement>('[data-testid="save-button"]');
    saveButton?.click();
    fixture.detectChanges();

    const firstRule = emittedRules[0] as MockRule;
    expect(firstRule.delay).toBe(0);
  });

  // Subtask 4.6: Kaydet sonrası form sıfırlanmalı ve gizlenmeli
  it('should reset and hide form after successful save', () => {
    component.showForm.set(true);
    component.urlPattern.set('/api/reset-test');
    component.method.set('DELETE');
    component.statusCode.set(204);
    fixture.detectChanges();

    const saveButton = el.querySelector<HTMLButtonElement>('[data-testid="save-button"]');
    saveButton?.click();
    fixture.detectChanges();

    expect(component.showForm()).toBe(false);
    expect(component.urlPattern()).toBe('');
    expect(component.method()).toBe('GET');
    expect(component.statusCode()).toBe(200);
    expect(component.delay()).toBe(0);
  });

  // Subtask 4.7: "İptal" tıklanınca form sıfırlanmalı ve gizlenmeli
  it('should reset and hide form when Cancel is clicked', () => {
    component.showForm.set(true);
    component.urlPattern.set('/api/cancel-test');
    fixture.detectChanges();

    const cancelButton = el.querySelector<HTMLButtonElement>('[data-testid="cancel-button"]');
    cancelButton?.click();
    fixture.detectChanges();

    expect(component.showForm()).toBe(false);
    expect(component.urlPattern()).toBe('');
  });

  // Subtask 4.8: HTTP method dropdown varsayılan değeri "GET" olmalı
  it('should default HTTP method to "GET"', () => {
    expect(component.method()).toBe('GET');
  });

  // Subtask 4.9: Status code varsayılan değeri 200 olmalı
  it('should default status code to 200', () => {
    expect(component.statusCode()).toBe(200);
  });

  // urlPatternError sıfırlanmalı — URL girilince hata temizlenmeli
  it('should clear urlPatternError when URL pattern is set', () => {
    component.showForm.set(true);
    fixture.detectChanges();

    // Önce hata oluştur
    component.urlPatternError.set('URL pattern zorunludur');
    // Sonra URL gir
    component.urlPattern.set('/api/test');
    component.onUrlPatternInput('/api/test');
    fixture.detectChanges();

    expect(component.urlPatternError()).toBe('');
  });

  // jsonValid false iken save engellenmeli
  it('should block save when JSON is invalid', () => {
    const emittedRules: MockRule[] = [];
    component.ruleCreated.subscribe((rule: MockRule) => emittedRules.push(rule));

    component.showForm.set(true);
    component.urlPattern.set('/api/test');
    component.jsonValid.set(false);
    fixture.detectChanges();

    component.onSave();

    expect(emittedRules.length).toBe(0);
  });
});
