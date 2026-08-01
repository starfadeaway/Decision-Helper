/**
 * 选项编辑页 - 新建/编辑决策
 * 支持增删改选项，校验至少2个选项
 */
import { useState, useEffect, useCallback } from 'react';
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
import { Screen } from '@/components/Screen';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { getDecisionById, saveCustomDecision, generateId } from '@/utils/storage';
import type { DecisionItem, DecisionCategory } from '@/types';

const MAX_OPTIONS = 20;
const CATEGORIES: DecisionCategory[] = ['饮食', '生活日常', '休闲娱乐', '学习工作', '聚会游戏'];

export default function EditScreen() {
  const router = useSafeRouter();
  const { colors } = useTheme();
  const { mode, decisionId, decisionName, options: optionsParam } = useSafeSearchParams<{
    mode: 'create' | 'edit';
    decisionId?: string;
    decisionName?: string;
    options?: string;
  }>();

  const isEdit = mode === 'edit';
  const [name, setName] = useState((decisionName as string) || '');
  const [category, setCategory] = useState<DecisionCategory>('生活日常');
  const [options, setOptions] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(optionsParam as string || '[]');
      return parsed.length > 0 ? parsed : [''];
    } catch {
      return [''];
    }
  });
  const [weights, setWeights] = useState<number[]>([]);
  const [showWeights, setShowWeights] = useState(false);
  const [originalIsPreset, setOriginalIsPreset] = useState(false);

  // 编辑模式下加载原始数据
  useEffect(() => {
    if (isEdit && decisionId) {
      getDecisionById(decisionId as string).then((item) => {
        if (item) {
          setName(item.name);
          setCategory(item.category);
          setOptions(item.options.length > 0 ? item.options : ['']);
          if (item.weights && item.weights.length > 0) {
            setWeights(item.weights);
            setShowWeights(true);
          }
          setOriginalIsPreset(item.isPreset);
        }
      });
    }
  }, [isEdit, decisionId]);

  const handleAddOption = () => {
    if (options.length >= MAX_OPTIONS) {
      Alert.alert('提示', `最多 ${MAX_OPTIONS} 个选项`);
      return;
    }
    setOptions([...options, '']);
    if (showWeights) {
      setWeights([...weights, 1]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 1) return;
    setOptions(options.filter((_, i) => i !== index));
    if (showWeights) {
      setWeights(weights.filter((_, i) => i !== index));
    }
  };

  const handleChangeOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleChangeWeight = (index: number, value: number) => {
    const newWeights = [...weights];
    newWeights[index] = Math.max(1, Math.min(10, value));
    setWeights(newWeights);
  };

  const toggleWeights = () => {
    if (!showWeights) {
      setWeights(new Array(options.length).fill(1));
    }
    setShowWeights(!showWeights);
  };

  const handleSave = useCallback(() => {
    // 校验名称
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('提示', '请输入决策名称');
      return;
    }

    // 过滤空选项
    const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (validOptions.length < 2) {
      Alert.alert('提示', '至少需要 2 个有效选项');
      return;
    }

    // 去重
    const uniqueOptions = [...new Set(validOptions)];
    if (uniqueOptions.length < 2) {
      Alert.alert('提示', '选项不能重复');
      return;
    }

    // 构建决策对象
    const decision: DecisionItem = {
      id: (originalIsPreset && isEdit) ? generateId() : ((decisionId as string) || generateId()),
      name: trimmedName,
      category,
      options: uniqueOptions,
      isPreset: false,
      ...(showWeights && { weights: weights.slice(0, uniqueOptions.length) }),
    };

    // 保存
    saveCustomDecision(decision).then(() => {
      // 跳转到决策执行页
      router.replace('/decision', {
        decisionId: decision.id,
        decisionName: decision.name,
        options: JSON.stringify(decision.options),
      });
    });
  }, [name, options, category, originalIsPreset, isEdit, decisionId, router, weights, showWeights]);

  return (
    <Screen backgroundColor={colors.background}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 顶部栏 */}
        <View style={styles.header}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
            <SvgIcon name="back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{isEdit ? '编辑决策' : '新建决策'}</Text>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSave}>
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
            <Text style={[styles.label, { color: colors.text }]}>决策名称</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.inputBg }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="输入决策名称"
                placeholderTextColor={colors.textTertiary}
                maxLength={20}
              />
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>分类</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryTag,
                    { backgroundColor: colors.inputBg },
                    category === cat && { backgroundColor: colors.accent + '20', borderWidth: 1, borderColor: colors.accent }
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[
                    styles.categoryTagText,
                    { color: colors.textSecondary },
                    category === cat && { color: colors.accent }
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 选项列表卡片 */}
          <View style={[styles.card, { backgroundColor: colors.surface + 'CC' }]}>
            <View style={styles.optionsHeader}>
              <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>选项列表</Text>
              <View style={styles.optionsHeaderRight}>
                <TouchableOpacity
                  style={[styles.weightToggleBtn, { backgroundColor: showWeights ? colors.accent + '20' : colors.inputBg }]}
                  onPress={toggleWeights}
                >
                  <SvgIcon name="weight" size={14} color={showWeights ? colors.accent : colors.textSecondary} />
                  <Text style={[styles.weightToggleText, { color: showWeights ? colors.accent : colors.textSecondary }]}>权重</Text>
                </TouchableOpacity>
                <Text style={[styles.optionsCount, { color: colors.textSecondary }]}>
                  {options.length}/{MAX_OPTIONS}
                </Text>
              </View>
            </View>

            {options.map((option, index) => (
              <View key={index} style={[styles.optionRow, { backgroundColor: colors.inputBg }]}>
                <View style={[styles.optionIndex, { backgroundColor: colors.accent + '15' }]}>
                  <Text style={[styles.optionIndexText, { color: colors.accent }]}>{index + 1}</Text>
                </View>
                <View style={styles.optionInputWrap}>
                  <TextInput
                    style={[styles.optionInput, { color: colors.text }]}
                    value={option}
                    onChangeText={(text) => handleChangeOption(index, text)}
                    placeholder={`选项 ${index + 1}`}
                    placeholderTextColor={colors.textTertiary}
                    maxLength={30}
                  />
                  {showWeights && (
                    <View style={styles.weightRow}>
                      <Text style={[styles.weightLabel, { color: colors.textSecondary }]}>概率权重:</Text>
                      <TouchableOpacity
                        style={[styles.weightBtn, { backgroundColor: colors.surface }]}
                        onPress={() => handleChangeWeight(index, (weights[index] || 1) - 1)}
                        disabled={(weights[index] || 1) <= 1}
                      >
                        <Text style={[styles.weightBtnText, { color: (weights[index] || 1) <= 1 ? colors.textTertiary : colors.text }]}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.weightValue, { color: colors.accent }]}>{weights[index] || 1}</Text>
                      <TouchableOpacity
                        style={[styles.weightBtn, { backgroundColor: colors.surface }]}
                        onPress={() => handleChangeWeight(index, (weights[index] || 1) + 1)}
                        disabled={(weights[index] || 1) >= 10}
                      >
                        <Text style={[styles.weightBtnText, { color: (weights[index] || 1) >= 10 ? colors.textTertiary : colors.text }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.deleteBtn, options.length <= 1 && styles.deleteBtnDisabled]}
                  onPress={() => handleRemoveOption(index)}
                  disabled={options.length <= 1}
                >
                  <SvgIcon name="close" size={18} color={options.length <= 1 ? colors.textTertiary : '#FF6B6B'} />
                </TouchableOpacity>
              </View>
            ))}

            {/* 添加选项按钮 */}
            <TouchableOpacity
              style={[styles.addOptionBtn, {
                backgroundColor: colors.accent + '10',
                borderColor: colors.accent + '40',
              }]}
              onPress={handleAddOption}
              disabled={options.length >= MAX_OPTIONS}
            >
              <SvgIcon name="plus" size={18} color={options.length >= MAX_OPTIONS ? colors.textTertiary : colors.accent} />
              <Text style={[styles.addOptionText, { color: options.length >= MAX_OPTIONS ? colors.textTertiary : colors.accent }]}>
                添加选项
              </Text>
            </TouchableOpacity>
          </View>

          {/* 提示 */}
          <View style={[styles.tipBox, { backgroundColor: colors.surface + '99' }]}>
            <SvgIcon name="info" size={14} color={colors.textSecondary} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>至少 2 个选项才能开始决策</Text>
          </View>

          {originalIsPreset && isEdit && (
            <View style={[styles.tipBox, { backgroundColor: colors.accent + '15' }]}>
              <SvgIcon name="copy" size={14} color={colors.accent} />
              <Text style={[styles.tipText, { color: colors.accent }]}>编辑预置模板将创建自定义副本</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    marginBottom: 10,
  },
  inputWrap: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 14 : 10,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
  },
  // 分类
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryTagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // 选项
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionsCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
    borderRadius: 14,
    padding: 8,
  },
  optionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIndexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionInputWrap: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 6,
  },
  optionInput: {
    fontSize: 15,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnDisabled: {
    opacity: 0.4,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1.5,
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tipText: {
    fontSize: 12,
  },
  // 权重相关
  optionsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weightToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  weightToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  weightLabel: {
    fontSize: 11,
  },
  weightBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  weightValue: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
});
