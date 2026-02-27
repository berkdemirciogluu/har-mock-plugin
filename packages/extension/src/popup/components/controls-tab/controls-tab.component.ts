import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AccordionComponent } from '../accordion/accordion.component';
import { HarUploadComponent } from '../har-upload/hm-har-upload.component';
import {
  StrategyToggleComponent,
  type ReplayMode,
} from '../strategy-toggle/hm-strategy-toggle.component';
import { SettingsSectionComponent } from '../settings-section/hm-settings-section.component';
import { HmExcludeListComponent } from '../exclude-list/hm-exclude-list.component';
import { HmRuleFormComponent } from '../rule-form/hm-rule-form.component';
import { HmRuleListComponent } from '../rule-list/hm-rule-list.component';
import { ExtensionMessagingService } from '../../services/extension-messaging.service';
import { MessageType } from '../../../shared/messaging.types';
import type {
  UpdateSettingsPayload,
  RulePayload,
  DeleteRulePayload,
} from '../../../shared/payload.types';
import type { MockRule } from '@har-mock/core';

@Component({
  selector: 'hm-controls-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccordionComponent,
    HarUploadComponent,
    StrategyToggleComponent,
    SettingsSectionComponent,
    HmExcludeListComponent,
    HmRuleFormComponent,
    HmRuleListComponent,
  ],
  host: { class: 'flex flex-col flex-1 min-h-0 overflow-y-auto' },
  template: `
    <div class="space-y-2 p-2">
      <hm-accordion
        title="HAR"
        [expanded]="true"
        persistKey="har"
        [badge]="endpointCount() !== null ? endpointCount()!.toString() : ''"
        [badgeVariant]="endpointCount() !== null ? 'success' : 'default'"
      >
        <hm-har-upload />
        @if (hasHar()) {
          <div class="mt-2">
            <p class="mb-1 text-xs font-medium text-slate-500">Replay Mode</p>
            <hm-strategy-toggle
              [replayMode]="replayMode()"
              (modeChange)="onReplayModeChange($event)"
            />
          </div>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500">HAR Timing Replay</span>
            <button
              type="button"
              role="switch"
              [attr.aria-checked]="timingReplay()"
              aria-label="HAR Timing Replay toggle"
              (click)="onTimingReplayChange(!timingReplay())"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              [class.bg-indigo-600]="timingReplay()"
              [class.bg-slate-200]="!timingReplay()"
            >
              <span
                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                [style.transform]="timingReplay() ? 'translateX(18px)' : 'translateX(3px)'"
              ></span>
            </button>
          </div>
        }
      </hm-accordion>

      <hm-accordion
        title="Rules"
        [expanded]="false"
        persistKey="rules"
        [badge]="activeRulesBadge()"
        [badgeVariant]="activeRulesBadgeVariant()"
      >
        <hm-rule-list
          [rules]="activeRules()"
          (editRuleRequested)="onEditRuleRequested($event)"
          (deleteRuleRequested)="onRuleDeleted($event)"
        />
        <hm-rule-form
          [editRule]="editingRule()"
          (ruleCreated)="onRuleCreated($event)"
          (ruleUpdated)="onRuleUpdated($event)"
          (editCancelled)="editingRule.set(null)"
        />
      </hm-accordion>

      <hm-accordion title="Settings" [expanded]="false" persistKey="settings">
        <hm-settings-section
          [extensionEnabled]="extensionEnabled()"
          (enabledChange)="onEnabledChange($event)"
        />
        <div class="mt-3">
          <p class="mb-1 text-xs font-medium text-slate-500">Exclude List</p>
          <hm-exclude-list
            [excludeList]="excludeList()"
            (excludeListChange)="onExcludeListChange($event)"
          />
        </div>
      </hm-accordion>
    </div>
  `,
})
export class ControlsTabComponent {
  private readonly messaging = inject(ExtensionMessagingService);

  /** Background state'den türetilen endpoint count — tab switch'te kaybolmaz */
  readonly endpointCount = computed(() => {
    const harData = this.messaging.state()?.harData;
    return harData ? harData.patterns.length : null;
  });

  // Subtask 4.2 — edit modunda hangi rule'ın düzenlendiğini takip eder
  readonly editingRule = signal<MockRule | null>(null);

  readonly hasHar = computed(() => {
    const state = this.messaging.state();
    return state !== null && state.harData !== null;
  });
  readonly activeRules = computed(() => this.messaging.state()?.activeRules ?? []);
  readonly activeRulesBadge = computed(() => this.activeRules().length.toString());
  readonly activeRulesBadgeVariant = computed(() =>
    this.activeRules().length > 0 ? 'info' : 'default',
  );
  readonly replayMode = computed<ReplayMode>(
    () => this.messaging.state()?.settings?.replayMode ?? 'last-match',
  );
  readonly timingReplay = computed<boolean>(
    () => this.messaging.state()?.settings?.timingReplay ?? false,
  );
  readonly extensionEnabled = computed<boolean>(
    () => this.messaging.state()?.settings?.enabled ?? true,
  );
  readonly excludeList = computed<readonly string[]>(
    () => this.messaging.state()?.settings?.excludeList ?? [],
  );

  onReplayModeChange(mode: ReplayMode): void {
    const payload: UpdateSettingsPayload = { settings: { replayMode: mode } };
    void this.messaging
      .sendMessage(MessageType.UPDATE_SETTINGS, payload, crypto.randomUUID())
      .catch((err: unknown) => {
        console.error('[HAR Mock] Replay mode güncellenemedi:', err);
      });
  }

  onTimingReplayChange(enabled: boolean): void {
    const payload: UpdateSettingsPayload = { settings: { timingReplay: enabled } };
    void this.messaging
      .sendMessage(MessageType.UPDATE_SETTINGS, payload, crypto.randomUUID())
      .catch((err: unknown) => {
        console.error('[HAR Mock] Timing replay güncellenemedi:', err);
      });
  }

  onEnabledChange(enabled: boolean): void {
    const payload: UpdateSettingsPayload = { settings: { enabled } };
    void this.messaging
      .sendMessage(MessageType.UPDATE_SETTINGS, payload, crypto.randomUUID())
      .catch((err: unknown) => {
        console.error('[HAR Mock] Extension toggle güncellenemedi:', err);
      });
  }

  onExcludeListChange(list: readonly string[]): void {
    const payload: UpdateSettingsPayload = { settings: { excludeList: list } };
    void this.messaging
      .sendMessage(MessageType.UPDATE_SETTINGS, payload, crypto.randomUUID())
      .catch((err: unknown) => {
        console.error('[HAR Mock] Exclude list güncellenemedi:', err);
      });
  }

  onRuleCreated(rule: MockRule): void {
    const payload: RulePayload = { rule };
    void this.messaging
      .sendMessage(MessageType.ADD_RULE, payload, crypto.randomUUID())
      .catch((err: unknown) => {
        console.error('[HAR Mock] Rule eklenemedi:', err);
      });
  }

  // Subtask 4.3 — edit isteniyor: editingRule'u ayarla (form otomatik prefill olur)
  // Spread ile yeni obje referansı oluşturuluyor → aynı rule için tekrar edit
  // tıklandığında effect() her zaman tetiklenir (M2 edge case fix)
  onEditRuleRequested(rule: MockRule): void {
    this.editingRule.set({ ...rule });
  }

  // Subtask 4.4 — rule güncellendi: UPDATE_RULE mesajı gönder, edit modundan çık
  onRuleUpdated(rule: MockRule): void {
    this.editingRule.set(null);
    const payload: RulePayload = { rule };
    void this.messaging
      .sendMessage(MessageType.UPDATE_RULE, payload, crypto.randomUUID())
      .catch((err: unknown) => {
        console.error('[HAR Mock] Rule güncellenemedi:', err);
      });
  }

  // Subtask 4.5 — rule silindi: DELETE_RULE mesajı gönder
  onRuleDeleted(ruleId: string): void {
    // Silinen rule edit modundaysa, editingRule'u temizle
    if (this.editingRule()?.id === ruleId) {
      this.editingRule.set(null);
    }
    const payload: DeleteRulePayload = { ruleId };
    void this.messaging
      .sendMessage(MessageType.DELETE_RULE, payload, crypto.randomUUID())
      .catch((err: unknown) => {
        console.error('[HAR Mock] Rule silinemedi:', err);
      });
  }
}
