/**
 * 备忘录编辑页 - 新建/编辑备忘录，支持日历提醒
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import SvgIcon from '@/components/SvgIcon';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { getMemoById, saveMemo, generateId } from '@/utils/storage';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  requestCalendarPermission,
} from '@/utils/calendar';
import type { MemoItem } from '@/types';
import dayjs from 'dayjs';

export default function MemoEditScreen() {
  const router = useSafeRouter();
  const { colors } = useTheme();
  const { mode, memoId } = useSafeSearchParams<{
    mode: 'create' | 'edit';
    memoId?: string;
  }>();

  const isEdit = mode === 'edit';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [reminderTime, setReminderTime] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [calendarEventId, setCalendarEventId] = useState<string | null>(null);
  const [originalMemo, setOriginalMemo] = useState<MemoItem | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const PRESET_TAGS = ['工作', '生活', '学习', '重要', '灵感', '待办'];

  // 编辑模式加载数据
  useEffect(() => {
    if (isEdit && memoId) {
      getMemoById(memoId as string).then((memo) => {
        if (memo) {
          setTitle(memo.title);
          setContent(memo.content);
          setReminderTime(memo.reminderTime);
          setCalendarEventId(memo.calendarEventId);
          setOriginalMemo(memo);
          setTags(memo.tags || []);
          if (memo.reminderTime) {
            setTempDate(new Date(memo.reminderTime));
          }
        }
      });
    }
  }, [isEdit, memoId]);

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    // 处理用户取消选择的情况（event type 为 'dismissed'）
    if (_event && typeof _event === 'object' && 'type' in _event && _event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    if (selectedDate) {
      setTempDate(selectedDate);
      setReminderTime(selectedDate.getTime());
    }
  };

  const handleToggleReminder = () => {
    if (reminderTime) {
      // 移除提醒
      setReminderTime(null);
    } else {
      // 设置默认提醒为1小时后
      const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
      setTempDate(defaultTime);
      setReminderTime(defaultTime.getTime());
      setShowDatePicker(true);
    }
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('提示', '请输入标题');
      return;
    }

    let newCalendarEventId = calendarEventId;

    // 处理日历提醒
    if (reminderTime) {
      // 检查日历权限
      const hasPermission = await requestCalendarPermission();
      if (!hasPermission && Platform.OS !== 'web') {
        Alert.alert('提示', '需要日历权限才能设置提醒，请在系统设置中授权。');
      }

      if (originalMemo?.calendarEventId) {
        // 更新已有日历事件
        await updateCalendarEvent(
          originalMemo.calendarEventId,
          trimmedTitle,
          content.trim(),
          reminderTime
        );
        newCalendarEventId = originalMemo.calendarEventId;
      } else {
        // 创建新日历事件
        const eventId = await createCalendarEvent(
          trimmedTitle,
          content.trim(),
          reminderTime
        );
        newCalendarEventId = eventId;
      }
    } else if (originalMemo?.calendarEventId) {
      // 移除了提醒，删除日历事件
      await deleteCalendarEvent(originalMemo.calendarEventId);
      newCalendarEventId = null;
    }

    const now = Date.now();
    const memo: MemoItem = {
      id: originalMemo?.id || generateId(),
      title: trimmedTitle,
      content: content.trim(),
      reminderTime,
      calendarEventId: newCalendarEventId,
      createdAt: originalMemo?.createdAt || now,
      updatedAt: now,
      tags: tags.length > 0 ? tags : undefined,
    };

    await saveMemo(memo);
    router.back();
  };

  return (
    <Screen backgroundColor={colors.background}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 顶部栏 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <SvgIcon name="back" size={24} color="#2D3436" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{isEdit ? '编辑备忘录' : '新建备忘录'}</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={handleSave}>
            <Text style={styles.saveText}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 基本信息卡片 */}
          <View style={[styles.card, { backgroundColor: colors.surface + 'CC' }]}>
            {/* 标题输入 */}
            <Text style={[styles.label, { color: colors.text }]}>标题</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
                value={title}
                onChangeText={setTitle}
                placeholder="输入备忘录标题"
                placeholderTextColor="#B2BEC3"
                maxLength={50}
              />
            </View>

            {/* 内容输入 */}
            <Text style={[styles.label, { color: colors.text }]}>内容</Text>
            <View style={[styles.inputWrap, styles.textAreaWrap]}>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.inputBg, color: colors.text }]}
                value={content}
                onChangeText={setContent}
                placeholder="输入备忘录内容..."
                placeholderTextColor="#B2BEC3"
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
            </View>
          </View>

          {/* 标签卡片 */}
          <View style={[styles.card, { backgroundColor: colors.surface + 'CC' }]}>
            <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>标签</Text>
            <View style={styles.tagsSection}>
              <View style={styles.tagsRow}>
                {PRESET_TAGS.map((presetTag) => {
                  const isSelected = tags.includes(presetTag);
                  return (
                    <TouchableOpacity
                      key={presetTag}
                      style={[styles.tagChip, { backgroundColor: isSelected ? '#6C63FF' : colors.inputBg }]}
                      onPress={() => {
                        if (isSelected) {
                          setTags(tags.filter((t) => t !== presetTag));
                        } else {
                          setTags([...tags, presetTag]);
                        }
                      }}
                    >
                      <Text style={[styles.tagChipText, { color: isSelected ? '#FFFFFF' : colors.textSecondary }]}>
                        {presetTag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {newTag.length > 0 && !PRESET_TAGS.includes(newTag) && !tags.includes(newTag) && (
                <TouchableOpacity
                  style={[styles.addTagBtn, { backgroundColor: colors.inputBg }]}
                  onPress={() => {
                    setTags([...tags, newTag.trim()]);
                    setNewTag('');
                  }}
                >
                  <SvgIcon name="plus" size={14} color="#6C63FF" />
                  <Text style={styles.addTagText}>添加「{newTag.trim()}」</Text>
                </TouchableOpacity>
              )}
              <View style={[styles.tagInputWrap, { backgroundColor: colors.inputBg }]}>
                <TextInput
                  style={[styles.tagInput, { color: colors.text }]}
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="自定义标签"
                  placeholderTextColor="#B2BEC3"
                  maxLength={10}
                  onSubmitEditing={() => {
                    if (newTag.trim() && !tags.includes(newTag.trim())) {
                      setTags([...tags, newTag.trim()]);
                      setNewTag('');
                    }
                  }}
                />
              </View>
            </View>
          </View>

          {/* 提醒卡片 */}
          <View style={[styles.card, { backgroundColor: colors.surface + 'CC' }]}>
            <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>提醒</Text>
            <View style={styles.reminderSection}>
              <TouchableOpacity style={styles.reminderToggle} onPress={handleToggleReminder}>
                <View style={[styles.toggleIcon, reminderTime ? styles.toggleIconActive : undefined]}>
                  <SvgIcon name={reminderTime ? 'bell-check' : 'bell-off-outline'} size={20} color={reminderTime ? '#6C63FF' : '#B2BEC3'} />
                </View>
                <Text style={[styles.reminderText, { color: colors.text }, reminderTime ? styles.reminderTextActive : undefined]}>
                  {reminderTime ? '已设置提醒' : '添加提醒'}
                </Text>
              </TouchableOpacity>

              {reminderTime && (
                <View style={styles.reminderInfo}>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.inputBg }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <SvgIcon name="calendar" size={18} color="#6C63FF" />
                    <Text style={styles.dateButtonText}>
                      {dayjs(reminderTime).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleToggleReminder}>
                    <SvgIcon name="close" size={20} color="#FF7675" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 日期选择器 - 仅原生平台支持 */}
            {showDatePicker && Platform.OS !== 'web' && (
              <View style={styles.datePickerWrap}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              </View>
            )}
            {showDatePicker && Platform.OS === 'web' && (
              <View style={styles.tipBox}>
                <Text style={styles.tipText}>Web 端不支持日期选择，请在 App 中使用</Text>
              </View>
            )}

            {/* 提示 */}
            <View style={[styles.tipBox, { backgroundColor: colors.inputBg }]}>
              <SvgIcon name="info" size={16} color="#636E72" />
              <Text style={styles.tipText}>
                {Platform.OS === 'web'
                  ? 'Web 端不支持日历提醒，请在 App 中使用'
                  : '提醒将通过系统日历事件通知，提前15分钟提醒'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrap: {

    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 16,

    padding: 0,
  },
  textAreaWrap: {
    paddingVertical: 16,
    minHeight: 150,
  },
  textArea: {
    fontSize: 15,

    lineHeight: 22,
    padding: 0,
    minHeight: 120,
  },
  tagsSection: {
    gap: 10,
    marginBottom: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  tagInputWrap: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagInput: {
    fontSize: 13,
  },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  addTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C63FF',
  },
  reminderSection: {

    borderRadius: 16,
    padding: 16,
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,

    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIconActive: {
    backgroundColor: '#6C63FF15',
  },
  reminderText: {
    fontSize: 15,

  },
  reminderTextActive: {

    fontWeight: '500',
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F3',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6C63FF10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '500',
  },
  datePickerWrap: {
    marginTop: 12,

    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  tipText: {
    fontSize: 12,

    flex: 1,
    lineHeight: 18,
  },
});
