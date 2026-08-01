/**
 * 备忘录列表页 - 展示、搜索、批量删除备忘录
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
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useFocusEffect } from 'expo-router';
import SvgIcon from '@/components/SvgIcon';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getMemos, deleteMemo, togglePinMemo, saveMemo } from '@/utils/storage';
import { useConfirm } from '@/components/ConfirmDialog';
import { deleteCalendarEvent } from '@/utils/calendar';
import UndoToast from '@/components/UndoToast';
import PageGuide from '@/components/PageGuide';
import SimpleCalendar from '@/components/SimpleCalendar';
import type { MemoItem } from '@/types';
import dayjs from 'dayjs';

// 备忘录分类
const CATEGORIES = ['全部', '工作', '生活', '学习', '重要', '灵感'];

export default function MemoListScreen() {
  const router = useSafeRouter();
  const { colors } = useTheme();
  const { confirm } = useConfirm();
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [longPressTarget, setLongPressTarget] = useState<{ id: string; pinned: boolean; calendarEventId?: string; y: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string>('全部');
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('全部');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [undoToast, setUndoToast] = useState<{ visible: boolean; memo: MemoItem | null }>({ visible: false, memo: null });

  const loadMemos = useCallback(async () => {
    const data = await getMemos();
    setMemos(data);
  }, []);

  const itemRefs = useRef<Map<string, any>>(new Map()).current;

  useFocusEffect(
    useCallback(() => {
      loadMemos();
    }, [loadMemos])
  );

  // 获取所有出现过的标签
  const allTags = Array.from(new Set(memos.flatMap((m) => m.tags || [])));

  const filteredMemos = memos
    .filter(
      (m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((m) => filterTag === '全部' || (m.tags || []).includes(filterTag))
    .filter((m) => {
      if (!filterDate) return true;
      const memoDate = dayjs(m.updatedAt);
      return memoDate.isSame(filterDate, 'day');
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const handleLongPress = (item: MemoItem) => {
    if (deleteMode) return;
    const ref = itemRefs.get(item.id);
    if (ref) {
      ref.measureInWindow((x: number, y: number, width: number, height: number) => {
        setLongPressTarget({ id: item.id, pinned: !!item.pinned, y: y + height / 2 });
      });
    }
  };

  const handlePinToggle = async () => {
    if (!longPressTarget) return;
    await togglePinMemo(longPressTarget.id);
    setLongPressTarget(null);
    await loadMemos();
  };

  const handleSingleDelete = async () => {
    if (!longPressTarget) return;
    // 找到要删除的备忘录
    const memoToDelete = memos.find((m) => m.id === longPressTarget.id);
    if (longPressTarget.calendarEventId) {
      await deleteCalendarEvent(longPressTarget.calendarEventId);
    }
    await deleteMemo(longPressTarget.id);
    setLongPressTarget(null);
    await loadMemos();
    // 显示撤销提示
    if (memoToDelete) {
      setUndoToast({ visible: true, memo: memoToDelete });
    }
  };

  const handleUndoDeleteMemo = async () => {
    if (undoToast.memo) {
      await saveMemo(undoToast.memo);
      await loadMemos();
    }
    setUndoToast({ visible: false, memo: null });
  };

  const toggleDeleteMode = () => {
    if (deleteMode) {
      setDeleteMode(false);
      setSelectedIds(new Set());
    } else {
      if (filteredMemos.length === 0) return;
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
    if (selectedIds.size === filteredMemos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMemos.map((m) => m.id)));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    confirm({
      title: '确认删除',
      message: `确定删除选中的 ${selectedIds.size} 条备忘录吗？`,
      confirmText: '删除',
      destructive: true,
      onConfirm: async () => {
        for (const id of selectedIds) {
          const memo = memos.find((m) => m.id === id);
          if (memo?.calendarEventId) {
            await deleteCalendarEvent(memo.calendarEventId);
          }
          await deleteMemo(id);
        }
        setSelectedIds(new Set());
        setDeleteMode(false);
        await loadMemos();
      },
    });
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '';
    // 严格显示年月日时分格式
    return dayjs(timestamp).format('YYYY-MM-DD HH:mm');
  };

  const renderMemoItem = ({ item }: { item: MemoItem }) => {
    const isSelected = selectedIds.has(item.id);
    const isHovered = hoveredId === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.memoCard,
          { 
            backgroundColor: colors.surface, 
            borderColor: isSelected ? colors.accent : isHovered ? colors.accent + '40' : 'transparent', 
            borderWidth: isSelected ? 2 : isHovered ? 1.5 : 0,
            transform: [{ scale: isHovered ? 1.02 : 1 }],
            shadowOpacity: isHovered ? 0.15 : 0.06,
            shadowRadius: isHovered ? 12 : 6,
            elevation: isHovered ? 6 : 2,
          },
        ]}
        onPress={() => {
          if (deleteMode) {
            toggleSelect(item.id);
          } else {
            router.push('/memo-edit', { memoId: item.id });
          }
        }}
        onLongPress={() => handleLongPress(item)}
        // @ts-ignore - Web-only hover props
        onHoverIn={() => setHoveredId(item.id)}
        // @ts-ignore - Web-only hover props
        onHoverOut={() => setHoveredId(null)}
        ref={(ref) => { if (ref) itemRefs.set(item.id, ref); }}
        activeOpacity={0.7}
      >
        {deleteMode && (
          <View style={[styles.checkbox, { backgroundColor: isSelected ? colors.accent : 'transparent', borderColor: isSelected ? colors.accent : colors.border }]}>
            {isSelected && <SvgIcon name="check" size={14} color="#FFFFFF" />}
          </View>
        )}
        <View
          style={[
            styles.memoCardInner,
            { backgroundColor: colors.surface, borderColor: colors.border },
            item.pinned && { borderTopWidth: 3, borderTopColor: '#FFD700' },
          ]}
        >
        <View style={{ flex: 1 }}>
          <View style={styles.memoHeader}>
            <Text style={[styles.memoTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.pinned && !deleteMode && (
              <SvgIcon name="star" size={18} color="#FFD700" />
            )}
            {item.reminderTime && (
              <View style={[styles.reminderBadge, { backgroundColor: colors.accentBg }]}>
                <SvgIcon name="bell" size={12} color={colors.accent} />
                <Text style={[styles.reminderText, { color: colors.accent }]}>{formatTime(item.reminderTime)}</Text>
              </View>
            )}
          </View>
          {item.content ? (
            <Text style={[styles.memoContent, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.content}
            </Text>
          ) : null}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.memoTagsRow}>
              {item.tags.map((tag) => (
                <View key={tag} style={[styles.memoTagBadge, { backgroundColor: colors.accent + '15' }]}>
                  <Text style={[styles.memoTagText, { color: colors.accent }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={[styles.memoTime, { color: colors.textTertiary }]}>{dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm')}</Text>
        </View>
        </View>
      </TouchableOpacity>
    );
  };

  const allSelected = filteredMemos.length > 0 && selectedIds.size === filteredMemos.length;

  return (
    <Screen backgroundColor={colors.background}>
      <PageGuide
        pageKey="memo"
        steps={[
          { title: '备忘录', description: '记录你的想法和待办事项', icon: 'note' },
          { title: '标签分类', description: '使用标签对备忘录进行分类管理', icon: 'tag' },
          { title: '日历提醒', description: '设置提醒时间，连接手机日历', icon: 'calendar' },
        ]}
      />
      <View style={styles.container}>
        {/* 顶部栏 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: '#6C63FF15' }]}>
              <SvgIcon name="notebook" size={18} color="#6C63FF" />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>备忘录</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={toggleDeleteMode}>
            <SvgIcon
              name={deleteMode ? 'close' : 'delete'}
              size={22}
              color={deleteMode ? colors.accent : '#FF7675'}
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
                全选 ({selectedIds.size}/{filteredMemos.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 搜索栏 */}
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
          <SvgIcon name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="搜索备忘录..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <SvgIcon name="close" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* 筛选栏 */}
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
          {/* 日期选择按钮 - 与历史页面一致 */}
          {filterDate ? (
            <View style={[styles.selectedDateBtn, { backgroundColor: colors.accent }]}>
              <SvgIcon name="calendar" size={14} color="#fff" />
              <Text style={styles.selectedDateText}>{dayjs(filterDate).format('MM-DD')}</Text>
              <TouchableOpacity onPress={() => setFilterDate(null)}>
                <SvgIcon name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.calendarBtn, { backgroundColor: colors.inputBg }]}
              onPress={() => setShowDatePicker(true)}
            >
              <SvgIcon name="calendar" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
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
              {CATEGORIES.map((cat) => (
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
        {/* 标签筛选 */}
        {allTags.length > 0 && (
          <View style={styles.tagFilterBar}>
            <TouchableOpacity
              style={[styles.tagChip, { backgroundColor: filterTag === '全部' ? colors.accent : colors.inputBg }]}
              onPress={() => setFilterTag('全部')}
            >
              <Text style={[styles.tagChipText, { color: filterTag === '全部' ? '#FFFFFF' : colors.textSecondary }]}>全部</Text>
            </TouchableOpacity>
            {allTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, { backgroundColor: filterTag === tag ? colors.accent : colors.inputBg }]}
                onPress={() => setFilterTag(filterTag === tag ? '全部' : tag)}
              >
                <Text style={[styles.tagChipText, { color: filterTag === tag ? '#FFFFFF' : colors.textSecondary }]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 日期选择器弹窗 */}
        <Modal visible={showDatePicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.datePickerOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={[styles.datePickerModal, { backgroundColor: colors.surface }]}>
              <View style={styles.datePickerHeader}>
                <Text style={[styles.datePickerTitle, { color: colors.text }]}>选择日期</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <SvgIcon name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <SimpleCalendar
                value={filterDate || new Date()}
                onChange={(date: Date) => {
                  setFilterDate(date);
                  setShowDatePicker(false);
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 列表 */}
        {filteredMemos.length === 0 ? (
          <View style={styles.emptyState}>
            <SvgIcon name="notebook" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              {searchQuery ? '没有找到匹配的备忘录' : '暂无备忘录'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
                onPress={() => router.push('/memo-edit', { mode: 'create' })}
              >
                <Text style={[styles.emptyBtnText, { color: '#FFFFFF' }]}>创建第一条备忘录</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredMemos}
            renderItem={renderMemoItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
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

        {/* 悬浮新建按钮 */}
        {!deleteMode && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/memo-edit', { mode: 'create' })}
            activeOpacity={0.8}
          >
            <SvgIcon name="plus" size={28} color="#FFFFFF" />
          </TouchableOpacity>
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
                <Text style={[styles.longPressText, { color: '#FF7675' }]}>删除</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* 撤销提示条 */}
        <UndoToast
          visible={undoToast.visible}
          message="已删除备忘录"
          onUndo={handleUndoDeleteMemo}
          onDismiss={() => setUndoToast({ visible: false, memo: null })}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  tagFilterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontWeight: '500',
    maxWidth: 80,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
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
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginLeft: 'auto',
  },
  selectedDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterDropdown: {
    position: 'absolute',
    top: 130,
    left: 20,
    right: 20,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  filterDropdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  datePickerRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  datePickerText: {
    fontSize: 13,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    width: 320,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  datePickerConfirmBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  datePickerConfirmText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  memoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  memoCardInner: {
    flex: 1,
  },
  pinnedCardWrapper: {
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  normalCardWrapper: {
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  pinnedTopBar: {
    height: 3,
    width: '100%',
  },
  memoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  memoTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reminderText: {
    fontSize: 11,
    fontWeight: '500',
  },
  memoContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  memoTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  memoTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  memoTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  memoTime: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'web' ? 20 : 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
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
  pinBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
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
  longPressDivider: {
    height: 1,
    marginHorizontal: 16,
  },
});
