/**
 * StateManager — chrome.storage.local + In-Memory Cache Hibrit Yönetimi (ARCH3)
 * SW başladığında storage'dan yükler; değişiklikte ikisini de günceller.
 */
import type { MockRule } from '@har-mock/core';
import { STORAGE_KEYS, DEFAULT_SETTINGS, MAX_MATCH_HISTORY } from '../shared/constants';
import type {
  HarSessionData,
  ExtensionSettings,
  EditedResponse,
  MatchEvent,
  ExtensionState,
  SequentialCounterMap,
  StorageEntry,
} from '../shared/state.types';
import type { StateSyncPayload } from '../shared/payload.types';

export class StateManager {
  private state: ExtensionState;
  private sequentialCounters: SequentialCounterMap = {};
  private initialized = false;

  constructor() {
    this.state = this.getDefaultState();
  }

  /** SW başladığında chrome.storage.local'dan state yükle */
  async initialize(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS);
    const result = await chrome.storage.local.get(keys);

    const harData = result[STORAGE_KEYS.HAR_DATA] as HarSessionData | undefined;
    if (harData !== undefined) {
      this.state.harData = harData;
    }

    const activeRules = result[STORAGE_KEYS.ACTIVE_RULES] as MockRule[] | undefined;
    if (activeRules !== undefined) {
      this.state.activeRules = activeRules;
    }

    const matchHistory = result[STORAGE_KEYS.MATCH_HISTORY] as MatchEvent[] | undefined;
    if (matchHistory !== undefined) {
      this.state.matchHistory = matchHistory;
    }

    const editedResponses = result[STORAGE_KEYS.EDITED_RESPONSES] as
      | Record<string, EditedResponse>
      | undefined;
    if (editedResponses !== undefined) {
      this.state.editedResponses = editedResponses;
    }

    const settings = result[STORAGE_KEYS.SETTINGS] as ExtensionSettings | undefined;
    if (settings !== undefined) {
      this.state.settings = settings;
    }

    const accordionStates = result[STORAGE_KEYS.ACCORDION_STATES] as
      | Record<string, boolean>
      | undefined;
    if (accordionStates !== undefined) {
      this.state.accordionStates = accordionStates;
    }

    const storageEntries = result[STORAGE_KEYS.STORAGE_ENTRIES] as StorageEntry[] | undefined;
    if (storageEntries !== undefined) {
      this.state.storageEntries = storageEntries;
    }

    this.initialized = true;
  }

  /** State yüklenip yüklenmediğini kontrol et — Lazy initialization için */
  isInitialized(): boolean {
    return this.initialized;
  }

  /** Tüm state'i döndür (STATE_SYNC için) */
  getFullState(): StateSyncPayload {
    return {
      harData: this.state.harData,
      activeRules: this.state.activeRules,
      settings: this.state.settings,
      editedResponses: this.state.editedResponses,
      matchHistory: this.state.matchHistory,
      accordionStates: this.state.accordionStates,
      storageEntries: this.state.storageEntries,
    };
  }

  // --- HAR Data ---

  getHarData(): HarSessionData | null {
    return this.state.harData;
  }

  async setHarData(data: HarSessionData): Promise<void> {
    this.state.harData = data;
    await this.persistToStorage(STORAGE_KEYS.HAR_DATA, data);
  }

  async clearHarData(): Promise<void> {
    this.state.harData = null;
    await chrome.storage.local.remove(STORAGE_KEYS.HAR_DATA);
  }

  // --- Rules ---

  getActiveRules(): readonly MockRule[] {
    return this.state.activeRules;
  }

  async addRule(rule: MockRule): Promise<void> {
    this.state.activeRules = [...this.state.activeRules, rule];
    await this.persistToStorage(STORAGE_KEYS.ACTIVE_RULES, this.state.activeRules);
  }

  async updateRule(rule: MockRule): Promise<void> {
    this.state.activeRules = this.state.activeRules.map((r) => (r.id === rule.id ? rule : r));
    await this.persistToStorage(STORAGE_KEYS.ACTIVE_RULES, this.state.activeRules);
  }

  async deleteRule(ruleId: string): Promise<void> {
    this.state.activeRules = this.state.activeRules.filter((r) => r.id !== ruleId);
    await this.persistToStorage(STORAGE_KEYS.ACTIVE_RULES, this.state.activeRules);
  }

  // --- Settings ---

  getSettings(): ExtensionSettings {
    return this.state.settings;
  }

  async updateSettings(partial: Partial<ExtensionSettings>): Promise<void> {
    this.state.settings = { ...this.state.settings, ...partial };
    await this.persistToStorage(STORAGE_KEYS.SETTINGS, this.state.settings);
  }

  // --- Edited Responses ---

  getEditedResponses(): Record<string, EditedResponse> {
    return this.state.editedResponses;
  }

  async setEditedResponse(key: string, response: EditedResponse): Promise<void> {
    this.state.editedResponses = { ...this.state.editedResponses, [key]: response };
    await this.persistToStorage(STORAGE_KEYS.EDITED_RESPONSES, this.state.editedResponses);
  }

  async deleteEditedResponse(key: string): Promise<void> {
    const { [key]: _removed, ...rest } = this.state.editedResponses;
    this.state.editedResponses = rest;
    await this.persistToStorage(STORAGE_KEYS.EDITED_RESPONSES, this.state.editedResponses);
  }

  // --- Match History ---

  getMatchHistory(): MatchEvent[] {
    return this.state.matchHistory;
  }

  async addMatchEvent(event: MatchEvent): Promise<void> {
    this.state.matchHistory = [...this.state.matchHistory, event];
    // Max 500 event sınırı — eski event'leri kırp
    if (this.state.matchHistory.length > MAX_MATCH_HISTORY) {
      this.state.matchHistory = this.state.matchHistory.slice(
        this.state.matchHistory.length - MAX_MATCH_HISTORY,
      );
    }
    await this.persistToStorage(STORAGE_KEYS.MATCH_HISTORY, this.state.matchHistory);
  }

  async clearMatchHistory(): Promise<void> {
    this.state.matchHistory = [];
    await this.persistToStorage(STORAGE_KEYS.MATCH_HISTORY, []);
  }

  // --- Accordion States ---

  getAccordionStates(): Record<string, boolean> {
    return this.state.accordionStates;
  }

  async updateAccordionState(key: string, expanded: boolean): Promise<void> {
    this.state.accordionStates = { ...this.state.accordionStates, [key]: expanded };
    await this.persistToStorage(STORAGE_KEYS.ACCORDION_STATES, this.state.accordionStates);
  }

  // --- Storage Entries ---

  getStorageEntries(): readonly StorageEntry[] {
    return this.state.storageEntries;
  }

  async setStorageEntries(entries: readonly StorageEntry[]): Promise<void> {
    this.state.storageEntries = entries;
    await this.persistToStorage(STORAGE_KEYS.STORAGE_ENTRIES, entries);
  }

  // --- Sequential Counter (in-memory only, storage'a kaydedilmez) ---

  getSequentialIndex(patternTemplate: string): number {
    return this.sequentialCounters[patternTemplate] ?? 0;
  }

  incrementSequentialIndex(patternTemplate: string): void {
    const current = this.sequentialCounters[patternTemplate] ?? 0;
    this.sequentialCounters[patternTemplate] = current + 1;
  }

  resetSequentialCounters(): void {
    this.sequentialCounters = {};
  }

  /** Tüm state'i fabrika ayarlarına sıfırla (accordion state'leri korunur) */
  async resetAll(): Promise<void> {
    const accordionStates = this.state.accordionStates;
    this.state = this.getDefaultState();
    this.state.accordionStates = accordionStates;
    this.sequentialCounters = {};
    await chrome.storage.local.remove([
      STORAGE_KEYS.HAR_DATA,
      STORAGE_KEYS.ACTIVE_RULES,
      STORAGE_KEYS.MATCH_HISTORY,
      STORAGE_KEYS.EDITED_RESPONSES,
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.STORAGE_ENTRIES,
    ]);
  }

  // --- Private Utilities ---

  private getDefaultState(): ExtensionState {
    return {
      harData: null,
      activeRules: [],
      settings: { ...DEFAULT_SETTINGS },
      editedResponses: {},
      matchHistory: [],
      accordionStates: {},
      storageEntries: [],
    };
  }

  private async persistToStorage(key: string, value: unknown): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }
}
