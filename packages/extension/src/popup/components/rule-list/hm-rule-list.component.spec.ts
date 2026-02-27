import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HmRuleListComponent } from './hm-rule-list.component';
import type { MockRule } from '@har-mock/core';

// Mock @har-mock/core to avoid side-effect imports in JSDOM
jest.mock('@har-mock/core', () => ({
  parseHar: jest.fn(),
  parameterize: jest.fn(),
  HarParseError: class HarParseError extends Error {},
}));

const mockRules: MockRule[] = [
  {
    id: 'rule-1',
    urlPattern: '/api/users/*',
    method: 'GET',
    statusCode: 200,
    responseBody: '{"data":[]}',
    responseHeaders: [],
    delay: 0,
    enabled: true,
  },
  {
    id: 'rule-2',
    urlPattern: '/api/auth/login',
    method: 'POST',
    statusCode: 429,
    responseBody: '{"error":"rate_limited"}',
    responseHeaders: [],
    delay: 500,
    enabled: true,
  },
];

describe('HmRuleListComponent', () => {
  let component: HmRuleListComponent;
  let fixture: ComponentFixture<HmRuleListComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HmRuleListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HmRuleListComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Subtask 5.1 — rules boşken boş durum mesajı (@for @empty — ul her zaman var)
  it('should show empty state message when rules is empty (AC #4)', () => {
    const emptyMsg = el.querySelector('[data-testid="empty-state-message"]');
    expect(emptyMsg).toBeTruthy();
    expect(emptyMsg?.textContent).toContain('Henüz rule tanımlanmadı');
    // @for @empty: ul her zaman render edilir, sadece içeriği değişir
    const list = el.querySelector('ul');
    expect(list).toBeTruthy();
    // Rule item olmamalı
    const items = el.querySelectorAll('[data-testid="rule-item"]');
    expect(items.length).toBe(0);
  });

  // Subtask 5.2 — rules doluyken satırlar render edilmeli
  it('should render rule rows when rules are provided (AC #1)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const emptyMsg = el.querySelector('[data-testid="empty-state-message"]');
    expect(emptyMsg).toBeNull();

    const items = el.querySelectorAll('[data-testid="rule-item"]');
    expect(items.length).toBe(2);
  });

  it('should display URL pattern for each rule (AC #1)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const patterns = el.querySelectorAll('[data-testid="rule-url-pattern"]');
    expect(patterns[0]?.textContent?.trim()).toBe('/api/users/*');
    expect(patterns[1]?.textContent?.trim()).toBe('/api/auth/login');
  });

  it('should display HTTP method for each rule (AC #1)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const methods = el.querySelectorAll('[data-testid="rule-method"]');
    expect(methods[0]?.textContent?.trim()).toBe('GET');
    expect(methods[1]?.textContent?.trim()).toBe('POST');
  });

  it('should display status code for each rule (AC #1)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const codes = el.querySelectorAll('[data-testid="rule-status-code"]');
    expect(codes[0]?.textContent?.trim()).toBe('200');
    expect(codes[1]?.textContent?.trim()).toBe('429');
  });

  // Subtask 5.3 — delay > 0 ise gösterilmeli; delay = 0 ise gösterilmemeli
  it('should show delay when delay > 0 (AC #1)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const items = el.querySelectorAll('[data-testid="rule-item"]');
    // rule-1: delay = 0 — gösterilmemeli
    const delay1 = items[0]?.querySelector('[data-testid="rule-delay"]');
    expect(delay1).toBeNull();

    // rule-2: delay = 500 — gösterilmeli
    const delay2 = items[1]?.querySelector('[data-testid="rule-delay"]');
    expect(delay2).toBeTruthy();
    expect(delay2?.textContent?.trim()).toBe('500ms');
  });

  it('should not show delay when delay = 0 (AC #1)', () => {
    const rulesWithZeroDelay: MockRule[] = [{ ...mockRules[0]!, delay: 0 }];
    fixture.componentRef.setInput('rules', rulesWithZeroDelay);
    fixture.detectChanges();

    const delay = el.querySelector('[data-testid="rule-delay"]');
    expect(delay).toBeNull();
  });

  // Subtask 5.4 — "Düzenle" tıklanınca editRuleRequested emit edilmeli
  it('should emit editRuleRequested with correct rule when edit button is clicked (AC #2)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const emittedRules: MockRule[] = [];
    component.editRuleRequested.subscribe((rule: MockRule) => emittedRules.push(rule));

    const editButtons = el.querySelectorAll<HTMLButtonElement>('[data-testid="edit-rule-button"]');
    editButtons[0]?.click();
    fixture.detectChanges();

    expect(emittedRules.length).toBe(1);
    expect(emittedRules[0]).toEqual(mockRules[0]);
  });

  it('should emit editRuleRequested for second rule when second edit button is clicked (AC #2)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const emittedRules: MockRule[] = [];
    component.editRuleRequested.subscribe((rule: MockRule) => emittedRules.push(rule));

    const editButtons = el.querySelectorAll<HTMLButtonElement>('[data-testid="edit-rule-button"]');
    editButtons[1]?.click();
    fixture.detectChanges();

    expect(emittedRules.length).toBe(1);
    expect(emittedRules[0]).toEqual(mockRules[1]);
  });

  // M1: Silme onayı — ilk tıklamada konfirmasyon gösterilmeli
  it('should show confirm UI (not emit) when delete button is first clicked (M1)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const emittedIds: string[] = [];
    component.deleteRuleRequested.subscribe((id: string) => emittedIds.push(id));

    const deleteButton = el.querySelectorAll<HTMLButtonElement>(
      '[data-testid="delete-rule-button"]',
    )[0]!;
    deleteButton.click();
    fixture.detectChanges();

    // emit olmamalı
    expect(emittedIds.length).toBe(0);
    // confirm UI görünmeli
    const confirmBtn = el.querySelector('[data-testid="confirm-delete-button"]');
    const cancelBtn = el.querySelector('[data-testid="cancel-delete-button"]');
    expect(confirmBtn).toBeTruthy();
    expect(cancelBtn).toBeTruthy();
    expect(component.pendingDeleteId()).toBe('rule-1');
  });

  // Subtask 5.5 — "Sil" onaylanınca deleteRuleRequested doğru ruleId ile emit edilmeli
  it('should emit deleteRuleRequested with correct ruleId after confirm (AC #3)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const emittedIds: string[] = [];
    component.deleteRuleRequested.subscribe((id: string) => emittedIds.push(id));

    // 1. adım: sil butonuna tıkla (onay gelir)
    const deleteButtons = el.querySelectorAll<HTMLButtonElement>(
      '[data-testid="delete-rule-button"]',
    );
    deleteButtons[0]?.click();
    fixture.detectChanges();

    // 2. adım: onayla
    const confirmBtn = el.querySelector<HTMLButtonElement>(
      '[data-testid="confirm-delete-button"]',
    )!;
    confirmBtn.click();
    fixture.detectChanges();

    expect(emittedIds.length).toBe(1);
    expect(emittedIds[0]).toBe('rule-1');
    expect(component.pendingDeleteId()).toBeNull();
  });

  it('should emit deleteRuleRequested for second rule after confirm (AC #3)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const emittedIds: string[] = [];
    component.deleteRuleRequested.subscribe((id: string) => emittedIds.push(id));

    // rule-2 sil butonuna tıkla: rule-1'in delete butonu gizlendi,
    // rule-2 hala görünüyor — önce rule-2 row'ındaki buton
    const deleteButtons = el.querySelectorAll<HTMLButtonElement>(
      '[data-testid="delete-rule-button"]',
    );
    deleteButtons[1]?.click();
    fixture.detectChanges();

    const confirmBtn = el.querySelector<HTMLButtonElement>(
      '[data-testid="confirm-delete-button"]',
    )!;
    confirmBtn.click();
    fixture.detectChanges();

    expect(emittedIds.length).toBe(1);
    expect(emittedIds[0]).toBe('rule-2');
  });

  // M1: İptal — emit olmamalı, confirm UI kalkmalı
  it('should cancel delete and hide confirm UI when cancel is clicked (M1)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const emittedIds: string[] = [];
    component.deleteRuleRequested.subscribe((id: string) => emittedIds.push(id));

    const deleteButtons = el.querySelectorAll<HTMLButtonElement>(
      '[data-testid="delete-rule-button"]',
    );
    deleteButtons[0]?.click();
    fixture.detectChanges();

    const cancelBtn = el.querySelector<HTMLButtonElement>('[data-testid="cancel-delete-button"]')!;
    cancelBtn.click();
    fixture.detectChanges();

    expect(emittedIds.length).toBe(0);
    expect(component.pendingDeleteId()).toBeNull();
    // Sil butonu tekrar görünmeli
    const deleteBtn = el.querySelector('[data-testid="delete-rule-button"]');
    expect(deleteBtn).toBeTruthy();
  });

  // M1: Edit tıklandığında açık onay kapatılmalı
  it('should clear pending delete when edit button is clicked (M1)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    // rule-1 için silme onayı aç
    component.onDeleteClick('rule-1');
    fixture.detectChanges();
    expect(component.pendingDeleteId()).toBe('rule-1');

    // rule-2 düzenle butonuna tıkla
    const editButtons = el.querySelectorAll<HTMLButtonElement>('[data-testid="edit-rule-button"]');
    editButtons[0]?.click(); // rule-1'in edit butonu (rule-2'nin sil onayı açık değil)
    fixture.detectChanges();

    expect(component.pendingDeleteId()).toBeNull();
  });

  // a11y — aria-label'lar doğru olmalı (Subtask 2.3, L2 fix)
  it('should have aria-label on edit button with URL pattern', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const editBtn = el.querySelector<HTMLButtonElement>('[data-testid="edit-rule-button"]');
    expect(editBtn?.getAttribute('aria-label')).toContain('/api/users/*');
  });

  it('should have aria-label on delete button with URL pattern', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const deleteBtn = el.querySelector<HTMLButtonElement>('[data-testid="delete-rule-button"]');
    expect(deleteBtn?.getAttribute('aria-label')).toContain('/api/users/*');
  });

  // L2: li aria-label method, url ve status code içermeli
  it('should have aria-label on li containing method, url and status code (L2)', () => {
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();

    const listItem = el.querySelector<HTMLElement>('[data-testid="rule-item"]');
    const ariaLabel = listItem?.getAttribute('aria-label') ?? '';
    expect(ariaLabel).toContain('GET');
    expect(ariaLabel).toContain('/api/users/*');
    expect(ariaLabel).toContain('200');
  });
});
