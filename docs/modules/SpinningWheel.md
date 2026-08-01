# 转盘组件文档 (SpinningWheel)

## 概述

`SpinningWheel` 是随机决策助手的核心组件，负责渲染转盘动画并计算随机结果。

**文件路径**: `client/components/SpinningWheel.tsx`

## 功能特性

- SVG 绘制转盘，支持任意数量选项
- 基于 react-native-reanimated 的高性能动画
- 支持加权随机（可设置选项概率）
- 支持多种配色方案
- 支持多种指针样式
- 旋转时实时高亮经过的扇区
- 动画结束回调

## Props 接口

```typescript
interface SpinningWheelProps {
  options: string[];           // 选项列表
  weights?: number[];          // 权重数组，与 options 对应
  onSpinEnd: (selectedIndex: number) => void;  // 旋转结束回调
  onSpinningChange?: (isSpinning: boolean) => void;  // 旋转状态变化回调
  onSpinStart?: () => void;    // 旋转开始回调
  spinTrigger: number;         // 旋转触发器（变化时触发旋转）
  spinDuration?: number;       // 旋转时长（秒），默认10秒
  colorScheme?: string;        // 配色方案ID
  pointerStyle?: 'classic' | 'arrow' | 'diamond' | 'circle';  // 指针样式
}
```

## 核心实现原理

### 1. 增量旋转方案

传统方案使用 `withSequence` 先回退再旋转，容易出现角度计算错误。本组件采用**增量旋转**方案：

```typescript
// 记录上一次停止角度作为基准
const lastTargetRef = useRef(0);

// 计算目标角度
const extraSpins = 5 * 360;  // 至少转5圈
const targetAngle = 360 - (selectedIndex * sectorAngle + sectorAngle / 2);
const targetRotation = lastTargetRef.current + extraSpins + targetAngle;

// 从当前位置直接动画到目标位置
rotation.value = withTiming(targetRotation, {
  duration: spinDuration * 1000,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),  // 缓入缓出
}, (e) => {
  if (e.finished) {
    // 更新基准角度
    lastTargetRef.current = targetRotation % 360;
    runOnJS(handleEnd)(selectedIndex);
  }
});
```

### 2. 加权随机算法

当提供权重数组时，使用加权随机算法选择结果：

```typescript
function weightedRandom(weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) return i;
  }
  return weights.length - 1;
}
```

### 3. 扇区 SVG 路径生成

```typescript
function sectorPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;  // 0° = 顶部
  const sr = toRad(startDeg);
  const er = toRad(endDeg);
  const x1 = cx + r * Math.cos(sr);
  const y1 = cy + r * Math.sin(sr);
  const x2 = cx + r * Math.cos(er);
  const y2 = cy + r * Math.sin(er);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}
```

### 4. 实时高亮效果

使用 `useDerivedValue` 实时追踪指针所在扇区：

```typescript
const currentSector = useDerivedValue(() => {
  const normalizedRotation = ((rotation.value % 360) + 360) % 360;
  const sectorAngle = 360 / options.length;
  return Math.floor(normalizedRotation / sectorAngle);
});
```

## 配色方案

内置5种配色方案：

| ID | 名称 | 颜色 |
|-----|------|------|
| default | 默认 | 多彩配色 |
| pastel | 柔和 | 粉彩配色 |
| vivid | 鲜艳 | 高饱和配色 |
| ocean | 海洋 | 蓝色系 |
| forest | 森林 | 绿色系 |

## 指针样式

支持4种指针样式：

| 样式 | 描述 |
|------|------|
| classic | 经典三角形 |
| arrow | 箭头形 |
| diamond | 菱形 |
| circle | 圆点形 |

## 使用示例

```typescript
import SpinningWheel from '@/components/SpinningWheel';

function DecisionScreen() {
  const [spinTrigger, setSpinTrigger] = useState(0);
  
  const handleSpinEnd = (selectedIndex: number) => {
    console.log('选中索引:', selectedIndex);
    console.log('选中结果:', options[selectedIndex]);
  };

  return (
    <SpinningWheel
      options={['选项1', '选项2', '选项3', '选项4']}
      weights={[30, 30, 20, 20]}  // 可选：设置权重
      spinTrigger={spinTrigger}
      spinDuration={8}
      colorScheme="default"
      pointerStyle="classic"
      onSpinEnd={handleSpinEnd}
      onSpinStart={() => console.log('开始旋转')}
    />
  );
}
```

## 注意事项

1. **spinTrigger**: 必须是一个会变化的值，每次变化都会触发新的旋转
2. **权重数组**: 如果提供，长度必须与 options 相同
3. **动画时长**: 建议设置在 5-15 秒之间，过短会影响体验
4. **性能**: 使用 react-native-reanimated 在 UI 线程运行，不会阻塞 JS 线程
