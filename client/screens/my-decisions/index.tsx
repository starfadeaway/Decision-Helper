/**
 * 我的决策页 - 展示自定义决策列表 + 搜索 + 筛选 + 删除 + 置顶
 */
import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import SvgIcon from '@/components/SvgIcon';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/contexts/ThemeContext';
import { useConfirm } from '@/components/ConfirmDialog';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getCustomDecisions, deleteCustomDecision, togglePinCustomDecision, saveCustomDecision } from '@/utils/storage';
import UndoToast from '@/components/UndoToast';
import SimpleCalendar from '@/components/SimpleCalendar';
import type { DecisionItem } from '@/types';
import dayjs from 'dayjs';

// 分类图标映射
const CATEGORY_ICONS: Record<string, string> = {
  '饮食': 'food',
  '生活日常': 'home',
  '休闲娱乐': 'gamepad',
  '学习工作': 'book',
  '聚会游戏': 'dice-multiple',
};

export default function MyDecisionsScreen() {
  const router = useSafeRouter();
  const { colors } = useTheme();
  const { confirm } = useConfirm();
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('全部');
  const [showFilter, setShowFilter] = useState(false);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [undoData, setUndoData] = useState<{ visible: boolean; items: DecisionItem[] }>({ visible: false, items: [] });
  const [longPressTarget, setLongPressTarget] = useState<{ id: string; name: string; pinned: boolean; y: number } | null>(null);

  const itemRefs = useRef<Map<string, any>>(new Map()).current;

  const loadDecisions = useCallback(() => {
    getCustomDecisions().then(setDecisions);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDecisions();
    }, [loadDecisions])
  );

  // 分类列表
  const categories = ['全部', '饮食', '生活日常', '休闲娱乐', '学习工作', '聚会游戏'];

  const filteredDecisions = decisions
    .filter((d) => filterCategory === '全部' || d.category === filterCategory)
    .filter((d) => !filterDate || dayjs(d.createdAt).format('YYYY-MM-DD') === filterDate)
    .filter((d) => !searchText || d.name.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    const items = decisions.filter((d) => selectedIds.has(d.id));
    
    confirm({
      title: '确认删除',
      message: `确定要删除选中的 ${selectedIds.size} 个决策吗？`,
      confirmText: '删除',
      destructive: true,
      onConfirm: async () => {
        for (const id of selectedIds) {
          await deleteCustomDecision(id);
        }
        setDeleteMode(false);
        setSelectedIds(new Set());
        await loadDecisions();
        setUndoData({ visible: true, items });
      },
    });
  };

  const handleUndo = async () => {
    if (undoData.items.length === 0) return;
    for (const item of undoData.items) {
      await saveCustomDecision(item);
    }
    setUndoData({ visible: false, items: [] });
    await loadDecisions();
  };

  const handleLongPress = (item: DecisionItem) => {
    if (deleteMode) return;
    const ref = itemRefs.get(item.id);
    if (ref) {
      ref.measureInWindow((x: number, y: number, width: number, height: number) => {
        setLongPressTarget({ 
          id: item.id, 
          name: item.name, 
          pinned: !!item.pinned, 
          y: y + height / 2 
        });
      });
    }
  };

  const handleSingleDelete = async () => {
    if (!longPressTarget) return;
    const item = decisions.find((d) => d.id === longPressTarget.id);
    await deleteCustomDecision(longPressTarget.id);
    setLongPressTarget(null);
    await loadDecisions();
    if (item) {
      setUndoData({ visible: true, items: [item] });
    }
  };

  const handlePinToggle = async () => {
    if (!longPressTarget) return;
    await togglePinCustomDecision(longPressTarget.id);
    setLongPressTarget(null);
    await loadDecisions();
  };

  /** 分享决策为 JSON 文件 */
  const handleShareDecision = async () => {
    if (!longPressTarget) return;
    const item = decisions.find((d) => d.id === longPressTarget.id);
    if (!item) return;
    
    setLongPressTarget(null);
    
    try {
      const shareData = {
        version: '1.0.0',
        type: 'decision',
        decision: item,
        sharedAt: new Date().toISOString(),
      };
      const jsonString = JSON.stringify(shareData, null, 2);
      
      // Web 平台：复制到剪贴板
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(jsonString);
        confirm({
          title: '已复制',
          message: `决策「${item.name}」的数据已复制到剪贴板，你可以粘贴保存为 .json 文件分享给他人。`,
          cancelText: '',
          confirmText: '好的',
        });
        return;
      }
      
      // 原生平台：使用文件分享
      const fileName = `decision_${item.name}_${Date.now()}.json`;
      const fileUri = (FileSystem as any).documentDirectory + fileName;
      
      await (FileSystem as any).writeAsStringAsync(fileUri, jsonString, {
        encoding: (FileSystem as any).EncodingType.UTF8,
      });
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        // 如果分享不可用，退回到剪贴板
        await Clipboard.setStringAsync(jsonString);
        confirm({
          title: '已复制',
          message: `决策数据已复制到剪贴板`,
          cancelText: '',
          confirmText: '好的',
        });
        return;
      }
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: `分享决策「${item.name}」`,
      });
    } catch (error) {
      console.error('分享失败:', error);
      confirm({
        title: '分享失败',
        message: '分享决策时发生错误，请重试',
        cancelText: '',
        confirmText: '好的',
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDecisions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDecisions.map((d) => d.id)));
    }
  };

  const toggleDeleteMode = () => {
    if (deleteMode) {
      setDeleteMode(false);
      setSelectedIds(new Set());
    } else {
      if (filteredDecisions.length === 0) return;
      setDeleteMode(true);
      setSelectedIds(new Set());
    }
  };

  const renderItem = ({ item }: { item: DecisionItem }) => {
    const isSelected = selectedIds.has(item.id);
    const isPinned = !!item.pinned;
    
    return (
      <View
        ref={(ref) => {
          if (ref) itemRefs.set(item.id, ref);
          else itemRefs.delete(item.id);
        }}
        style={[
          styles.card,
          { backgroundColor: colors.surface },
          isSelected && { borderWidth: 2, borderColor: colors.accent },
        ]}
      >
        {isPinned && (
          <View style={[styles.pinnedLine, { backgroundColor: '#FFD700' }]} />
        )}
        
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => {
            if (deleteMode) {
              toggleSelect(item.id);
            } else {
              router.push('/decision', {
                decisionId: item.id,
                decisionName: item.name,
                options: JSON.stringify(item.options),
                category: item.category || '',
              });
            }
          }}
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '1A' }]}>
              <SvgIcon name={item.icon || CATEGORY_ICONS[item.category || ''] || 'list'} size={20} color={colors.accent} />
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {isPinned && (
                  <SvgIcon name="star" size={14} color="#FFD700" />
                )}
              </View>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {item.options.length > 0 ? `${item.options[0]}等${item.options.length}个选项` : '无选项'}
              </Text>
              {item.createdAt && (
                <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                  {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                </Text>
              )}
            </View>
          </View>
          
          {deleteMode && (
            <TouchableOpacity
              style={[
                styles.checkbox,
                { borderColor: colors.border },
                isSelected && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => toggleSelect(item.id)}
            >
              {isSelected && <SvgIcon name="check" size={14} color="#fff" />}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const allSelected = filteredDecisions.length > 0 && selectedIds.size === filteredDecisions.length;

  return (
    <Screen backgroundColor={colors.background}>
      <View style={styles.container}>
        {/* 顶部栏 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.back()}
          >
            <SvgIcon name="back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: colors.accent + '1A' }]}>
              <SvgIcon name="dice-multiple" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>我的决策</Text>
          </View>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={toggleDeleteMode}
            disabled={decisions.length === 0}
          >
            <SvgIcon 
              name={deleteMode ? 'close' : 'trash'} 
              size={20} 
              color={deleteMode ? colors.accent : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {/* 搜索栏 */}
        <View style={styles.searchBar}>
          <SvgIcon name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="搜索决策..."
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* 筛选栏 */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterToggleBtn, { backgroundColor: colors.surface }]}
            onPress={() => setShowFilter(!showFilter)}
          >
            <SvgIcon name="filter" size={14} color={colors.textSecondary} />
            <Text style={[styles.filterToggleText, { color: colors.textSecondary }]}>
              {filterCategory}
            </Text>
          </TouchableOpacity>

          {showFilter && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    { backgroundColor: filterCategory === cat ? colors.accent : colors.surface },
                  ]}
                  onPress={() => {
                    setFilterCategory(cat);
                    setShowFilter(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: filterCategory === cat ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {filterDate ? (
            <TouchableOpacity
              style={[styles.selectedDateBtn, { backgroundColor: colors.accent }]}
              onPress={() => setFilterDate(null)}
            >
              <Text style={styles.selectedDateText}>{dayjs(filterDate).format('MM-DD')}</Text>
              <SvgIcon name="close" size={12} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.calendarBtn, { backgroundColor: colors.surface }]}
              onPress={() => setShowDatePicker(true)}
            >
              <SvgIcon name="calendar" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* 日期选择器 Modal */}
        <Modal visible={showDatePicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.datePickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={[styles.datePickerCard, { backgroundColor: colors.surface }]}>
              <SimpleCalendar
                value={filterDate ? new Date(filterDate) : new Date()}
                onChange={(date: Date) => {
                  setFilterDate(dayjs(date).format('YYYY-MM-DD'));
                  setShowDatePicker(false);
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 批量操作栏 */}
        {deleteMode && (
          <View style={[styles.batchBar, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.batchSelectAll} onPress={toggleSelectAll}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: colors.border },
                  allSelected && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
              >
                {allSelected && <SvgIcon name="check" size={14} color="#fff" />}
              </View>
              <Text style={[styles.batchSelectAllText, { color: colors.text }]}>
                全选 ({selectedIds.size}/{filteredDecisions.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchDeleteBtn, { backgroundColor: colors.accent }]}
              onPress={handleBatchDelete}
              disabled={selectedIds.size === 0}
            >
              <SvgIcon name="trash" size={16} color="#fff" />
              <Text style={styles.batchDeleteBtnText}>删除</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 决策列表 */}
        <FlatList
          data={filteredDecisions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <SvgIcon name="list" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                还没有自定义决策
              </Text>
            </View>
          }
        />
      </View>

      {/* 长按弹出菜单 */}
      {longPressTarget && (
        <View style={styles.longPressMenuContainer}>
          <TouchableOpacity
            style={styles.longPressBackdrop}
            activeOpacity={1}
            onPress={() => setLongPressTarget(null)}
          />
          <View
            style={[
              styles.longPressCard,
              {
                backgroundColor: colors.surface,
                top: longPressTarget.y,
              },
            ]}
          >
            <View style={styles.longPressHeader}>
              <Text style={[styles.longPressTitle, { color: colors.text }]} numberOfLines={1}>
                {longPressTarget.name}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.longPressMenuItem}
              onPress={handlePinToggle}
            >
              <SvgIcon
                name={longPressTarget.pinned ? 'pin-off' : 'pin'}
                size={18}
                color={colors.text}
              />
              <Text style={[styles.longPressMenuItemText, { color: colors.text }]}>
                {longPressTarget.pinned ? '取消置顶' : '置顶'}
              </Text>
            </TouchableOpacity>
            <View style={[styles.longPressDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.longPressMenuItem}
              onPress={handleShareDecision}
            >
              <SvgIcon name="share" size={18} color="#339AF0" />
              <Text style={[styles.longPressMenuItemText, { color: '#339AF0' }]}>
                分享决策
              </Text>
            </TouchableOpacity>
            <View style={[styles.longPressDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.longPressMenuItem}
              onPress={handleSingleDelete}
            >
              <SvgIcon name="delete" size={18} color="#EF4444" />
              <Text style={[styles.longPressMenuItemText, { color: '#EF4444' }]}>
                删除
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 撤销提示 */}
      {undoData.visible && (
        <UndoToast
          visible={undoData.visible}
          onUndo={handleUndo}
          onDismiss={() => setUndoData({ visible: false, items: [] })}
          message={`已删除 ${undoData.items.length} 个决策`}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  filterToggleText: {
    fontSize: 13,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  filterChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  selectedDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    marginLeft: 'auto',
    gap: 4,
  },
  selectedDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerCard: {
    borderRadius: 16,
    padding: 16,
    width: 320,
  },
  datePickerContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
  },
  clearDateBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearDateText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  batchSelectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  batchSelectAllText: {
    fontSize: 14,
  },
  batchDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  batchDeleteBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pinnedLine: {
    height: 3,
    backgroundColor: '#FFD700',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  cardDate: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  longPressMenuContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  longPressBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  longPressCard: {
    position: 'absolute',
    left: 40,
    right: 40,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  longPressHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  longPressTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  longPressMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  longPressMenuItemText: {
    fontSize: 15,
  },
  longPressDivider: {
    height: 1,
    marginVertical: 4,
    marginHorizontal: 16,
  },
});
