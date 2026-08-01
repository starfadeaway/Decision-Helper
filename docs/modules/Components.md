# 组件文档

## 1. Screen 组件

**文件路径**: `client/components/Screen.tsx`

### 功能说明
页面容器组件，提供统一的页面布局和安全区处理。

### Props
```typescript
interface ScreenProps {
  children: ReactNode;
  safeAreaEdges?: SafeAreaEdge[];  // 需要处理安全区的边
  backgroundColor?: string;        // 背景色
  keyboardAvoiding?: boolean;      // 是否启用键盘避让
}
```

### 使用示例
```typescript
import { Screen } from '@/components/Screen';

<Screen safeAreaEdges={['top', 'bottom']} backgroundColor={colors.background}>
  {/* 页面内容 */}
</Screen>
```

---

## 2. SpinningWheel 组件

**文件路径**: `client/components/SpinningWheel.tsx`

### 功能说明
转盘组件，使用 SVG 绘制转盘并实现旋转动画。

### Props
```typescript
interface SpinningWheelProps {
  options: string[];           // 选项列表
  weights?: number[];          // 权重数组
  onSpinEnd: (selectedIndex: number) => void;
  onSpinningChange?: (isSpinning: boolean) => void;
  onSpinStart?: () => void;
  spinTrigger: number;         // 旋转触发器
  spinDuration?: number;       // 旋转时长（秒）
  colorScheme?: string;        // 配色方案
  pointerStyle?: 'classic' | 'arrow' | 'diamond' | 'circle';
}
```

### 详细文档
参见 [SpinningWheel.md](./SpinningWheel.md)

---

## 3. SvgIcon 组件

**文件路径**: `client/components/SvgIcon.tsx`

### 功能说明
SVG 图标组件，使用内联 SVG 路径渲染图标，替代 @expo/vector-icons。

### Props
```typescript
interface SvgIconProps {
  name: string;      // 图标名称
  size?: number;     // 图标大小，默认24
  color?: string;    // 图标颜色
}
```

### 支持的图标
| 名称 | 描述 |
|------|------|
| home | 首页 |
| compass | 发现 |
| user | 用户 |
| settings | 设置 |
| history | 历史 |
| memo | 备忘录 |
| plus | 添加 |
| trash | 删除 |
| edit | 编辑 |
| star | 星星 |
| heart | 心形 |
| food | 食物 |
| coffee | 咖啡 |
| cash | 现金 |
| dice-multiple | 骰子 |
| refresh | 刷新 |
| share | 分享 |
| copy | 复制 |
| check | 确认 |
| close | 关闭 |
| search | 搜索 |
| filter | 筛选 |
| tag | 标签 |
| palette | 调色板 |
| bell | 通知 |
| moon | 月亮 |
| sun | 太阳 |
| volume-high | 音量高 |
| volume-off | 静音 |
| vibration | 震动 |
| lightning | 闪电 |
| lightbulb | 灯泡 |
| calendar | 日历 |
| clock | 时钟 |
| pin | 图钉 |
| undo | 撤销 |
| info | 信息 |
| check-circle | 确认圆圈 |
| apple | 苹果 |
| cup | 杯子 |
| book-open-variant | 书本 |
| movie-open-outline | 电影 |
| grid | 网格 |
| folder | 文件夹 |
| pencil | 铅笔 |

### 使用示例
```typescript
import SvgIcon from '@/components/SvgIcon';

<SvgIcon name="home" size={24} color="#6C63FF" />
```

---

## 4. PageGuide 组件

**文件路径**: `client/components/PageGuide.tsx`

### 功能说明
页面功能引导组件，首次进入页面时显示功能说明。

### Props
```typescript
interface PageGuideProps {
  pageKey: string;                    // 页面唯一标识
  steps: {
    title: string;                    // 步骤标题
    description: string;              // 步骤描述
    icon?: string;                    // 图标名称
  }[];
}
```

### 功能特性
- 每个页面只显示一次（使用 AsyncStorage 记录）
- 支持多步骤引导
- 支持跳过按钮
- 支持点击切换步骤
- 自动记录已读状态

### 使用示例
```typescript
import PageGuide from '@/components/PageGuide';

<PageGuide
  pageKey="home"
  steps={[
    { title: '欢迎使用', description: '这是首页', icon: 'home' },
    { title: '快捷决策', description: '点击模板开始决策', icon: 'lightning' },
  ]}
/>
```

---

## 5. OnboardingScreen 组件

**文件路径**: `client/components/OnboardingScreen.tsx`

### 功能说明
新手引导组件，应用首次启动时显示。

### Props
```typescript
interface OnboardingScreenProps {
  onComplete: () => void;  // 完成回调
}
```

### 功能特性
- 3页引导内容
- 支持滑动切换
- 支持跳过按钮
- 完成后记录到 AsyncStorage

---

## 6. UndoToast 组件

**文件路径**: `client/components/UndoToast.tsx`

### 功能说明
撤销提示组件，删除操作后显示3秒撤销提示条。

### Props
```typescript
interface UndoToastProps {
  visible: boolean;           // 是否显示
  message?: string;           // 提示消息
  onUndo: () => void;         // 撤销回调
  onDismiss: () => void;      // 关闭回调
  duration?: number;          // 显示时长（毫秒），默认3000
}
```

### 功能特性
- 3秒倒计时自动消失
- 点击撤销按钮恢复数据
- 支持自定义消息

### 使用示例
```typescript
import UndoToast from '@/components/UndoToast';

const [undoVisible, setUndoVisible] = useState(false);
const [deletedItem, setDeletedItem] = useState(null);

const handleDelete = (item) => {
  setDeletedItem(item);
  setUndoVisible(true);
  // 3秒后真正删除
};

const handleUndo = () => {
  // 恢复删除的数据
  setUndoVisible(false);
};

<UndoToast
  visible={undoVisible}
  message="已删除"
  onUndo={handleUndo}
  onDismiss={() => setUndoVisible(false)}
/>
```

---

## 7. ConfirmDialog 组件

**文件路径**: `client/components/ConfirmDialog.tsx`

### 功能说明
确认对话框组件。

### Props
```typescript
interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;  // 确认按钮是否为危险操作样式
}
```

---

## 8. SmartDateInput 组件

**文件路径**: `client/components/SmartDateInput.tsx`

### 功能说明
智能日期输入组件，支持选择日期和时间。

### Props
```typescript
interface SmartDateInputProps {
  value: number | null;     // 时间戳
  onChange: (timestamp: number | null) => void;
  label?: string;
  placeholder?: string;
}
```

---

## 9. Provider 组件

**文件路径**: `client/components/Provider.tsx`

### 功能说明
应用根 Provider，包裹 ThemeProvider 和字体加载。

### 使用示例
```typescript
// app/_layout.tsx
import Provider from '@/components/Provider';

export default function RootLayout() {
  return (
    <Provider>
      <Stack />
    </Provider>
  );
}
```

---

## 10. ColorSchemeUpdater 组件

**文件路径**: `client/components/ColorSchemeUpdater.tsx`

### 功能说明
主题更新组件，监听主题变化并更新 Web 端的 CSS 变量。

### 功能特性
- 监听 ThemeContext 变化
- 更新 document.documentElement 的 classList
- 更新 CSS 变量
- 处理暗色模式切换
