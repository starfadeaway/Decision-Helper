/**
 * PagerView 包装组件
 * 使用 ScrollView + pagingEnabled 实现简单的页面滑动切换
 */
import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** 组件属性 */
interface PagerViewWrapperProps {
  /** 初始页面索引 */
  initialPage?: number;
  /** 页面选中回调 */
  onPageSelected?: (event: { nativeEvent: { position: number } }) => void;
  /** 预加载页面数量 */
  offscreenPageLimit?: number;
  /** 子组件（页面） */
  children: React.ReactNode[];
  /** 外部传入的 ref */
  pageRefs?: React.RefObject<any>;
  /** 是否支持过度拖动 */
  overdrag?: boolean;
}

/**
 * PagerView 包装组件
 * 使用 ScrollView + pagingEnabled 实现简单的滑动体验
 */
const PagerViewWrapper = forwardRef<any, PagerViewWrapperProps>(({
  initialPage = 0,
  onPageSelected,
  children,
  pageRefs,
}, ref) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const pageCount = React.Children.count(children);

  // 初始化时滚动到初始页面
  useEffect(() => {
    if (initialPage > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: initialPage * SCREEN_WIDTH, animated: false });
      }, 100);
    }
  }, [initialPage]);

  // 将内部方法暴露给外部
  useImperativeHandle(pageRefs || ref, () => ({
    setPage: (index: number) => {
      if (index >= 0 && index < pageCount && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
        setCurrentPage(index);
        onPageSelected?.({ nativeEvent: { position: index } });
      }
    },
    setPageWithoutAnimation: (index: number) => {
      if (index >= 0 && index < pageCount && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: index * SCREEN_WIDTH, animated: false });
        setCurrentPage(index);
        onPageSelected?.({ nativeEvent: { position: index } });
      }
    },
  }), [pageCount, onPageSelected]);

  /**
   * 处理滚动结束事件
   */
  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (pageIndex !== currentPage) {
      setCurrentPage(pageIndex);
      onPageSelected?.({ nativeEvent: { position: pageIndex } });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{ width: SCREEN_WIDTH * pageCount }}
      >
        {React.Children.map(children, (child, index) => (
          <View key={index} style={[styles.page, { width: SCREEN_WIDTH }]}>
            {child}
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

PagerViewWrapper.displayName = 'PagerViewWrapper';

export default PagerViewWrapper;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
