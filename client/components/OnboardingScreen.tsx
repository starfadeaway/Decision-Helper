/**
 * 新手引导页 - 首次启动时展示应用核心功能
 */
import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Platform } from 'react-native';
import SvgIcon from '@/components/SvgIcon';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ONBOARDING_PAGES = [
  {
    icon: 'dice-multiple',
    title: '随机决策',
    description: '转盘随机选择，帮你快速做出决定。\n支持自定义选项和权重调整。',
    color: '#6C63FF',
  },
  {
    icon: 'notebook',
    title: '备忘录',
    description: '记录重要事项和灵感。\n支持日历提醒和标签分类。',
    color: '#FF6B6B',
  },
  {
    icon: 'history',
    title: '历史记录',
    description: '所有决策自动保存。\n支持搜索、筛选和分类管理。',
    color: '#20C997',
  },
];

const ONBOARDING_KEY = '@app_onboarding_completed';

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { colors } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const offset = event.nativeEvent.contentOffset.x;
    const page = Math.round(offset / width);
    setCurrentPage(page);
  };

  const handleNext = () => {
    if (currentPage < ONBOARDING_PAGES.length - 1) {
      scrollViewRef.current?.scrollTo({ x: width * (currentPage + 1), animated: true });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  };

  return (
    <Screen backgroundColor={colors.background}>
      <View style={styles.container}>
        {/* 跳过按钮 */}
        {currentPage < ONBOARDING_PAGES.length - 1 && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>跳过</Text>
          </TouchableOpacity>
        )}

        {/* 页面内容 */}
        <View style={styles.scrollViewWrap}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.scrollView}
          >
            {ONBOARDING_PAGES.map((page, index) => (
              <View key={index} style={[styles.page, { width }]}>
                <View style={[styles.iconContainer, { backgroundColor: page.color + '15' }]}>
                  <SvgIcon name={page.icon} size={64} color={page.color} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>{page.title}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {page.description}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 底部指示器和按钮 */}
        <View style={styles.footer}>
          {/* 页面指示器 */}
          <View style={styles.indicators}>
            {ONBOARDING_PAGES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  {
                    backgroundColor: index === currentPage ? colors.accent : colors.border,
                    width: index === currentPage ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {/* 下一步/开始按钮 */}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.accent }]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>
              {currentPage === ONBOARDING_PAGES.length - 1 ? '开始使用' : '下一步'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewWrap: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'web' ? 20 : 40,
    alignItems: 'center',
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
