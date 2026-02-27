import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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

  // Subtask 1.4 — Edit butonuna tıklanınca üst component'e sinyal gönder
  onEditClick(rule: MockRule): void {
    this.editRuleRequested.emit(rule);
  }

  // Subtask 1.5 — Sil butonuna tıklanınca üst component'e ruleId gönder
  onDeleteClick(ruleId: string): void {
    this.deleteRuleRequested.emit(ruleId);
  }
}
