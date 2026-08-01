/**
 * 历史记录页 - 展示决策历史 + 搜索 + 批量删除
 */
import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import SimpleCalendar from '@/components/SimpleCalendar';
import HistoryStats from '@/components/HistoryStats';
import { useFocusEffect } from 'expo-router';
import SvgIcon from '@/components/SvgIcon';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getHistoryRecords, deleteHistoryRecord, togglePinHistory, addHistoryRecord } from '@/utils/storage';
import { useConfirm } from '@/components/ConfirmDialog';
import UndoToast from '@/components/UndoToast';
import PageGuide from '@/components/PageGuide';
import type { HistoryRecord } from '@/types';
import dayjs from 'dayjs';

export default function HistoryScreen() {
  const router = useSafeRouter();
  const { colors } = useTheme();
  const { confirm } = useConfirm();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [searchText, setSearchText] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [longPressTarget, setLongPressTarget] = useState<{ id: string; pinned: boolean; y: number } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('全部');
  const [showFilter, setShowFilter] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD format or null for all
  const [undoToast, setUndoToast] = useState<{ visible: boolean; record: HistoryRecord | null }>({ visible: false, record: null });

  const loadRecords = useCallback(() => {
    getHistoryRecords().then(setRecords);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  const itemRefs = useRef<Map<string, any>>(new Map()).current;

  // 使用模板分类（固定列表，不从记录中提取）
  const categories = ['全部', '饮食', '生活日常', '休闲娱乐', '学习工作', '聚会游戏'];

  const filteredRecords = (searchText.trim()
    ? records.filter(
        (r) =>
          r.decisionName.includes(searchText) ||
          r.result.includes(searchText)
      )
    : records)
    .filter((r) => filterCategory === '全部' || r.category === filterCategory)
    .filter((r) => {
      if (!selectedDate) return true;
      const recordDate = dayjs(r.timestamp).format('YYYY-MM-DD');
      return recordDate === selectedDate;
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const toggleDeleteMode = () => {
    if (deleteMode) {
      setDeleteMode(false);
      setSelectedIds(new Set());
    } else {
      if (filteredRecords.length === 0) return;
      setDeleteMode(true);
      setSelectedIds(new Set());
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
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    confirm({
      title: '确认删除',
      message: `确定删除选中的 ${selectedIds.size} 条记录吗？`,
      confirmText: '删除',
      destructive: true,
      onConfirm: async () => {
        for (const id of selectedIds) {
          await deleteHistoryRecord(id);
        }
        setSelectedIds(new Set());
        setDeleteMode(false);
        await loadRecords();
      },
    });
  };

  const handleRecordPress = (record: HistoryRecord) => {
    router.push('/decision', {
      decisionId: record.decisionId,
      decisionName: record.decisionName,
      options: JSON.stringify(record.options),
      category: record.category || '',
    });
  };

  const handleLongPress = (item: HistoryRecord) => {
    if (deleteMode) return;
    const ref = itemRefs.get(item.id);
    if (ref) {
      ref.measureInWindow((x: number, y: number, width: number, height: number) => {
        setLongPressTarget({ id: item.id, pinned: !!item.pinned, y: y + height / 2 });
      });
    }
  };

  const handleSingleDelete = async () => {
    if (!longPressTarget) return;
    // 找到要删除的记录
    const recordToDelete = records.find((r) => r.id === longPressTarget.id);
    await deleteHistoryRecord(longPressTarget.id);
    setLongPressTarget(null);
    await loadRecords();
    // 显示撤销提示
    if (recordToDelete) {
      setUndoToast({ visible: true, record: recordToDelete });
    }
  };

  const handleUndoDelete = async () => {
    if (undoToast.record) {
      // 恢复记录（重新保存到存储）
      await addHistoryRecord(undoToast.record);
      await loadRecords();
    }
    setUndoToast({ visible: false, record: null });
  };

  const handlePinToggle = async () => {
    if (!longPressTarget) return;
    await togglePinHistory(longPressTarget.id);
    setLongPressTarget(null);
    await loadRecords();
  };

  const formatTime = (timestamp: number) => {
    // 严格显示年月日时分格式
    return dayjs(timestamp).format('YYYY-MM-DD HH:mm');
  };

  const allSelected = filteredRecords.length > 0 && selectedIds.size === filteredRecords.length;

  return (
    <Screen backgroundColor={colors.background}>
      <PageGuide
        pageKey="history"
        steps={[
          { title: '历史记录', description: '这里保存了你所有的决策记录', icon: 'history' },
          { title: '分类筛选', description: '使用顶部分类和日期筛选快速找到记录', icon: 'filter' },
          { title: '长按操作', description: '长按记录可以置顶或删除', icon: 'pin' },
        ]}
      />
      <View style={styles.container}>
        {/* 顶部栏 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: colors.accent + '1A' }]}>
              <SvgIcon name="history" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>历史记录</Text>
          </View>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={toggleDeleteMode}
            disabled={records.length === 0}
          >
            <SvgIcon
              name={deleteMode ? 'close' : 'delete'}
              size={22}
              color={deleteMode ? colors.accent : records.length === 0 ? colors.textTertiary : '#FF7675'}
            />
          </TouchableOpacity>
        </View>

        {/* 批量删除模式 - 全选栏 */}
        {deleteMode && (
          <View style={[styles.selectAllBar, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.selectAllLeft} onPress={toggleSelectAll}>
              <View style={[styles.checkbox, { backgroundColor: allSelected ? colors.accent : 'transparent', borderColor: allSelected ? colors.accent : colors.border }]}>
                {allSelected && <SvgIcon name="check" size={14} color="#FFFFFF" />}
              </View>
              <Text style={[styles.selectAllText, { color: colors.textSecondary }]}>
                全选 ({selectedIds.size}/{filteredRecords.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 搜索栏 */}
        <View style={[styles.searchWrap, { backgroundColor: colors.inputBg }]}>
          <SvgIcon name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="搜索决策名称或结果"
            placeholderTextColor={colors.textTertiary}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <SvgIcon name="close" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* 分类筛选栏 */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterToggleBtn, { backgroundColor: showFilter ? colors.accent + '20' : colors.inputBg }]}
            onPress={() => setShowFilter(!showFilter)}
          >
            <SvgIcon name="filter" size={14} color={showFilter ? colors.accent : colors.textSecondary} />
            <Text style={[styles.filterToggleText, { color: showFilter ? colors.accent : colors.textSecondary }]}>
              {filterCategory === '全部' ? '分类' : filterCategory}
            </Text>
          </TouchableOpacity>
          {/* 日期筛选 - 点击展开日期选择器 */}
          <TouchableOpacity
            style={[styles.calendarBtn, { backgroundColor: showDatePicker ? colors.accent : (selectedDate ? colors.accent + '20' : colors.inputBg) }]}
            onPress={() => setShowDatePicker(true)}
          >
            <SvgIcon name="calendar" size={16} color={showDatePicker || selectedDate ? (showDatePicker ? '#FFFFFF' : colors.accent) : colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        {/* 分类筛选 - 单独一行，确保可以水平滚动 */}
        {showFilter && (
          <View style={{ height: 40, marginHorizontal: 20, marginBottom: 12 }}>
            <ScrollView
              horizontal
              style={{ flex: 1 }}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    { backgroundColor: filterCategory === cat ? colors.accent : colors.inputBg }
                  ]}
                  onPress={() => {
                    setFilterCategory(cat);
                    setShowFilter(false);
                  }}
                >
                  <Text style={[styles.filterChipText, { color: filterCategory === cat ? '#FFFFFF' : colors.textSecondary }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* 已选日期显示 */}
        {selectedDate && (
          <View style={styles.selectedDateRow}>
            <Text style={[styles.selectedDateText, { color: colors.textSecondary }]}>
              已选择: {selectedDate}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDate(null)}>
              <SvgIcon name="close" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* 日期选择器 Modal */}
        <Modal visible={showDatePicker} transparent animationType="fade">
          <View style={styles.datePickerModal}>
            <View style={[styles.datePickerContent, { backgroundColor: colors.surface }]}>
              <View style={styles.datePickerHeader}>
                <Text style={[styles.datePickerTitle, { color: colors.text }]}>选择日期</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <SvgIcon name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <SimpleCalendar
                value={selectedDate ? dayjs(selectedDate, 'YYYY-MM-DD').toDate() : new Date()}
                onChange={(date) => {
                  setSelectedDate(dayjs(date).format('YYYY-MM-DD'));
                  setShowDatePicker(false);
                }}
              />
            </View>
          </View>
        </Modal>

        {/* 列表 */}
        {filteredRecords.length === 0 ? (
          <>
            {/* 无数据时显示统计图表 */}
            {filteredRecords.length > 0 && (
              <HistoryStats records={filteredRecords} />
            )}
            <View style={styles.emptyState}>
              <SvgIcon name="history" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {searchText ? '没有找到匹配的记录' : '暂无历史记录'}
              </Text>
              {!searchText && (
                <Text style={[styles.emptySubText, { color: colors.textTertiary }]}>做出决策后会自动记录在这里</Text>
              )}
            </View>
          </>
        ) : (
          <FlatList
            data={filteredRecords}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, deleteMode && { paddingBottom: 100 }]}
            ListHeaderComponent={
              <HistoryStats records={filteredRecords} />
            }
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <TouchableOpacity
                  style={[
                    styles.recordCard,
                    { backgroundColor: colors.surface, borderColor: isSelected ? colors.accent : 'transparent', borderWidth: isSelected ? 2 : 0 },
                  ]}
                  onPress={() => {
                    if (deleteMode) {
                      toggleSelect(item.id);
                    } else {
                      handleRecordPress(item);
                    }
                  }}
                  onLongPress={() => handleLongPress(item)}
                  ref={(ref) => { if (ref) itemRefs.set(item.id, ref); }}
                  activeOpacity={0.7}
                >
                  {/* 置顶横线 */}
                  {item.pinned && (
                    <View style={[styles.pinnedLine, { backgroundColor: '#FFD700' }]} />
                  )}
                  {/* 置顶星星 */}
                  {item.pinned && (
                    <View style={styles.pinnedStar}>
                      <SvgIcon name="star" size={14} color="#FFD700" />
                    </View>
                  )}
                  {deleteMode && (
                    <View style={[styles.checkbox, { backgroundColor: isSelected ? colors.accent : 'transparent', borderColor: isSelected ? colors.accent : colors.border }]}>
                      {isSelected && <SvgIcon name="check" size={14} color="#FFFFFF" />}
                    </View>
                  )}
                  <View style={styles.recordLeft}>
                    <Text style={[styles.recordName, { color: colors.text }]} numberOfLines={1}>{item.decisionName}</Text>
                    <Text style={[styles.recordTime, { color: colors.textTertiary }]}>{formatTime(item.timestamp)}</Text>
                  </View>
                  <View style={styles.recordRight}>
                    {!deleteMode && <SvgIcon name="chevron-right" size={18} color={colors.textTertiary} />}
                  </View>
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* 批量删除底部栏 */}
        {deleteMode && (
          <View style={[styles.deleteBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: selectedIds.size > 0 ? '#FF7675' : colors.inputBg }]}
              onPress={handleBatchDelete}
              disabled={selectedIds.size === 0}
            >
              <SvgIcon name="delete" size={18} color={selectedIds.size > 0 ? '#FFFFFF' : colors.textTertiary} />
              <Text style={[styles.deleteBtnText, { color: selectedIds.size > 0 ? '#FFFFFF' : colors.textTertiary }]}>
                删除 ({selectedIds.size})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 长按操作浮层 */}
        {longPressTarget && (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setLongPressTarget(null)}
          >
            <View style={[styles.longPressMenu, {
              backgroundColor: colors.surface,
              top: longPressTarget.y > 300 ? longPressTarget.y - 100 : longPressTarget.y + 20,
              left: 60,
            }]}>
              <TouchableOpacity style={styles.longPressItem} onPress={handlePinToggle}>
                <SvgIcon name={longPressTarget.pinned ? 'pin-off' : 'pin'} size={18} color={colors.accent} />
                <Text style={[styles.longPressText, { color: colors.text }]}>
                  {longPressTarget.pinned ? '取消置顶' : '置顶'}
                </Text>
              </TouchableOpacity>
              <View style={[styles.longPressDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.longPressItem} onPress={handleSingleDelete}>
                <SvgIcon name="delete" size={18} color="#FF7675" />
                <Text style={[styles.longPressText, { color: '#FF7675' }]}>删除此记录</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* 撤销提示条 */}
        <UndoToast
          visible={undoToast.visible}
          message="已删除记录"
          onUndo={handleUndoDelete}
          onDismiss={() => setUndoToast({ visible: false, record: null })}
        />
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectAllBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  selectAllLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'web' ? 10 : 6,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 10,
  },
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  dateFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  datePickerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  datePickerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  datePickerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateInputText: {
    fontSize: 13,
  },
  dateClearBtn: {
    padding: 4,
  },
  selectedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: '#F0F0F3',
    borderRadius: 8,
    marginHorizontal: 20,
  },
  selectedDateText: {
    fontSize: 13,
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  datePickerContent: {
    width: '85%',
    maxWidth: 350,
    borderRadius: 16,
    padding: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerConfirmBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dateFilterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  pinnedLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  pinnedStar: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  recordLeft: {
    flex: 1,
  },
  recordName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  recordTime: {
    fontSize: 12,
  },
  recordRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '40%',
  },
  recordResult: {
    fontSize: 15,
    fontWeight: '700',
  },
  separator: {
    height: 10,
  },
  deleteBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'web' ? 16 : 30,
    borderTopWidth: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  longPressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  longPressMenu: {
    position: 'absolute',
    zIndex: 999,
    width: 200,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  longPressDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  longPressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  longPressText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
