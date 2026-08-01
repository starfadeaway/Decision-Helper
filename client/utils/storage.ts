/**
 * 随机决策助手 - 本地存储工具
 * 使用 AsyncStorage 持久化自定义决策和历史记录
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DecisionItem, HistoryRecord, MemoItem } from '@/types';
import { PRESET_TEMPLATES } from '@/data/templates';

const KEYS = {
  CUSTOM_DECISIONS: '@decision_custom',
  HISTORY_RECORDS: '@decision_history',
  MEMOS: '@decision_memos',
};

const MAX_HISTORY = 100;

// ===== 自定义决策 =====

/** 获取所有自定义决策 */
export async function getCustomDecisions(): Promise<DecisionItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CUSTOM_DECISIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 保存自定义决策（新增或更新） */
export async function saveCustomDecision(decision: DecisionItem): Promise<void> {
  const list = await getCustomDecisions();
  const idx = list.findIndex((d) => d.id === decision.id);
  if (idx >= 0) {
    list[idx] = decision;
  } else {
    list.push(decision);
  }
  await AsyncStorage.setItem(KEYS.CUSTOM_DECISIONS, JSON.stringify(list));
}

/** 删除自定义决策 */
export async function deleteCustomDecision(id: string): Promise<void> {
  const list = await getCustomDecisions();
  const filtered = list.filter((d) => d.id !== id);
  await AsyncStorage.setItem(KEYS.CUSTOM_DECISIONS, JSON.stringify(filtered));
}

/** 切换自定义决策置顶状态 */
export async function togglePinCustomDecision(id: string): Promise<void> {
  const list = await getCustomDecisions();
  const updated = list.map((d) =>
    d.id === id ? { ...d, pinned: !d.pinned } : d
  );
  await AsyncStorage.setItem(KEYS.CUSTOM_DECISIONS, JSON.stringify(updated));
}

// ===== 历史记录 =====

/** 获取历史记录（按时间倒序） */
export async function getHistoryRecords(): Promise<HistoryRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.HISTORY_RECORDS);
    const records: HistoryRecord[] = raw ? JSON.parse(raw) : [];
    return records.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

/** 添加历史记录（超过100条自动覆盖最早的） */
export async function addHistoryRecord(record: HistoryRecord): Promise<void> {
  const records = await getHistoryRecords();
  records.unshift(record);
  if (records.length > MAX_HISTORY) {
    records.length = MAX_HISTORY;
  }
  await AsyncStorage.setItem(KEYS.HISTORY_RECORDS, JSON.stringify(records));
}

/** 清空所有历史记录 */
export async function clearHistory(): Promise<void> {
  await AsyncStorage.setItem(KEYS.HISTORY_RECORDS, JSON.stringify([]));
}

/** 删除单条历史记录 */
export async function deleteHistoryRecord(id: string): Promise<void> {
  const records = await getHistoryRecords();
  const filtered = records.filter((r) => r.id !== id);
  await AsyncStorage.setItem(KEYS.HISTORY_RECORDS, JSON.stringify(filtered));
}

/** 切换历史记录置顶状态 */
export async function togglePinHistory(id: string): Promise<void> {
  const records = await getHistoryRecords();
  const updated = records.map((r) => (r.id === id ? { ...r, pinned: !r.pinned } : r));
  await AsyncStorage.setItem(KEYS.HISTORY_RECORDS, JSON.stringify(updated));
}

// ===== 全局操作 =====

/** 清除所有数据 */
export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.CUSTOM_DECISIONS, KEYS.HISTORY_RECORDS, KEYS.MEMOS]);
}

// ===== 备忘录 =====

/** 获取所有备忘录（按更新时间倒序） */
export async function getMemos(): Promise<MemoItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.MEMOS);
    const memos: MemoItem[] = raw ? JSON.parse(raw) : [];
    return memos.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/** 保存备忘录（新增或更新） */
export async function saveMemo(memo: MemoItem): Promise<void> {
  const memos = await getMemos();
  const idx = memos.findIndex((m) => m.id === memo.id);
  if (idx >= 0) {
    memos[idx] = memo;
  } else {
    memos.unshift(memo);
  }
  await AsyncStorage.setItem(KEYS.MEMOS, JSON.stringify(memos));
}

/** 删除备忘录 */
export async function deleteMemo(id: string): Promise<void> {
  const memos = await getMemos();
  const filtered = memos.filter((m) => m.id !== id);
  await AsyncStorage.setItem(KEYS.MEMOS, JSON.stringify(filtered));
}

/** 切换备忘录置顶状态 */
export async function togglePinMemo(id: string): Promise<void> {
  const memos = await getMemos();
  const updated = memos.map((m) =>
    m.id === id ? { ...m, pinned: !m.pinned } : m
  );
  await AsyncStorage.setItem(KEYS.MEMOS, JSON.stringify(updated));
}

/** 根据 ID 获取备忘录 */
export async function getMemoById(id: string): Promise<MemoItem | null> {
  const memos = await getMemos();
  return memos.find((m) => m.id === id) ?? null;
}

/** 根据 ID 获取决策（含预置 + 自定义） */
export async function getDecisionById(id: string): Promise<DecisionItem | null> {
  // 先查预置
  const preset = PRESET_TEMPLATES.find((t) => t.id === id);
  if (preset) return preset;
  // 再查自定义
  const customs = await getCustomDecisions();
  return customs.find((d) => d.id === id) ?? null;
}

/** 生成唯一 ID */
export function generateId(): string {
  return `decision_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ===== 设置 =====

const SETTINGS_KEY = '@app_settings';

export interface AppSettings {
  darkMode: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  vibrationEnabled: boolean;
  wheelColorScheme?: string;
  wheelPointerStyle?: 'classic' | 'arrow' | 'diamond' | 'circle';
}

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  soundEnabled: true,
  hapticEnabled: true,
  vibrationEnabled: true,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!json) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
}

// ===== 决策统计 =====

export interface DecisionStats {
  totalDecisions: number;
  categoryCounts: Record<string, number>;
  lastDecisionTime: number | null;
}

const STATS_KEY = '@decision_stats';

export async function getDecisionStats(): Promise<DecisionStats> {
  try {
    const json = await AsyncStorage.getItem(STATS_KEY);
    if (!json) return { totalDecisions: 0, categoryCounts: {}, lastDecisionTime: null };
    return JSON.parse(json);
  } catch {
    return { totalDecisions: 0, categoryCounts: {}, lastDecisionTime: null };
  }
}

export async function recordDecision(category?: string): Promise<void> {
  const stats = await getDecisionStats();
  stats.totalDecisions += 1;
  stats.lastDecisionTime = Date.now();
  if (category) {
    stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + 1;
  }
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// ===== 备忘录标签 =====

const MEMO_TAGS_KEY = '@memo_tags';

const DEFAULT_MEMO_TAGS = ['工作', '生活', '学习', '重要', '待办'];

export async function getMemoTags(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(MEMO_TAGS_KEY);
    if (!json) return DEFAULT_MEMO_TAGS;
    return JSON.parse(json);
  } catch {
    return DEFAULT_MEMO_TAGS;
  }
}

export async function saveMemoTags(tags: string[]): Promise<void> {
  await AsyncStorage.setItem(MEMO_TAGS_KEY, JSON.stringify(tags));
}

export async function addMemoTag(tag: string): Promise<string[]> {
  const tags = await getMemoTags();
  if (!tags.includes(tag)) {
    tags.push(tag);
    await saveMemoTags(tags);
  }
  return tags;
}

export async function removeMemoTag(tag: string): Promise<string[]> {
  const tags = await getMemoTags().then(t => t.filter(t => t !== tag));
  await saveMemoTags(tags);
  return tags;
}

// ===== 转盘外观设置 =====

const WHEEL_APPEARANCE_KEY = '@wheel_appearance';

export interface WheelAppearance {
  colorScheme: 'default' | 'warm' | 'cool' | 'pastel' | 'vibrant';
  pointerStyle: 'classic' | 'arrow' | 'diamond' | 'circle';
}

const DEFAULT_WHEEL_APPEARANCE: WheelAppearance = {
  colorScheme: 'default',
  pointerStyle: 'classic',
};

export async function getWheelAppearance(): Promise<WheelAppearance> {
  try {
    const json = await AsyncStorage.getItem(WHEEL_APPEARANCE_KEY);
    if (!json) return DEFAULT_WHEEL_APPEARANCE;
    return JSON.parse(json);
  } catch {
    return DEFAULT_WHEEL_APPEARANCE;
  }
}

export async function saveWheelAppearance(appearance: WheelAppearance): Promise<void> {
  await AsyncStorage.setItem(WHEEL_APPEARANCE_KEY, JSON.stringify(appearance));
}

// ===== 新手引导 =====

const ONBOARDING_KEY = '@onboarding_completed';

export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}
