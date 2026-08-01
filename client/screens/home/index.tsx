/**
 * 决策页 - 高频快捷决策
 * 展示4个高频模板卡片，一键进入转盘
 * 支持长按自定义决策进行编辑/删除
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import SvgIcon from '@/components/SvgIcon';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getHighFrequencyTemplates } from '@/data/templates';
import { getCustomDecisions, deleteCustomDecision } from '@/utils/storage';
import PageGuide from '@/components/PageGuide';
import type { DecisionItem } from '@/types';

/** 高频卡片配色 */
const HF_CONFIG = [
  { color: '#FF6B6B', icon: 'apple' },
  { color: '#FFA94D', icon: 'cup' },
  { color: '#74C0FC', icon: 'cash' },
  { color: '#69DB7C', icon: 'home' },
];

export default function HomeScreen() {
  const router = useSafeRouter();
  const { colors } = useTheme();
  const [highFreqTemplates] = useState(getHighFrequencyTemplates);
  const [customDecisions, setCustomDecisions] = useState<DecisionItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      getCustomDecisions().then(setCustomDecisions);
    }, [])
  );

  const handleTemplatePress = (item: DecisionItem) => {
    router.push('/decision', { decisionId: item.id, decisionName: item.name, options: JSON.stringify(item.options), category: item.category || '' });
  };

  const handleCreateNew = () => {
    router.push('/edit', { mode: 'create' });
  };

  /** 长按自定义决策 - 弹出编辑/删除选项 */
  const handleLongPressCustom = (item: DecisionItem) => {
    Alert.alert(
      item.name,
      '选择操作',
      [
        { text: '编辑', onPress: () => router.push('/edit', { mode: 'edit', decisionId: item.id }) },
        { text: '删除', style: 'destructive', onPress: () => handleDeleteCustom(item.id) },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  /** 删除自定义决策 */
  const handleDeleteCustom = async (id: string) => {
    await deleteCustomDecision(id);
    setCustomDecisions(prev => prev.filter(d => d.id !== id));
  };

  return (
    <Screen safeAreaEdges={['left', 'right']} backgroundColor={colors.background}>
      <PageGuide
        pageKey="home"
        steps={[
          { title: '欢迎使用随机决策助手', description: '让转盘帮你做出选择，告别纠结！', icon: 'star' },
          { title: '高频快捷区', description: '这里展示了4个最常用的决策模板，点击即可开始', icon: 'lightning' },
          { title: '自定义决策', description: '点击右下角 + 按钮，创建属于你自己的决策', icon: 'plus' },
        ]}
      />
      <View style={styles.container}>
        {/* 顶部栏 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <SvgIcon name="dice-multiple" size={24} color={colors.accent} />
            </View>
            <Text style={[styles.appTitle, { color: colors.text }]}>随机决策</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 高频快捷区 */}
          <View style={[styles.hfSection, { backgroundColor: colors.surface + 'CC', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>常用决策</Text>
            <View style={styles.hfGrid}>
            {highFreqTemplates.map((item, index) => {
              const config = HF_CONFIG[index % HF_CONFIG.length];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.hfCard, { backgroundColor: config.color + '15' }]}
                  onPress={() => handleTemplatePress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.hfIconWrap, { backgroundColor: config.color + '25' }]}>
                    <SvgIcon name={config.icon} size={28} color={config.color} />
                  </View>
                  <Text style={[styles.hfTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.hfSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{item.options.length} 个选项</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          </View>

          {/* 最近自定义 */}
          {customDecisions.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface + '99', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }]}>
              <View style={styles.sectionHeader}>
                <TouchableOpacity onPress={() => router.push('/my-decisions')}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>我的决策</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => router.push('/my-decisions')}>
                    <Text style={[styles.viewAllText, { color: colors.accent }]}>查看全部</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* 只显示第一条决策，使用与全部页一致的布局 */}
              <TouchableOpacity
                style={[styles.singleDecisionCard, { backgroundColor: colors.inputBg }]}
                onPress={() => handleTemplatePress(customDecisions[0])}
                onLongPress={() => handleLongPressCustom(customDecisions[0])}
                // Web端支持右键菜单
                {...(Platform.OS === 'web' ? {
                  onContextMenu: (e: any) => {
                    e.preventDefault();
                    handleLongPressCustom(customDecisions[0]);
                  }
                } : {})}
                activeOpacity={0.7}
              >
                <View style={[styles.singleDecisionIcon, { backgroundColor: colors.accent + '20' }]}>
                  <SvgIcon name="star" size={20} color={colors.accent} />
                </View>
                <View style={styles.singleDecisionInfo}>
                  <Text style={[styles.singleDecisionTitle, { color: colors.text }]} numberOfLines={1}>
                    {customDecisions[0].name}
                  </Text>
                  <Text style={[styles.singleDecisionMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {customDecisions[0].options.length} 个选项 · {customDecisions[0].category || '未分类'}
                  </Text>
                </View>
                {customDecisions.length > 1 && (
                  <Text style={[styles.moreCount, { color: colors.accent }]}>
                    +{customDecisions.length - 1}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* 提示 */}
          <View style={[styles.tipCard, { backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }]}>
            <SvgIcon name="lightbulb" size={20} color="#FFA94D" />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>长按自定义决策可编辑，点击「全部」Tab 浏览更多模板</Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* 悬浮新建按钮 */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateNew}
          activeOpacity={0.8}
        >
          <SvgIcon name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#6C63FF15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',

  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',

    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,

    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  // 高频快捷区
  hfSection: {
    marginBottom: 16,
  },
  hfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  hfCard: {
    width: '47%',
    borderRadius: 20,
    padding: 18,
    flexGrow: 1,
    flexBasis: '45%',
  },
  hfIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  hfTitle: {
    fontSize: 16,
    fontWeight: '700',

    marginBottom: 4,
  },
  hfSubtitle: {
    fontSize: 12,

  },
  // 自定义决策
  customGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  customCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,

    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  customCardText: {
    fontSize: 14,
    fontWeight: '600',

  },
  // 单条决策卡片（与全部页一致）
  singleDecisionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  singleDecisionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  singleDecisionInfo: {
    flex: 1,
  },
  singleDecisionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  singleDecisionMeta: {
    fontSize: 12,
  },
  moreCount: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // 提示
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFA94D10',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,

    lineHeight: 18,
  },
  // 悬浮按钮
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
