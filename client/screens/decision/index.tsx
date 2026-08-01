/**
 * 决策执行页 - 核心交互页
 * 转盘随机决策 + 结果弹窗 + 排除再转
 */
import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
} from 'react-native';
import SvgIcon from '@/components/SvgIcon';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { addHistoryRecord, generateId, getSettings, recordDecision } from '@/utils/storage';
import SpinningWheel from '@/components/SpinningWheel';
import { startSpinningSound, stopSpinningSound, playResultSound } from '@/utils/sound';
import { useTheme } from '@/contexts/ThemeContext';

// 配置通知处理行为（前台也显示通知）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function DecisionScreen() {
  const router = useSafeRouter();
  const { colors } = useTheme();
  const { decisionId, decisionName, options: optionsParam, category } = useSafeSearchParams<{
    decisionId: string;
    decisionName: string;
    options: string;
    category: string;
  }>();

  const [options, setOptions] = useState<string[]>(() => {
    try {
      return JSON.parse(optionsParam as string || '[]');
    } catch {
      return [];
    }
  });
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedResult, setSelectedResult] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [spinDuration, setSpinDuration] = useState(5);
  const [customDuration, setCustomDuration] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [wheelColorScheme, setWheelColorScheme] = useState<string>('default');
  const [wheelPointerStyle, setWheelPointerStyle] = useState<'classic' | 'arrow' | 'diamond' | 'circle'>('classic');

  const name = (decisionName as string) || '决策';
  const durationOptions = [5, 10, 15];

  // 加载设置
  useEffect(() => {
    getSettings().then((s) => {
      setHapticEnabled(s.hapticEnabled);
      if (s.wheelColorScheme) setWheelColorScheme(s.wheelColorScheme);
      if (s.wheelPointerStyle) setWheelPointerStyle(s.wheelPointerStyle);
    });
  }, []);

  const handleSpinStart = useCallback(() => {
    if (hapticEnabled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    startSpinningSound();
  }, [hapticEnabled]);

  const handleSpinEnd = useCallback((index: number) => {
    const result = options[index];
    setSelectedResult(result);
    setSelectedIndex(index);
    setShowResult(true);

    stopSpinningSound();

    if (hapticEnabled && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    playResultSound();

    recordDecision();

    addHistoryRecord({
      id: generateId(),
      decisionName: name,
      decisionId: (decisionId as string) || '',
      result,
      options: [...options],
      timestamp: Date.now(),
      category: (category as string) || '其他',
    });

    // 发送本地通知
    if (Platform.OS !== 'web') {
      Notifications.scheduleNotificationAsync({
        content: {
          title: `${name}`,
          body: `决策结果：${result}`,
          sound: true,
        },
        trigger: null, // 立即发送
      });
    }
  }, [options, name, decisionId, hapticEnabled, category]);

  const handleStartSpin = () => {
    if (isSpinning || options.length < 2) return;
    // 开始新旋转时隐藏结果卡片
    setShowResult(false);
    setSpinTrigger((v) => v + 1);
  };

  const handleRetry = () => {
    setShowResult(false);
    setSelectedResult('');
    setSelectedIndex(-1);
    // 直接触发新一轮旋转
    setTimeout(() => {
      setSpinTrigger((v) => v + 1);
    }, 200);
  };

  const handleExclude = () => {
    if (selectedIndex >= 0) {
      const newOptions = options.filter((_, i) => i !== selectedIndex);
      setOptions(newOptions);
      setShowResult(false);
      setSelectedResult('');
      setSelectedIndex(-1);

      if (newOptions.length >= 2) {
        setTimeout(() => {
          setSpinTrigger((v) => v + 1);
        }, 300);
      }
    }
  };

  const handleConfirm = () => {
    setShowResult(false);
  };

  const handleShare = async () => {
    const shareText = `决策结果\n\n【${name}】\n\n结果：${selectedResult}\n\n选项：${options.join('、')}\n\n${new Date().toLocaleString('zh-CN')}`;
    
    try {
      await Clipboard.setStringAsync(shareText);
      // 显示复制成功提示
      alert('结果已复制到剪贴板');
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleEdit = () => {
    router.push('/edit', {
      mode: 'edit',
      decisionId: decisionId as string,
      decisionName: name,
      options: JSON.stringify(options),
    });
  };

  const handlePresetDuration = (d: number) => {
    setSpinDuration(d);
    setIsCustomDuration(false);
    setCustomDuration('');
  };

  const handleCustomDurationChange = (text: string) => {
    setCustomDuration(text);
    const num = parseInt(text, 10);
    if (num >= 3 && num <= 60) {
      setSpinDuration(num);
      setIsCustomDuration(true);
    }
  };

  return (
    <Screen backgroundColor={colors.background}>
      <View style={styles.container}>
        {/* 顶部栏 */}
        <View style={styles.header}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
            <SvgIcon name="back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.inputBg }]} onPress={handleEdit}>
            <SvgIcon name="edit" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 转盘区域 */}
        <View style={styles.wheelArea}>
          <SpinningWheel
            options={options}
            spinTrigger={spinTrigger}
            spinDuration={spinDuration}
            onSpinEnd={handleSpinEnd}
            onSpinningChange={setIsSpinning}
            onSpinStart={handleSpinStart}
            colorScheme={wheelColorScheme}
            pointerStyle={wheelPointerStyle}
          />
        </View>

        {/* 结果卡片 - 紧凑内嵌，转盘与控件之间 */}
        {showResult && (
          <View style={[styles.resultCard, { backgroundColor: colors.surface + '99', borderColor: colors.border }]}>
            {/* 左侧：提示语 */}
            <View style={styles.resultDisplay}>
              <View style={[styles.resultCardIcon, { backgroundColor: colors.accentBg }]}>
                <SvgIcon name="check-circle" size={20} color={colors.accent} />
              </View>
              <Text style={[styles.resultCardHint, { color: colors.textSecondary }]}>决策如上，{'\n'}快去执行吧！</Text>
            </View>

            {/* 右侧：按钮两排（2x2网格） */}
            <View style={styles.resultCardActions}>
              {/* 第一排：再来一次 + 分享 */}
              <View style={styles.resultActionRow}>
                <TouchableOpacity
                  style={[styles.resultActionBtnSmall, { backgroundColor: colors.accentBg, borderColor: colors.accent, borderWidth: 1, flex: 1 }]}
                  onPress={handleRetry}
                >
                  <SvgIcon name="refresh" size={14} color={colors.accent} />
                  <Text style={[styles.resultActionBtnTextSmall, { color: colors.accent }]}>再来一次</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.resultActionBtnSmall, { backgroundColor: 'rgba(52,152,219,0.1)', borderColor: '#3498DB', borderWidth: 1, flex: 1 }]}
                  onPress={handleShare}
                >
                  <SvgIcon name="share" size={14} color="#3498DB" />
                  <Text style={[styles.resultActionBtnTextSmall, { color: '#3498DB' }]}>分享</Text>
                </TouchableOpacity>
              </View>
              {/* 第二排：排除 + 确认 */}
              <View style={styles.resultActionRow}>
                <TouchableOpacity
                  style={[styles.resultActionBtnSmall, { backgroundColor: 'rgba(255,118,117,0.1)', borderColor: '#FF7675', borderWidth: 1, flex: 1 }]}
                  onPress={handleExclude}
                >
                  <SvgIcon name="minus-circle" size={14} color="#FF7675" />
                  <Text style={[styles.resultActionBtnTextSmall, { color: '#FF7675' }]}>排除</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.resultActionBtnSmall, styles.resultActionBtnPrimarySmall, { backgroundColor: colors.accent, flex: 1 }]}
                  onPress={handleConfirm}
                >
                  <SvgIcon name="check" size={14} color="#FFFFFF" />
                  <Text style={[styles.resultActionBtnTextSmall, { color: '#FFFFFF' }]}>确认</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* 底部控制区 */}
        <View style={[styles.bottomControls, { backgroundColor: colors.surface + '66', borderTopWidth: 1, borderTopColor: colors.border }]}>
          {/* 时长选择 */}
          <View style={styles.durationRow}>
            {durationOptions.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.durationChip,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                  !isCustomDuration && spinDuration === d && { backgroundColor: colors.accentBg, borderColor: colors.accent },
                ]}
                onPress={() => handlePresetDuration(d)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.durationChipText,
                  { color: colors.textSecondary },
                  !isCustomDuration && spinDuration === d && { color: colors.accent },
                ]}>
                  {d}秒
                </Text>
              </TouchableOpacity>
            ))}
            <View style={[
              styles.customInputWrapper,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
              isCustomDuration && { borderColor: colors.accent, backgroundColor: colors.accentBg },
            ]}>
              <TextInput
                style={[styles.customInput, { color: colors.text }]}
                placeholder="自定义"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={customDuration}
                onChangeText={handleCustomDurationChange}
                onFocus={() => setIsCustomDuration(true)}
              />
              <Text style={[styles.customInputUnit, { color: colors.textSecondary }]}>秒</Text>
            </View>
          </View>

          {/* 选项数量 */}
          <Text style={[styles.optionsCount, { color: colors.textSecondary }]}>{options.length} 个选项</Text>

          {/* 开始按钮 */}
          <TouchableOpacity
            style={[styles.startButton, (isSpinning || options.length < 2) && { backgroundColor: colors.disabled }]}
            onPress={handleStartSpin}
            disabled={isSpinning || options.length < 2}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>
              {isSpinning ? '转动中...' : options.length < 2 ? '至少需要2个选项' : '开始'}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    paddingBottom: 8,
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
    flex: 1,
    textAlign: 'center',
  },
  wheelArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  resultCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  resultDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultCardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  resultCardResult: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultCardHint: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  resultCardActions: {
    flexDirection: 'column',
    gap: 8,
    width: 140,
  },
  resultActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  resultActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  resultActionBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  resultActionBtnPrimarySmall: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  resultActionBtnTextSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultActionBtnPrimary: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  resultActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomControls: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'web' ? 20 : 32,
    alignItems: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  durationChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    minWidth: 80,
  },
  customInput: {
    fontSize: 13,
    fontWeight: '600',
    width: 38,
    textAlign: 'center',
  },
  customInputUnit: {
    fontSize: 11,
    marginLeft: 2,
  },
  optionsCount: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 10,
  },
  startButton: {
    marginHorizontal: 0,
    width: '100%',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#6C63FF',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
