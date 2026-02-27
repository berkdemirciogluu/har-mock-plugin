import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { MockRule } from '@har-mock/core';
import { StatusColorPipe } from '../../pipes/status-color.pipe';
import { MethodBadgePipe } from '../../pipes/method-badge.pipe';

@Component({
  selector: 'hm-rule-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hm-rule-list.component.html',
  imports: [StatusColorPipe, MethodBadgePipe],
})
export class HmRuleListComponent {
  // Signal-based inputs (Subtask 1.2)
  readonly rules = input<readonly MockRule[]>([]);

  // Signal-based outputs (Subtask 1.3)
  readonly editRuleRequested = output<MockRule>();
  readonly deleteRuleRequested = output<string>();

  // M1: Silme onayı için bekleyen ruleId — null = onay yok
  readonly pendingDeleteId = signal<string | null>(null);

  // Subtask 1.4 — Edit butonuna tıklanınca üst component'e sinyal gönder
  onEditClick(rule: MockRule): void {
    this.pendingDeleteId.set(null); // Açık onay varsa kapat
    this.editRuleRequested.emit(rule);
  }

  // M1: İlk tıklamada onay iste
  onDeleteClick(ruleId: string): void {
    this.pendingDeleteId.set(ruleId);
  }

  // M1: Onaylandı — gerçekten sil
  onConfirmDelete(ruleId: string): void {
    this.pendingDeleteId.set(null);
    this.deleteRuleRequested.emit(ruleId);
  }

  // M1: İptal — onayı kapat
  onCancelDelete(): void {
    this.pendingDeleteId.set(null);
  }
}
