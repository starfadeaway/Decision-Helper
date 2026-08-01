/**
 * SpinningWheel - 完全重写的转盘组件
 *
 * 核心改进：
 * 1. 放弃 withSequence 方案，改用「增量旋转」——从当前位置直接动画到目标位置
 * 2. 用 ref 追踪上次停止角度，确保每次旋转基准正确
 * 3. useDerivedValue 实时追踪指针所在扇区，实现经过高亮效果
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Text as SvgText, G, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const WHEEL_SIZE = 300;
const WHEEL_RADIUS = WHEEL_SIZE / 2;

// 多套配色方案
const WHEEL_COLOR_SCHEMES: Record<string, string[]> = {
  default: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80'],
  warm: ['#FF6B6B', '#FF8E53', '#FFA07A', '#FFB347', '#FFCC5C', '#FFD700', '#F0E68C', '#FFE4B5', '#FFC0CB', '#FFB6C1', '#FFA500', '#FF7F50'],
  cool: ['#45B7D1', '#4ECDC4', '#5DADE2', '#48C9B0', '#76D7C4', '#85C1E2', '#7FB3D3', '#73C6B6', '#5DADE2', '#45B7D1', '#3498DB', '#2980B9'],
  pastel: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#E8BAFF', '#FFD4BA', '#BAFFEE', '#FFC9DE', '#C9BAFF', '#FFEEBA', '#D4BAFF', '#BAFFD4'],
  vibrant: ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722', '#673AB7'],
};

interface SpinningWheelProps {
  options: string[];
  weights?: number[]; // 权重数组，与 options 对应
  onSpinEnd: (selectedIndex: number) => void;
  onSpinningChange?: (isSpinning: boolean) => void;
  onSpinStart?: () => void;
  spinTrigger: number;
  spinDuration?: number;
  colorScheme?: string;
  pointerStyle?: 'classic' | 'arrow' | 'diamond' | 'circle';
}

/**
 * 生成扇区 SVG 路径
 * 角度约定：0° = 顶部（12 点钟），顺时针递增
 */
function sectorPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const sr = toRad(startDeg);
  const er = toRad(endDeg);
  const x1 = cx + r * Math.cos(sr);
  const y1 = cy + r * Math.sin(sr);
  const x2 = cx + r * Math.cos(er);
  const y2 = cy + r * Math.sin(er);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

export default function SpinningWheel({
  options,
  weights,
  onSpinEnd,
  onSpinningChange,
  onSpinStart,
  spinTrigger,
  spinDuration = 10,
  colorScheme = 'default',
  pointerStyle = 'classic',
}: SpinningWheelProps) {
  const sectorAngle = options.length > 0 ? 360 / options.length : 360;
  const colors = WHEEL_COLOR_SCHEMES[colorScheme] || WHEEL_COLOR_SCHEMES.default;

  // ---- Shared values ----
  const rotation = useSharedValue(0);

  // ---- JS state ----
  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // ---- Refs ----
  // 记录上一次动画结束后的目标角度（mod 360），作为下次旋转的基准
  const lastTargetRef = useRef(0);

  // ---- Callbacks (stable wrappers for runOnJS) ----
  const spinEndRef = useRef(onSpinEnd);
  spinEndRef.current = onSpinEnd;
  const spinStartRef = useRef(onSpinStart);
  spinStartRef.current = onSpinStart;
  const spinningChangeRef = useRef(onSpinningChange);
  spinningChangeRef.current = onSpinningChange;

  const handleEnd = (idx: number) => spinEndRef.current(idx);
  const handleStart = () => spinStartRef.current?.();
  const handleSpinningChange = (v: boolean) => spinningChangeRef.current?.(v);

  // ================================================================
  // 核心旋转逻辑 —— 增量旋转方案
  // ================================================================
  useEffect(() => {
    if (spinTrigger === 0 || options.length < 2) return;

    // 1. 取消可能残留的动画
    cancelAnimation(rotation);

    // 2. 同步归位：把 shared value 设为上次目标角度（首次为 0）
    //    这样后续的 withTiming 以此为起点
    rotation.value = lastTargetRef.current;

    // 3. 随机选中扇区（支持权重）
    let selectedIndex: number;
    if (weights && weights.length === options.length && weights.some(w => w > 0)) {
      // 加权随机选择
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;
      selectedIndex = 0;
      for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          selectedIndex = i;
          break;
        }
      }
    } else {
      // 等概率随机选择
      selectedIndex = Math.floor(Math.random() * options.length);
    }

    // 4. 计算目标扇区中心角度（0° = 顶部，顺时针）
    const targetCenter = selectedIndex * sectorAngle + sectorAngle / 2;

    // 5. 加一个小偏移让落点更自然（±30% 扇区宽度）
    const jitter = (Math.random() - 0.5) * sectorAngle * 0.6;
    let desiredFinal = targetCenter + jitter;

    // 确保在 [0, 360) 范围内
    desiredFinal = ((desiredFinal % 360) + 360) % 360;

    // 6. 计算从当前基准到目标的顺时针增量
    const currentBase = lastTargetRef.current % 360;
    let delta = ((desiredFinal - currentBase + 360) % 360);
    if (delta < 0.5) delta += sectorAngle; // 避免几乎不动

    // 7. 加上额外整圈让动画更有视觉冲击
    const extraTurns = Math.max(4, Math.floor(spinDuration * 1.2));
    const totalDelta = delta + extraTurns * 360;

    // 8. 最终目标角度
    const newTarget = lastTargetRef.current + totalDelta;
    lastTargetRef.current = newTarget;

    // 9. 通知开始
    setIsSpinning(true);
    handleSpinningChange(true);
    handleStart();

    // 10. 直接动画：从当前 rotation.value（= lastTargetRef.current - totalDelta 的起点）
    //     到 newTarget
    rotation.value = withTiming(
      newTarget,
      {
        duration: spinDuration * 1000,
        easing: Easing.bezier(0.08, 0.82, 0.17, 1.0),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsSpinning)(false);
          runOnJS(handleSpinningChange)(false);
          runOnJS(handleEnd)(selectedIndex);
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinTrigger]);

  // ================================================================
  // 实时高亮追踪 —— 在 UI 线程根据当前旋转角度计算指针所指扇区
  // ================================================================
  const currentHighlight = useDerivedValue(() => {
    const r = rotation.value;
    const mod = ((r % 360) + 360) % 360;
    // 指针在顶部（0°），轮子顺时针旋转了 mod 度
    // 指针所指位置 = (360 - mod) % 360
    const pointerPos = (360 - mod) % 360;
    const idx = Math.floor(pointerPos / sectorAngle);
    return Math.max(0, Math.min(idx, options.length - 1));
  });

  // 将 UI 线程的高亮同步到 JS state（仅在变化时触发 re-render）
  const prevHighlightRef = useRef(-1);
  useDerivedValue(() => {
    const idx = currentHighlight.value;
    if (idx !== prevHighlightRef.current) {
      prevHighlightRef.current = idx;
      runOnJS(setHighlightedIndex)(idx);
    }
    return null;
  });

  // ================================================================
  // Animated style
  // ================================================================
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // ================================================================
  // 渲染扇区（静态部分 + 动态高亮）
  // ================================================================
  const sectors = useMemo(() => {
    const cx = WHEEL_RADIUS;
    const cy = WHEEL_RADIUS;
    const colors = WHEEL_COLOR_SCHEMES[colorScheme || 'default'] || WHEEL_COLOR_SCHEMES.default;

    return options.map((option, index) => {
      const startDeg = index * sectorAngle;
      const endDeg = startDeg + sectorAngle;
      const color = colors[index % colors.length];
      const midDeg = startDeg + sectorAngle / 2;
      const midRad = ((midDeg - 90) * Math.PI) / 180;

      const textR = WHEEL_RADIUS * 0.6;
      const textX = cx + textR * Math.cos(midRad);
      const textY = cy + textR * Math.sin(midRad);

      const path = sectorPath(cx, cy, WHEEL_RADIUS, startDeg, endDeg);
      const fontSize = options.length > 10 ? 11 : options.length > 6 ? 13 : 15;

      // 高亮逻辑
      const isHL = isSpinning && highlightedIndex === index;
      const opacity = isSpinning ? (isHL ? 1.0 : 0.45) : 1;

      return (
        <G key={`${index}-${option}`} opacity={opacity}>
          <Path d={path} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
          <SvgText
            x={textX}
            y={textY}
            dy={fontSize / 3}
            fontSize={fontSize}
            fontWeight="bold"
            fill="#2D3436"
            textAnchor="middle"
            transform={`rotate(${midDeg} ${textX} ${textY})`}
          >
            {option.length > 5 ? option.slice(0, 5) + '..' : option}
          </SvgText>
        </G>
      );
    });
  }, [options, sectorAngle, isSpinning, highlightedIndex, colorScheme]);

  return (
    <View style={styles.wrapper}>
      {/* 指针 */}
      <View style={styles.pointerContainer}>
        {pointerStyle === 'classic' && <View style={styles.pointer} />}
        {pointerStyle === 'arrow' && <View style={styles.pointerArrow} />}
        {pointerStyle === 'diamond' && <View style={styles.pointerDiamond} />}
        {pointerStyle === 'circle' && <View style={styles.pointerCircle} />}
      </View>

      {/* 转盘 */}
      <Animated.View style={[styles.wheelContainer, animatedStyle]}>
        <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
          {/* 底色圆 */}
          <Circle cx={WHEEL_RADIUS} cy={WHEEL_RADIUS} r={WHEEL_RADIUS} fill="#E8E8EB" />
          {/* 扇区 */}
          {sectors}
          {/* 外圈装饰 */}
          <Circle
            cx={WHEEL_RADIUS}
            cy={WHEEL_RADIUS}
            r={WHEEL_RADIUS - 2}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3}
            opacity={0.5}
          />
          {/* 中心圆 */}
          <Circle cx={WHEEL_RADIUS} cy={WHEEL_RADIUS} r={24} fill="#6C63FF" />
          <Circle cx={WHEEL_RADIUS} cy={WHEEL_RADIUS} r={10} fill="#FFFFFF" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE + 24,
    alignItems: 'center',
  },
  pointerContainer: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 28,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#6C63FF',
  },
  pointerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 32,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF6B6B',
  },
  pointerDiamond: {
    width: 20,
    height: 20,
    backgroundColor: '#FFD93D',
    transform: [{ rotate: '45deg' }],
    marginTop: 8,
  },
  pointerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4ECDC4',
    borderWidth: 3,
    borderColor: '#fff',
    marginTop: 4,
  },
  wheelContainer: {
    marginTop: 24,
    borderRadius: WHEEL_RADIUS,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
});
