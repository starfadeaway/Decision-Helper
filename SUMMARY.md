# 随机决策助手 - 项目总结文档

## 项目概述

随机决策助手是一款解决日常选择困难的轻量工具类移动应用。通过「场景化模板 + 转盘随机」帮助用户快速输出决策结果。

**核心特性**：
- 零账号体系，开箱即用
- 纯本地存储，无需网络
- 15 个预置场景模板
- 转盘三段式物理动画
- 自定义决策创建与编辑
- 历史记录自动保存与复用

---

## 项目目录结构

```
client/
├── app/                          # Expo Router 路由目录
│   ├── _layout.tsx               # 根布局（Stack 导航）
│   ├── index.tsx                 # 首页路由 → screens/home
│   ├── decision.tsx              # 决策执行页路由 → screens/decision
│   ├── edit.tsx                  # 选项编辑页路由 → screens/edit
│   ├── history.tsx               # 历史记录页路由 → screens/history
│   ├── settings.tsx              # 设置页路由 → screens/settings
│   └── +not-found.tsx            # 404 页面
├── screens/                      # 页面实现目录
│   ├── home/index.tsx            # 首页（场景列表）
│   ├── decision/index.tsx        # 决策执行页（转盘交互）
│   ├── edit/index.tsx            # 选项编辑页
│   ├── history/index.tsx         # 历史记录页
│   └── settings/index.tsx        # 设置页
├── components/                   # 可复用组件
│   ├── SpinningWheel.tsx         # 转盘组件（核心）
│   └── Screen.tsx                # 页面容器组件
├── data/                         # 数据层
│   └── templates.ts              # 15 个预置场景模板
├── types/                        # 类型定义
│   └── index.ts                  # TypeScript 类型
├── utils/                        # 工具函数
│   └── storage.ts                # AsyncStorage 存储工具
└── hooks/                        # 自定义 Hooks
    └── useSafeRouter.ts          # 安全路由 Hook
```

---

## 数据模型设计

### DecisionItem（决策模板/自定义决策）

```typescript
interface DecisionItem {
  id: string;           // 唯一标识
  name: string;         // 决策名称
  category: DecisionCategory;  // 分类
  options: string[];    // 选项列表
  isPreset: boolean;    // 是否为预置模板
  isHighFrequency?: boolean;   // 是否为高频快捷
  icon?: string;        // 图标名称
}
```

### HistoryRecord（历史记录）

```typescript
interface HistoryRecord {
  id: string;           // 唯一标识
  decisionName: string; // 决策名称
  decisionId: string;   // 关联决策 ID
  result: string;       // 选中结果
  options: string[];    // 当时选项快照
  timestamp: number;    // 决策时间戳
}
```

### 存储策略

| 存储 Key | 内容 | 说明 |
|----------|------|------|
| `@decision_custom` | 自定义决策列表 | 用户创建的决策 |
| `@decision_history` | 历史记录列表 | 最多 100 条，超出覆盖最早的 |

---

## 核心模块代码说明

### 1. 转盘组件 (SpinningWheel.tsx)

**核心技术**：react-native-reanimated + react-native-svg

**三段式动画实现**：
```typescript
// 使用自定义贝塞尔曲线模拟：加速 → 匀速 → 减速
rotation.value = withTiming(
  finalTarget,
  {
    duration: 2800,
    easing: Easing.bezier(0.17, 0.67, 0.30, 0.99),
  },
  (finished) => {
    if (finished) {
      onSpinningChange(false);
      onSpinEnd(selectedIndex);
    }
  }
);
```

**扇区绘制**：使用 SVG Path 的弧线命令精确绘制每个扇区
```typescript
function sectorPath(cx, cy, r, startAngle, endAngle) {
  // 将角度转为弧度，计算起止点坐标
  // 使用 SVG Arc 命令绘制扇形路径
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}
```

**公平概率**：通过 `Math.random()` 随机选中索引，确保每个选项概率均等。

### 2. 首页 (screens/home/index.tsx)

**布局结构**：
1. 顶部栏：APP 名称 + 更多菜单
2. 高频快捷区：4 个大卡片（2x2 网格）
3. 分类场景区：按分类展示预置模板
4. 自定义决策区：用户创建的决策
5. 悬浮按钮：新建自定义决策

**交互**：
- 点击模板 → 跳转决策执行页
- 长按自定义决策 → 跳转编辑页
- 点击右上角 → 弹出菜单（历史记录/设置）

### 3. 决策执行页 (screens/decision/index.tsx)

**核心流程**：
1. 进入页面加载选项
2. 点击「开始」→ `spinTrigger++` 触发动画
3. 转盘旋转 2.8 秒（三段式动画）
4. 停止后弹出结果弹窗
5. 静默保存历史记录

**排除再转**：
```typescript
const handleExclude = () => {
  const newOptions = options.filter((_, i) => i !== selectedIndex);
  setOptions(newOptions);
  // 自动重新转动
  setTimeout(() => setSpinTrigger(v => v + 1), 300);
};
```

### 4. 选项编辑页 (screens/edit/index.tsx)

**功能**：
- 决策名称输入
- 分类选择（5 个分类标签）
- 选项列表增删改
- 校验：至少 2 个不重复选项
- 编辑预置模板时自动创建副本

### 5. 历史记录页 (screens/history/index.tsx)

**功能**：
- 按时间倒序展示
- 关键词搜索（决策名称/结果）
- 点击记录 → 复用选项跳转决策页
- 清空功能（二次确认）
- 最多 100 条记录

### 6. 设置页 (screens/settings/index.tsx)

**功能**：
- 清除全部数据（自定义决策 + 历史记录）
- 关于应用（版本信息 + 功能介绍）
- 隐私政策（纯本地存储说明）

---

## 15 个预置场景模板

| 分类 | 模板名称 | 选项数 |
|------|----------|--------|
| **饮食** | 今天吃什么 | 8 |
| **饮食** | 今天喝什么 | 8 |
| **饮食** | 去哪吃 | 6 |
| **生活日常** | 谁做家务 | 6 |
| **生活日常** | 今天穿什么 | 6 |
| **生活日常** | 周末做什么 | 7 |
| **生活日常** | 怎么放松 | 7 |
| **休闲娱乐** | 看什么剧 | 8 |
| **休闲娱乐** | 玩什么游戏 | 7 |
| **休闲娱乐** | 听什么歌 | 8 |
| **学习工作** | 学点什么 | 8 |
| **学习工作** | 先做哪项工作 | 7 |
| **聚会游戏** | 谁买单 | 6 |
| **聚会游戏** | 真心话还是大冒险 | 8 |

---

## 设计风格

采用**柔和卡片风（Neumorphism）**设计语言：

- **主色**：#6C63FF（薰衣草紫）
- **强调色**：#FF7675（珊瑚红）
- **背景色**：#F0F0F3（暖灰白）
- **核心手法**：大圆角（20-28px）、柔和阴影、同色卡片
- **转盘**：20 色循环配色，SVG 精确绘制扇区

---

## 运行与调试

### 启动服务
```bash
cd /workspace/projects
bash .cozeproj/scripts/dev_build.sh
bash .cozeproj/scripts/dev_run.sh
```

### 访问地址
- Web 前端：http://localhost:5000
- API 服务：http://localhost:9091

### 静态检查
```bash
pnpm -w lint:client
```

### 调试要点
- 转盘动画：检查 `spinTrigger` 变化是否触发动画
- 数据存储：检查 AsyncStorage 读写是否正常
- 路由跳转：检查 `useSafeRouter` 参数传递是否正确
