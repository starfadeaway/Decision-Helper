# 数据存储文档 (Storage)

## 概述

`storage.ts` 是应用的本地数据存储层，使用 AsyncStorage 实现数据持久化。

**文件路径**: `client/utils/storage.ts`

## 存储键名

| 键名 | 数据类型 | 说明 |
|------|----------|------|
| `@decision_custom` | `DecisionItem[]` | 自定义决策列表 |
| `@decision_history` | `HistoryRecord[]` | 历史记录（最多100条） |
| `@decision_memos` | `MemoItem[]` | 备忘录列表 |
| `@app_settings` | `AppSettings` | 应用设置 |
| `@memo_tags` | `string[]` | 备忘录标签 |
| `@decision_stats` | `DecisionStats` | 决策统计 |

## API 接口

### 自定义决策

```typescript
// 获取所有自定义决策
async function getCustomDecisions(): Promise<DecisionItem[]>

// 保存自定义决策（新增或更新）
async function saveCustomDecision(decision: DecisionItem): Promise<void>

// 删除自定义决策
async function deleteCustomDecision(id: string): Promise<void>
```

### 历史记录

```typescript
// 获取历史记录（按时间倒序）
async function getHistoryRecords(): Promise<HistoryRecord[]>

// 添加历史记录（超过100条自动覆盖最早的）
async function addHistoryRecord(record: HistoryRecord): Promise<void>

// 清空所有历史记录
async function clearHistory(): Promise<void>

// 删除单条历史记录
async function deleteHistoryRecord(id: string): Promise<void>

// 切换历史记录置顶状态
async function togglePinHistory(id: string): Promise<void>
```

### 备忘录

```typescript
// 获取所有备忘录（按更新时间倒序）
async function getMemos(): Promise<MemoItem[]>

// 保存备忘录（新增或更新）
async function saveMemo(memo: MemoItem): Promise<void>

// 删除备忘录
async function deleteMemo(id: string): Promise<void>

// 切换备忘录置顶状态
async function togglePinMemo(id: string): Promise<void>

// 根据 ID 获取备忘录
async function getMemoById(id: string): Promise<MemoItem | null>
```

### 设置

```typescript
// 获取应用设置
async function getSettings(): Promise<AppSettings>

// 保存应用设置（部分更新）
async function saveSettings(settings: Partial<AppSettings>): Promise<void>
```

### 决策统计

```typescript
// 获取决策统计
async function getDecisionStats(): Promise<DecisionStats>

// 记录一次决策
async function recordDecision(category?: string): Promise<void>
```

### 备忘录标签

```typescript
// 获取标签列表
async function getMemoTags(): Promise<string[]>

// 保存标签列表
async function saveMemoTags(tags: string[]): Promise<void>

// 添加新标签
async function addMemoTag(tag: string): Promise<string[]>
```

### 通用操作

```typescript
// 根据 ID 获取决策（含预置 + 自定义）
async function getDecisionById(id: string): Promise<DecisionItem | null>

// 生成唯一 ID
function generateId(): string

// 清除所有数据
async function clearAllData(): Promise<void>
```

## 数据类型

### DecisionItem

```typescript
interface DecisionItem {
  id: string;
  name: string;
  category: DecisionCategory;
  options: string[];
  weights?: number[];  // 权重数组
  isPreset: boolean;
  isHighFrequency?: boolean;
  icon?: string;
}
```

### HistoryRecord

```typescript
interface HistoryRecord {
  id: string;
  decisionName: string;
  decisionId: string;
  result: string;
  options: string[];
  timestamp: number;
  pinned?: boolean;
  category?: string;
}
```

### MemoItem

```typescript
interface MemoItem {
  id: string;
  title: string;
  content: string;
  reminderTime: number | null;  // 毫秒时间戳
  calendarEventId: string | null;  // 系统日历事件 ID
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  tags?: string[];
}
```

### AppSettings

```typescript
interface AppSettings {
  darkMode: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  vibrationEnabled: boolean;
  wheelColorScheme?: string;
  wheelPointerStyle?: 'classic' | 'arrow' | 'diamond' | 'circle';
}
```

### DecisionStats

```typescript
interface DecisionStats {
  totalDecisions: number;
  categoryCounts: Record<string, number>;
  lastDecisionTime: number | null;
}
```

## 使用示例

```typescript
import { 
  getCustomDecisions, 
  saveCustomDecision, 
  deleteCustomDecision,
  generateId 
} from '@/utils/storage';

// 获取自定义决策
const decisions = await getCustomDecisions();

// 创建新决策
const newDecision = {
  id: generateId(),
  name: '我的决策',
  category: '生活日常',
  options: ['选项1', '选项2', '选项3'],
  isPreset: false,
};
await saveCustomDecision(newDecision);

// 删除决策
await deleteCustomDecision(newDecision.id);
```

## 注意事项

1. **历史记录上限**: 最多保存100条，超过后自动删除最早的记录
2. **数据格式**: 所有数据以 JSON 字符串形式存储
3. **错误处理**: 所有异步操作都包含 try-catch，失败时返回空数组或默认值
4. **排序**: 历史记录按时间倒序，备忘录按更新时间倒序
