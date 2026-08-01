# 随机决策助手 - 项目文档

## 项目概述

随机决策助手是一款基于 Expo 54 + React Native 开发的移动应用，帮助用户通过转盘随机选择来解决日常决策困难问题。应用提供丰富的预置场景模板，支持自定义决策，并集成了备忘录、历史记录等功能。

## 技术栈

| 技术 | 说明 |
|------|------|
| **Expo 54** | React Native 开发框架 |
| **React Native** | 跨平台移动应用开发 |
| **Expo Router** | 文件系统路由 |
| **react-native-svg** | SVG 图形渲染（转盘） |
| **react-native-reanimated** | 高性能动画 |
| **AsyncStorage** | 本地数据持久化 |
| **expo-notifications** | 本地通知推送 |
| **expo-haptics** | 触感反馈 |
| **expo-clipboard** | 剪贴板操作 |
| **Uniwind + Tailwind CSS** | 样式系统 |

## 项目结构

```
client/
├── app/                        # Expo Router 路由目录
│   ├── _layout.tsx             # 根布局（Stack导航）
│   ├── (tabs)/                 # Tab导航分组
│   │   ├── _layout.tsx         # Tab布局配置
│   │   ├── index.tsx           # 首页路由
│   │   ├── explore.tsx         # 全部页路由
│   │   ├── history.tsx         # 历史页路由
│   │   ├── memo.tsx            # 备忘录页路由
│   │   └── settings.tsx        # 设置页路由
│   ├── decision.tsx            # 决策页路由
│   ├── edit.tsx                # 编辑页路由
│   ├── memo-edit.tsx           # 备忘录编辑页路由
│   └── my-decisions.tsx        # 我的决策页路由
│
├── screens/                    # 页面实现目录
│   ├── home/                   # 首页（高频快捷区）
│   ├── explore/                # 全部页（所有模板）
│   ├── decision/               # 决策执行页（转盘）
│   ├── edit/                   # 选项编辑页
│   ├── history/                # 历史记录页
│   ├── memo/                   # 备忘录列表页
│   ├── my-decisions/           # 我的决策页（自定义决策管理）
│   ├── memo-edit/              # 备忘录编辑页
│   └── settings/               # 设置页
│
├── components/                 # 可复用组件
│   ├── Screen.tsx              # 页面容器组件
│   ├── SpinningWheel.tsx       # 转盘组件
│   ├── SvgIcon.tsx             # SVG图标组件
│   ├── PageGuide.tsx           # 页面引导组件
│   ├── OnboardingScreen.tsx    # 新手引导组件
│   ├── UndoToast.tsx           # 撤销提示组件
│   ├── ConfirmDialog.tsx       # 确认对话框
│   ├── SmartDateInput.tsx      # 智能日期输入
│   ├── SimpleCalendar.tsx      # 简易日历组件
│   ├── HistoryStats.tsx        # 历史统计图表组件
│   ├── PagerViewWrapper.tsx      # 分页滑动容器（跨平台）
│   ├── SwipeableTabContainer.tsx # 可滑动Tab容器
│   └── Provider.tsx            # 应用Provider
│
├── data/                       # 数据层
│   └── templates.ts            # 15个预置场景模板
│
├── types/                      # 类型定义
│   └── index.ts                # 全局类型
│
├── utils/                      # 工具函数
│   ├── storage.ts              # AsyncStorage操作
│   ├── calendar.ts             # 日历集成
│   ├── sound.ts                # 音效工具
│   ├── dataExport.ts           # 数据导出/导入
│   └── errorHandler.ts         # 错误处理
│
├── hooks/                      # 自定义Hooks
│   └── useSafeRouter.ts        # 安全路由Hook
│
└── contexts/                   # React Context
    ├── ThemeContext.tsx          # 主题上下文
    └── AuthContext.tsx           # 认证上下文
```

## 核心功能模块

### 1. 转盘决策模块

**文件**: `components/SpinningWheel.tsx`, `screens/decision/index.tsx`

**功能说明**:
- 使用 SVG 绘制转盘，支持任意数量选项
- 基于 react-native-reanimated 实现流畅旋转动画
- 支持加权随机（可设置选项概率）
- 支持多种配色方案和指针样式
- 旋转结束后发送本地通知

**核心代码**:
```typescript
// 增量旋转方案 - 从当前位置动画到目标位置
const targetRotation = lastTargetRef.current + extraSpins + targetAngle;
rotation.value = withTiming(targetRotation, {
  duration: spinDuration * 1000,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
}, (e) => {
  if (e.finished) {
    lastTargetRef.current = targetRotation % 360;
    runOnJS(handleEnd)(selectedIndex);
  }
});
```

### 2. 场景模板模块

**文件**: `data/templates.ts`

**功能说明**:
- 15个预置场景模板，分5大类
- 4个高频快捷模板（今天吃什么、今天喝什么、谁买单、谁做家务）
- 支持自定义决策创建/编辑/删除

**分类结构**:
| 分类 | 模板数量 | 示例 |
|------|----------|------|
| 饮食 | 4个 | 今天吃什么、今天喝什么、去哪吃 |
| 生活日常 | 4个 | 今天穿什么、周末做什么、怎么放松 |
| 休闲娱乐 | 3个 | 看什么剧、玩什么游戏、听什么歌 |
| 学习工作 | 2个 | 先做什么、休息方式 |
| 聚会游戏 | 2个 | 谁买单、真心话大冒险 |

### 3. 我的决策模块

**文件**: `screens/my-decisions/index.tsx`

**功能说明**:
- 管理所有自定义决策
- 支持搜索功能
- 支持按分类筛选（饮食、生活日常等），分类按钮支持水平滚动
- 支持按日期筛选（日历点选）
- 支持置顶/取消置顶（长按弹出菜单）
- 支持删除单个决策（长按弹出菜单）
- 支持分享决策（长按弹出菜单，导出为 JSON 文件）
- 支持批量删除（进入选择模式）
- 显示决策创建日期
- Web 端分享时自动降级为复制到剪贴板

### 4. 历史记录模块

**文件**: `screens/history/index.tsx`

**功能说明**:
- 保存最近100条决策记录
- 支持按分类筛选（饮食、生活日常等）
- 支持按日期筛选（日历点选）
- 支持搜索功能
- 支持置顶/取消置顶
- 支持删除单条记录（带撤销功能）
- 显示决策统计面板

### 5. 备忘录模块

**文件**: `screens/memo/index.tsx`, `screens/memo-edit/index.tsx`

**功能说明**:
- 创建/编辑/删除备忘录
- 支持设置提醒时间（连接系统日历）
- 支持置顶功能
- 支持标签分类（预设标签+自定义标签）
- 支持按标签筛选
- 支持按分类筛选（饮食、生活日常等）
- 支持按日期筛选（日历点选）
- 支持搜索功能
- 删除后支持3秒撤销

### 6. 设置模块

**文件**: `screens/settings/index.tsx`

**功能说明**:
- 夜间模式切换
- 音效开关
- 触感反馈开关
- 震动开关
- 转盘配色方案选择（5种方案）
- 指针样式选择（4种样式）
- 数据导出（导出为 JSON 文件，通过系统分享面板保存）
- 数据导入（从 JSON 文件导入，支持粘贴 JSON 数据）
- 清除所有数据

### 7. 数据导出/导入模块

**文件**: `utils/dataExport.ts`

**功能说明**:
- 导出所有数据（决策、历史记录、备忘录）为 JSON 文件
- 支持通过系统分享面板保存或发送文件
- 支持从 JSON 文件导入数据（会覆盖现有数据）
- 支持分享单个自定义决策
- Web 端使用剪贴板复制 JSON 数据作为降级方案

**核心代码**:
```typescript
// 导出数据
export async function exportAllData(): Promise<{ success: boolean; message: string }>
// 导入数据
export async function importDataFromJson(jsonString: string): Promise<{ success: boolean; message: string }>
// 分享单个决策
export async function getDecisionShareData(decisionId: string): Promise<string | null>
```

### 8. 新手引导模块

**文件**: `components/OnboardingScreen.tsx`

**功能说明**:
- 首次启动时显示引导页面
- 介绍应用核心功能
- 支持跳过功能
- 完成后记录到本地存储，不再重复显示

---

## 扩充修改意见

### 已实现功能

1. **数据导出/导入** ✅
   - 支持将所有数据导出为 JSON 文件
   - 支持从 JSON 文件导入数据
   - Web 端使用剪贴板作为降级方案

2. **决策模板分享** ✅
   - 支持分享单个自定义决策为 JSON 文件
   - Web 端自动降级为复制到剪贴板

3. **页面切换动画** ✅
   - 决策页使用 `fade_from_bottom` 淡入效果
   - 其他页面使用 `slide_from_right` 滑动效果
   - 统一动画时长 300ms

4. **分类筛选滚动** ✅
   - 历史页、备忘录页、我的决策页的分类筛选按钮支持水平滚动

5. **Tab 滑动切换** ✅
   - 支持左右滑动切换相邻的 Tab 页面
   - 使用 `react-native-gesture-handler` 实现手势检测
   - 边界处添加阻力效果，提升交互体验
   - 使用 `react-native-reanimated` 实现流畅动画

6. **离线支持** ✅
   - 所有数据存储在 AsyncStorage，无需网络即可使用

7. **双击返回退出** ✅
   - Android 平台支持双击返回键退出应用
   - 第一次按下显示"再次返回以退出应用"提示
   - 2秒内再次按下退出应用
   - 使用 `BackHandler` 实现

8. **性能优化** ✅
   - Hermes 引擎已启用（Expo SDK 54 默认启用）
   - 列表使用 FlatList 实现虚拟滚动
   - 使用 `react-native-reanimated` 实现 60fps 动画

9. **备忘录搜索框排版修复** ✅
   - 修复搜索框与标题框连在一起的问题
   - 添加 `marginTop: 12` 间距

### 功能增强建议

1. **桌面小组件**（需要 EAS Build）
   - iOS/Android 桌面小组件快速决策
   - 需要使用原生模块，当前 Expo Go 环境不支持
   - 建议使用 `expo-widget-kit`（iOS）和 `react-native-widgets`（Android）

2. **数据同步功能**
   - 添加云同步功能，支持多设备数据同步
   - 使用 Supabase 或 Firebase 作为后端服务

2. **社交分享功能增强**
   - 添加分享决策结果到社交平台
   - 支持生成决策结果图片分享

3. **决策统计增强**
   - 添加决策趋势图表
   - 添加决策偏好分析
   - 添加周报/月报功能

4. **模板市场**
   - 添加模板市场功能
   - 支持用户分享自定义模板
   - 支持下载其他用户的模板

5. **语音决策**
   - 添加语音输入选项功能
   - 支持语音播报决策结果

6. **决策动画增强**
   - 添加更多转盘动画效果
   - 支持自定义转盘背景图片
   - 添加决策结果特效

7. **提醒功能增强**
   - 添加重复提醒功能（每日、每周等）
   - 支持自定义提醒铃声
   - 添加提醒历史记录

8. **主题定制**
   - 添加更多主题配色方案
   - 支持自定义主题颜色
   - 支持导入/导出主题配置

### 技术优化建议

1. **性能优化**
   - 已使用 FlatList 实现虚拟列表
   - 添加图片懒加载
   - 优化转盘动画性能（已优化贝塞尔曲线）

2. **离线支持**
   - 已实现完整离线支持
   - 可考虑使用 SQLite 本地数据库替代 AsyncStorage
   - 已添加数据备份/恢复功能

3. **测试覆盖**
   - 添加单元测试
   - 添加集成测试
   - 添加 E2E 测试

4. **无障碍支持**
   - 添加屏幕阅读器支持
   - 添加键盘导航支持
   - 优化颜色对比度

## 数据持久化

**文件**: `utils/storage.ts`

使用 AsyncStorage 存储以下数据：

| 存储键 | 数据类型 | 说明 |
|--------|----------|------|
| `@decision_custom` | DecisionItem[] | 自定义决策列表 |
| `@decision_history` | HistoryRecord[] | 历史记录（最多100条） |
| `@decision_memos` | MemoItem[] | 备忘录列表 |
| `@app_settings` | AppSettings | 应用设置 |
| `@memo_tags` | string[] | 备忘录标签 |
| `@decision_stats` | DecisionStats | 决策统计 |

## 类型定义

**文件**: `types/index.ts`

### 核心类型

```typescript
// 决策分类
type DecisionCategory = '饮食' | '生活日常' | '休闲娱乐' | '学习工作' | '聚会游戏';

// 决策项
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

// 历史记录
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

// 备忘录
interface MemoItem {
  id: string;
  title: string;
  content: string;
  reminderTime: number | null;
  calendarEventId: string | null;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  tags?: string[];
}

// 应用设置
interface AppSettings {
  darkMode: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  vibrationEnabled: boolean;
  wheelColorScheme: string;
  pointerStyle: PointerStyle;
  onboardingCompleted: boolean;
}
```

## 页面功能引导

每个页面都集成了功能引导系统（`PageGuide` 组件），首次进入时显示功能说明：

| 页面 | 引导内容 |
|------|----------|
| 首页 | 高频快捷区介绍、自定义决策入口 |
| 全部页 | 分类浏览说明、长按编辑功能 |
| 历史页 | 筛选功能、统计面板、置顶功能 |
| 备忘录页 | 标签筛选、置顶功能、新建入口 |

引导特性：
- 每个页面只显示一次
- 支持跳过按钮
- 支持多步骤引导
- 使用 AsyncStorage 记录已读状态

## 删除功能

### 自定义决策删除

**首页** (`screens/home/index.tsx`):
- 长按自定义决策卡片 → 弹出操作菜单
- 选择"删除" → 确认后删除

**全部页** (`screens/explore/index.tsx`):
- 长按单个决策 → 弹出操作菜单（编辑/删除）
- 点击垃圾桶图标 → 批量删除所有自定义决策

### 历史记录删除

- 左滑记录卡片 → 显示删除按钮
- 点击删除 → 显示3秒撤销提示条
- 3秒后真正删除，期间可点击撤销

### 备忘录删除

- 左滑备忘录卡片 → 显示删除按钮
- 点击删除 → 显示3秒撤销提示条
- 3秒后真正删除，期间可点击撤销

## 转盘结果弹窗

**布局说明**:
- 左侧：图标 + 提示语"决策如上，快去执行吧！"
- 右侧：4个操作按钮（2x2网格）
  - 再来一次、分享
  - 排除、确认

**按钮功能**:
| 按钮 | 功能 |
|------|------|
| 再来一次 | 重新旋转转盘 |
| 分享 | 复制结果到剪贴板 |
| 排除 | 从选项中排除当前结果 |
| 确认 | 确认结果并关闭弹窗 |

## 开发规范

### 样式开发
- 使用 Tailwind CSS 类名（通过 Uniwind）
- 支持暗色模式（`dark:` 前缀）
- 颜色使用 ThemeContext 提供的 colors 对象

### 路由导航
- 使用 `useSafeRouter` 替代原生 `useRouter`
- 使用 `useSafeSearchParams` 替代原生 `useLocalSearchParams`

### 数据获取
- 使用 `useFocusEffect` 在页面获得焦点时刷新数据
- 避免在 `useEffect` 中直接获取数据

### 文件上传
- 使用 FormData 上传文件
- 禁止使用 Base64 传递文件数据

## 构建与运行

```bash
# 安装依赖
cd client && npx expo install
cd server && pnpm install

# 开发模式
coze dev

# 构建
bash .cozeproj/scripts/dev_build.sh

# 运行
bash .cozeproj/scripts/dev_run.sh
```

## 端口配置

| 服务 | 端口 |
|------|------|
| Expo Web 前端 | 5000 |
| Express 后端 | 9091 |

## 注意事项

1. **夜间模式**: 在 Web 预览环境中可能无法完全生效，需要在真机上测试
2. **通知推送**: `expo-notifications` 的本地通知功能需要在真机（Android/iOS）上才能正常工作
3. **日历集成**: 需要用户授权才能创建日历事件
4. **数据持久化**: 所有数据存储在本地，清除应用数据会丢失所有记录
