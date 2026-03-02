import { TestBed } from '@angular/core/testing';
import { StorageInjectComponent } from './storage-inject.component';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';
import { MessageType } from '../../../shared/messaging.types';
import type { StorageEntry } from '../../../shared/state.types';
import { signal } from '@angular/core';

describe('StorageInjectComponent', () => {
  let sendMessageSpy: jest.SpyInstance;

  const mockMessaging = {
    state: signal(null),
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    sendMessageSpy = jest.spyOn(mockMessaging, 'sendMessage').mockResolvedValue({ success: true });

    await TestBed.configureTestingModule({
      imports: [StorageInjectComponent],
      providers: [{ provide: ExtensionMessagingService, useValue: mockMessaging }],
    }).compileComponents();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createFixture(entries: StorageEntry[] = []) {
    const fixture = TestBed.createComponent(StorageInjectComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('boş key ile addEntry çağrıldığında listeye eklenmez ve keyError set olur', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.newKey.set('');
    component.addEntry();
    expect(component.localEntries().length).toBe(0);
    expect(component.keyError()).toBe(true);
  });

  it('geçerli key/value ile addEntry çağrıldığında listeye eklenir ve form sıfırlanır', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.newKey.set('token');
    component.newValue.set('abc123');
    component.newType.set('localStorage');
    component.addEntry();
    expect(component.localEntries().length).toBe(1);
    expect(component.localEntries()[0]).toEqual({
      key: 'token',
      value: 'abc123',
      type: 'localStorage',
    });
    expect(component.newKey()).toBe('');
    expect(component.newValue()).toBe('');
    expect(component.keyError()).toBe(false);
  });

  it("removeEntry doğru index'i siler", () => {
    const fixture = createFixture([
      { key: 'a', value: '1', type: 'localStorage' },
      { key: 'b', value: '2', type: 'sessionStorage' },
    ]);
    const component = fixture.componentInstance;
    component.removeEntry(0);
    expect(component.localEntries().length).toBe(1);
    expect(component.localEntries()[0]!.key).toBe('b');
  });

  it('save() doğru payload ile sendMessage çağırır', async () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.newKey.set('myKey');
    component.newValue.set('myVal');
    component.newType.set('sessionStorage');
    component.addEntry();

    component.save();
    await Promise.resolve(); // flush microtasks

    expect(sendMessageSpy).toHaveBeenCalledWith(
      MessageType.UPDATE_STORAGE_ENTRIES,
      { entries: [{ key: 'myKey', value: 'myVal', type: 'sessionStorage' }] },
      expect.any(String),
    );
  });

  it('ngOnChanges: input entries değişince localEntries güncellenir', () => {
    const fixture = createFixture([{ key: 'x', value: '1', type: 'localStorage' }]);
    const component = fixture.componentInstance;
    expect(component.localEntries().length).toBe(1);

    fixture.componentRef.setInput('entries', [
      { key: 'x', value: '1', type: 'localStorage' },
      { key: 'y', value: '2', type: 'sessionStorage' },
    ]);
    fixture.detectChanges();
    expect(component.localEntries().length).toBe(2);
  });
});
