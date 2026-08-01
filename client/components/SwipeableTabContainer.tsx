/**
 * 可滑动切换的 Tab 容器组件
 * 支持左右滑动切换相邻的 Tab 页面
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { usePathname } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

/** Tab 顺序定义 */
const TAB_ORDER = ['/', '/explore', '/memo', '/history', '/settings'];

interface SwipeableTabContainerProps {
  children: React.ReactNode;
}

/**
 * 可滑动切换的 Tab 容器
 * 包裹每个 Tab 页面内容，支持左右滑动切换
 */
export default function SwipeableTabContainer({ children }: SwipeableTabContainerProps) {
  const router = useSafeRouter();
  const pathname = usePathname();
  
  // 平移偏移量
  const translateX = useSharedValue(0);
  // 当前 Tab 索引
  const currentIndex = TAB_ORDER.indexOf(pathname);

  /**
   * 导航到指定索引的 Tab
   */
  const navigateToTab = (index: number) => {
    if (index >= 0 && index < TAB_ORDER.length) {
      router.navigate(TAB_ORDER[index]);
    }
  };

  /**
   * 水平滑动手势
   */
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // 如果在边界，增加阻力
      const isAtStart = currentIndex === 0 && event.translationX > 0;
      const isAtEnd = currentIndex === TAB_ORDER.length - 1 && event.translationX < 0;
      
      if (isAtStart || isAtEnd) {
        translateX.value = event.translationX * 0.3; // 边界阻力
      } else {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      const threshold = 80; // 滑动阈值（像素）
      const velocity = event.velocityX;
      
      // 根据滑动距离和速度判断是否切换 Tab
      if (event.translationX > threshold || velocity > 500) {
        // 向右滑动 -> 上一个 Tab
        if (currentIndex > 0) {
          translateX.value = withTiming(300, { duration: 150 }, () => {
            runOnJS(navigateToTab)(currentIndex - 1);
            translateX.value = 0;
          });
          return;
        }
      } else if (event.translationX < -threshold || velocity < -500) {
        // 向左滑动 -> 下一个 Tab
        if (currentIndex < TAB_ORDER.length - 1) {
          translateX.value = withTiming(-300, { duration: 150 }, () => {
            runOnJS(navigateToTab)(currentIndex + 1);
            translateX.value = 0;
          });
          return;
        }
      }
      
      // 未触发切换，回弹动画
      translateX.value = withTiming(0, { duration: 200 });
    });

  // 动画样式
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
