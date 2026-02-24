import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonitorTabComponent } from './monitor-tab.component';

describe('MonitorTabComponent', () => {
  let component: MonitorTabComponent;
  let fixture: ComponentFixture<MonitorTabComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonitorTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MonitorTabComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display empty state message', () => {
    const text = el.textContent;
    expect(text).toContain('Henüz intercept edilmiş request yok');
  });

  it('should display instruction text', () => {
    const text = el.textContent;
    expect(text).toContain('Sayfayı yenileyip bir istek başlatın');
  });
});
