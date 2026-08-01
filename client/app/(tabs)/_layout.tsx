/**
 * 自定义 Tab 布局
 * 原生平台使用 PagerView 实现流畅滑动，Web 平台使用 Expo Router Tabs
 */
import React, { useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import SvgIcon from '@/components/SvgIcon';
import { useTheme } from '@/contexts/ThemeContext';
import { useDoubleBackToExit } from '@/hooks/useDoubleBackToExit';
import PagerViewWrapper from '@/components/PagerViewWrapper';

// 导入各个 Tab 页面
import HomeScreen from '@/screens/home';
import ExploreScreen from '@/screens/explore';
import MemoScreen from '@/screens/memo';
import HistoryScreen from '@/screens/history';
import SettingsScreen from '@/screens/settings';

/** Tab 配置 */
const TABS = [
  { key: 'home', title: '决策', icon: 'dice-multiple', component: HomeScreen },
  { key: 'explore', title: '全部', icon: 'grid', component: ExploreScreen },
  { key: 'memo', title: '备忘录', icon: 'notebook', component: MemoScreen },
  { key: 'history', title: '历史', icon: 'history', component: HistoryScreen },
  { key: 'settings', title: '设置', icon: 'cog', component: SettingsScreen },
];

/**
 * 主布局组件
 * 所有平台统一使用 PagerViewWrapper 实现滑动切换
 */
export default function CustomTabLayout() {
  const { colors } = useTheme();
  const pagerRef = useRef<any>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 启用双击返回退出应用功能（仅 Android）
  useDoubleBackToExit(Platform.OS === 'android');

  /**
   * 页面选中事件处理
   */
  const handlePageSelected = useCallback((event: any) => {
    const page = event.nativeEvent.position;
    setSelectedIndex(page);
  }, []);

  /**
   * 点击 Tab 切换
   * 注意：只调用 setPage，不直接设置 selectedIndex
   * selectedIndex 会通过 onPageSelected 回调自动更新
   */
  const handleTabPress = useCallback((index: number) => {
    if (pagerRef.current && index !== selectedIndex) {
      pagerRef.current.setPage(index);
    }
  }, [selectedIndex]);

  /**
   * 渲染 Tab 栏
   */
  const renderTabBar = () => (
    <View style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {TABS.map((tab, index) => {
        const isActive = selectedIndex === index;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handleTabPress(index)}
            activeOpacity={0.7}
          >
            <SvgIcon 
              name={tab.icon} 
              size={22} 
              color={isActive ? colors.accent : colors.textTertiary} 
            />
            <Text 
              style={[
                styles.tabLabel, 
                { color: isActive ? colors.accent : colors.textTertiary }
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <PagerViewWrapper
        initialPage={0}
        onPageSelected={handlePageSelected}
        offscreenPageLimit={2}
        overdrag={true}
        pageRefs={pagerRef}
      >
        {TABS.map((tab) => (
          <View key={tab.key} style={styles.page} collapsable={false}>
            <tab.component />
          </View>
        ))}
      </PagerViewWrapper>
      {renderTabBar()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
