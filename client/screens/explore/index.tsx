/**
 * 全部页 - 所有场景模板
 * 按分类展示所有预置模板 + 自定义决策
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
import { getTemplatesByCategory } from '@/data/templates';
import { getCustomDecisions, deleteCustomDecision } from '@/utils/storage';
import PageGuide from '@/components/PageGuide';
import type { DecisionItem, DecisionCategory } from '@/types';

/** 分类图标映射 */
const CATEGORY_ICON_MAP: Record<DecisionCategory, { name: string; color: string }> = {
  '饮食': { name: 'food', color: '#FF6B6B' },
  '生活日常': { name: 'home', color: '#FFA94D' },
  '休闲娱乐': { name: 'film', color: '#74C0FC' },
  '学习工作': { name: 'book', color: '#69DB7C' },
  '聚会游戏': { name: 'dice-multiple', color: '#B197FC' },
};

export default function ExploreScreen() {
  const router = useSafeRouter();
  const { colors } = useTheme();
  const [categoryTemplates] = useState(getTemplatesByCategory);
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

  /** 批量删除所有自定义决策 */
  const handleDeleteAllCustom = () => {
    Alert.alert(
      '确认删除',
      `确定要删除全部 ${customDecisions.length} 个自定义决策吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '全部删除',
          style: 'destructive',
          onPress: async () => {
            for (const item of customDecisions) {
              await deleteCustomDecision(item.id);
            }
            setCustomDecisions([]);
          },
        },
      ]
    );
  };

  return (
    <Screen safeAreaEdges={['left', 'right']} backgroundColor={colors.background}>
      <PageGuide
        pageKey="explore"
        steps={[
          { title: '全部模板', description: '这里展示了所有预置的决策模板，按分类整理', icon: 'compass' },
          { title: '分类浏览', description: '饮食、生活日常、休闲娱乐、学习工作、聚会游戏五大分类', icon: 'folder' },
          { title: '长按编辑', description: '长按模板卡片可以编辑选项内容', icon: 'pencil' },
        ]}
      />
      <View style={styles.container}>
        {/* 顶部栏 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: '#6C63FF15' }]}>
              <SvgIcon name="grid" size={18} color="#6C63FF" />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>全部模板</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 自定义决策区 */}
          <View style={[styles.section, { backgroundColor: colors.surface + 'CC', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }]}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity 
                style={styles.sectionHeaderLeft}
                onPress={() => router.push('/my-decisions')}
              >
                <View style={[styles.sectionIcon, { backgroundColor: '#6C63FF15' }]}>
                  <SvgIcon name="star" size={16} color="#6C63FF" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>我的决策</Text>
                <SvgIcon name="chevron-right" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.sectionHeaderRight}>
                <TouchableOpacity onPress={handleCreateNew}>
                  <SvgIcon name="plus" size={22} color="#6C63FF" />
                </TouchableOpacity>
              </View>
            </View>
            {customDecisions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无自定义决策，点击 + 创建</Text>
              </View>
            ) : (
              // 只显示第一条决策
              <TouchableOpacity
                style={[styles.singleDecisionCard, { backgroundColor: colors.inputBg }]}
                onPress={() => handleTemplatePress(customDecisions[0])}
                onLongPress={() => handleLongPressCustom(customDecisions[0])}
                {...(Platform.OS === 'web' ? {
                  onContextMenu: (e: any) => {
                    e.preventDefault();
                    handleLongPressCustom(customDecisions[0]);
                  }
                } : {})}
                activeOpacity={0.7}
              >
                <View style={styles.singleDecisionContent}>
                  <View style={[styles.singleDecisionIcon, { backgroundColor: '#6C63FF15' }]}>
                    <SvgIcon name="star" size={20} color="#6C63FF" />
                  </View>
                  <View style={styles.singleDecisionInfo}>
                    <Text style={[styles.singleDecisionTitle, { color: colors.text }]} numberOfLines={1}>
                      {customDecisions[0].name}
                    </Text>
                    <Text style={[styles.singleDecisionSub, { color: colors.textSecondary }]}>
                      {customDecisions[0].options.length} 个选项 · {customDecisions[0].category || '未分类'}
                    </Text>
                  </View>
                </View>
                {customDecisions.length > 1 && (
                  <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                    还有 {customDecisions.length - 1} 个
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* 分类场景区 */}
          {Object.entries(categoryTemplates).map(([category, templates]) => {
            const iconInfo = CATEGORY_ICON_MAP[category as DecisionCategory];
            return (
              <View key={category} style={[styles.section, { backgroundColor: colors.surface + 'CC', borderRadius: 16, padding: 12 }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.sectionIcon, { backgroundColor: iconInfo.color + '15' }]}>
                      <SvgIcon name={iconInfo.name} size={16} color={iconInfo.color} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{category}</Text>
                    <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{templates.length}</Text>
                  </View>
                </View>
                <View style={styles.cardGrid}>
                  {templates.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.templateCard, { backgroundColor: colors.surface }]}
                      onPress={() => handleTemplatePress(item)}
                      activeOpacity={0.7}
                    >
                    <Text style={[styles.templateCardText, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.templateCardSub, { color: colors.textSecondary }]}>{item.options.length} 项</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}

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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',

  },
  sectionCount: {
    fontSize: 12,
    color: '#B2BEC3',
    fontWeight: '600',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  templateCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: '28%',
    flexGrow: 1,
    flexBasis: '30%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  templateCardText: {
    fontSize: 14,
    fontWeight: '600',

    marginBottom: 2,
  },
  templateCardSub: {
    fontSize: 11,
    color: '#B2BEC3',
  },
  emptyCard: {

    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontSize: 13,
    color: '#B2BEC3',
  },
  // 单条决策卡片样式
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
  singleDecisionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  singleDecisionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  singleDecisionSub: {
    fontSize: 12,
  },
  moreText: {
    fontSize: 12,
    marginLeft: 8,
  },
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
