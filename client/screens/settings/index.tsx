/**
 * 设置页
 * 清除数据、关于、隐私政策、夜间模式、声音开关等
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  Image,
  TextInput,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import SvgIcon from '@/components/SvgIcon';
import { Screen } from '@/components/Screen';
import { clearAllData, getSettings, saveSettings } from '@/utils/storage';
import type { AppSettings } from '@/utils/storage';
import { useTheme, COLOR_THEMES } from '@/contexts/ThemeContext';
import { useConfirm } from '@/components/ConfirmDialog';
import { saveAndApplyTheme } from '@/components/ColorSchemeUpdater';
import { exportAllData, importDataFromJson } from '@/utils/dataExport';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, toggleDarkMode, colorThemeId, backgroundImageUri, setColorTheme, setBackgroundImage, isDark } = useTheme();
  const { confirm } = useConfirm();
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: false,
    soundEnabled: true,
    hapticEnabled: true,
    vibrationEnabled: true,
  });
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [wheelColorScheme, setWheelColorScheme] = useState('default');
  const [wheelPointerStyle, setWheelPointerStyle] = useState('classic');
  const [exporting, setExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [sharing, setSharing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSettings().then((s) => {
        setSettings(s);
        if (s.wheelColorScheme) setWheelColorScheme(s.wheelColorScheme);
        if (s.wheelPointerStyle) setWheelPointerStyle(s.wheelPointerStyle);
      });
    }, [])
  );

  const handleToggleSetting = async (key: keyof AppSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings({ [key]: value });
    if (key === 'darkMode') {
      await toggleDarkMode(value);
      await saveAndApplyTheme(value ? 'dark' : 'light');
    }
  };

  /** 导出数据为 JSON 文件 */
  const handleExportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportAllData();
      confirm({
        title: result.success ? '导出成功' : '导出失败',
        message: result.message,
        cancelText: '',
        confirmText: '好的',
      });
    } catch {
      confirm({
        title: '导出失败',
        message: '导出数据时发生错误',
        cancelText: '',
        confirmText: '好的',
      });
    } finally {
      setExporting(false);
    }
  };

  /** 打开导入弹窗 */
  const handleOpenImport = () => {
    setImportText('');
    setShowImportModal(true);
  };

  /** 执行导入 */
  const handleImportData = async () => {
    if (!importText.trim()) {
      confirm({
        title: '提示',
        message: '请粘贴 JSON 数据',
        cancelText: '',
        confirmText: '好的',
      });
      return;
    }
    setImporting(true);
    try {
      const result = await importDataFromJson(importText.trim());
      setShowImportModal(false);
      setImportText('');
      confirm({
        title: result.success ? '导入成功' : '导入失败',
        message: result.message,
        cancelText: '',
        confirmText: '好的',
      });
    } catch {
      confirm({
        title: '导入失败',
        message: '导入数据时发生错误',
        cancelText: '',
        confirmText: '好的',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClearData = () => {
    confirm({
      title: '清除全部数据',
      message: '将清除所有自定义决策、历史记录和备忘录。此操作不可撤销。',
      confirmText: '确认清除',
      destructive: true,
      onConfirm: async () => {
        await clearAllData();
        confirm({
          title: '已清除',
          message: '所有数据已清除',
          cancelText: '',
          confirmText: '好的',
        });
      },
    });
  };

  const handleShareQR = async () => {
    setSharing(true);
    try {
      // 使用当前应用的 URL 作为二维码内容
      const qrContent = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
      
      if (Platform.OS === 'web') {
        // Web 端使用剪贴板复制当前应用链接
        await Clipboard.setStringAsync(qrContent);
        confirm({
          title: '链接已复制',
          message: `应用链接已复制到剪贴板：\n${qrContent}\n\n您可以分享给朋友，让他们通过链接访问应用`,
          confirmText: '好的',
          cancelText: '',
        });
      } else {
        // Native 端使用 expo-sharing 分享二维码图片
        const qrText = `随机决策助手\n\n${qrContent}\n\n扫描二维码下载应用`;
        const fileUri = (FileSystem as any).documentDirectory + 'qrcode.txt';
        await (FileSystem as any).writeAsStringAsync(fileUri, qrText, {
          encoding: (FileSystem as any).EncodingType.UTF8,
        });
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: '分享应用二维码',
        });
      }
    } catch {
      confirm({
        title: '分享失败',
        message: '分享二维码时发生错误',
        cancelText: '',
        confirmText: '好的',
      });
    } finally {
      setSharing(false);
    }
  };

  /** 选择颜色主题 */
  const handleSelectTheme = (themeId: string) => {
    if (isDark) {
      confirm({
        title: '提示',
        message: '夜间模式已启用，切换主题颜色可能效果不明显。建议先关闭夜间模式再切换主题。',
        confirmText: '继续切换',
        onConfirm: () => setColorTheme(themeId),
      });
    } else {
      setColorTheme(themeId);
    }
  };

  /** 选择背景图片 */
  const handlePickBackground = async () => {
    if (isDark) {
      confirm({
        title: '提示',
        message: '夜间模式已启用，背景图片可能效果不明显。建议先关闭夜间模式再设置背景。',
        confirmText: '继续选择',
        onConfirm: () => doPickBackground(),
      });
    } else {
      doPickBackground();
    }
  };

  const doPickBackground = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      confirm({
        title: '权限不足',
        message: '需要相册权限才能选择背景图片。',
        cancelText: '',
        confirmText: '好的',
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setBackgroundImage(result.assets[0].uri);
    }
  };

  /** 移除背景图片 */
  const handleRemoveBackground = () => {
    setBackgroundImage(null);
  };

  return (
    <Screen safeAreaEdges={['left', 'right']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* 顶部栏 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: 'rgba(107, 114, 128, 0.15)' }]}>
              <SvgIcon name="cog" size={18} color={colors.textSecondary} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>设置</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* 外观 */}
          <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>外观</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.accentBg }]}>
                  <SvgIcon name="moon" size={20} color={colors.accent} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>夜间模式</Text>
              </View>
              <Switch
                value={settings.darkMode}
                onValueChange={(v) => handleToggleSetting('darkMode', v)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* 主题切换 */}
          <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>主题颜色</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* 颜色选择 */}
            <View style={styles.themeSwatchRow}>
              {COLOR_THEMES.map((theme) => (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeSwatch,
                    { backgroundColor: theme.lightBg },
                    colorThemeId === theme.id && { borderWidth: 2, borderColor: theme.lightAccent },
                  ]}
                  onPress={() => handleSelectTheme(theme.id)}
                  activeOpacity={0.7}
                >
                  {colorThemeId === theme.id && (
                    <SvgIcon name="check" size={14} color={theme.lightAccent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.themeNamesRow}>
              {COLOR_THEMES.map((theme) => (
                <Text
                  key={theme.id}
                  style={[
                    styles.themeName,
                    { color: colorThemeId === theme.id ? colors.text : colors.textTertiary },
                  ]}
                >
                  {theme.name}
                </Text>
              ))}
            </View>

            {/* 分割线 */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* 背景图片 */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#B197FC15' }]}>
                  <SvgIcon name="image" size={20} color="#B197FC" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>自定义背景</Text>
                  {backgroundImageUri && (
                    <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>已设置背景图片</Text>
                  )}
                </View>
              </View>
              {backgroundImageUri ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={handleRemoveBackground} style={[styles.smallBtn, { backgroundColor: '#FF6B6B15' }]}>
                    <SvgIcon name="delete" size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePickBackground} style={[styles.smallBtn, { backgroundColor: colors.accentBg }]}>
                    <SvgIcon name="edit" size={16} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={handlePickBackground} style={[styles.smallBtn, { backgroundColor: colors.accentBg }]}>
                  <SvgIcon name="plus" size={16} color={colors.accent} />
                </TouchableOpacity>
              )}
            </View>

            {/* 背景图片预览 */}
            {backgroundImageUri && (
              <View style={styles.bgPreviewWrap}>
                <Image source={{ uri: backgroundImageUri }} style={styles.bgPreview} resizeMode="cover" />
              </View>
            )}

            {/* 虚线上传区域 */}
            {!backgroundImageUri && (
              <TouchableOpacity
                style={[styles.dashedUpload, { borderColor: colors.border }]}
                onPress={handlePickBackground}
                activeOpacity={0.7}
              >
                <View style={[styles.dashedPlus, { backgroundColor: colors.inputBg }]}>
                  <SvgIcon name="plus" size={24} color={colors.textTertiary} />
                </View>
                <Text style={[styles.dashedText, { color: colors.textTertiary }]}>点击上传背景图片</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 交互 */}
          <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>交互</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#FF6B6B15' }]}>
                  <SvgIcon name="volume" size={20} color="#FF6B6B" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>转盘音效</Text>
              </View>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(v) => handleToggleSetting('soundEnabled', v)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#FFA94D15' }]}>
                  <SvgIcon name="vibrate" size={20} color="#FFA94D" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>触感反馈</Text>
              </View>
              <Switch
                value={settings.hapticEnabled}
                onValueChange={(v) => handleToggleSetting('hapticEnabled', v)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#74C0FC15' }]}>
                  <SvgIcon name="info" size={20} color="#74C0FC" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>震动提醒</Text>
              </View>
              <Switch
                value={settings.vibrationEnabled}
                onValueChange={(v) => handleToggleSetting('vibrationEnabled', v)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* 转盘外观 */}
          <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>转盘外观</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#FF922B15' }]}>
                  <SvgIcon name="palette" size={20} color="#FF922B" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>配色方案</Text>
              </View>
            </View>
            <View style={styles.wheelColorRow}>
              {[
                { id: 'default', name: '默认', colors: ['#6C63FF', '#FF6B6B', '#FFA94D', '#51CF66', '#339AF0', '#CC5DE8'] },
                { id: 'warm', name: '暖色', colors: ['#FF6B6B', '#FFA94D', '#FFD43B', '#FF922B', '#F06595', '#E64980'] },
                { id: 'cool', name: '冷色', colors: ['#339AF0', '#22B8CF', '#20C997', '#51CF66', '#94D82D', '#6C63FF'] },
                { id: 'soft', name: '柔和', colors: ['#B197FC', '#FFC9C9', '#AEC8FF', '#B2F2BB', '#FFD8A8', '#EEBEE8'] },
              ].map((scheme) => (
                <TouchableOpacity
                  key={scheme.id}
                  style={[styles.wheelColorOption, { borderColor: wheelColorScheme === scheme.id ? colors.accent : 'transparent' }]}
                  onPress={async () => {
                    setWheelColorScheme(scheme.id);
                    await saveSettings({ wheelColorScheme: scheme.id });
                  }}
                >
                  <View style={styles.wheelColorPreview}>
                    {scheme.colors.slice(0, 4).map((c, i) => (
                      <View key={i} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c }} />
                    ))}
                  </View>
                  <Text style={[styles.wheelColorName, { color: colors.textSecondary }]}>{scheme.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#20C99715' }]}>
                  <SvgIcon name="compass" size={20} color="#20C997" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>指针样式</Text>
              </View>
            </View>
            <View style={styles.pointerStyleRow}>
              {[
                { id: 'classic', name: '三角', symbol: '▲' },
                { id: 'circle', name: '圆点', symbol: '●' },
                { id: 'arrow', name: '箭头', symbol: '▼' },
              ].map((style) => (
                <TouchableOpacity
                  key={style.id}
                  style={[styles.pointerOption, { borderColor: wheelPointerStyle === style.id ? colors.accent : 'transparent', backgroundColor: colors.inputBg }]}
                  onPress={async () => {
                    setWheelPointerStyle(style.id);
                    await saveSettings({ wheelPointerStyle: style.id as 'classic' | 'arrow' | 'diamond' | 'circle' });
                  }}
                >
                  <Text style={[styles.pointerIcon, { color: colors.text }]}>{style.symbol}</Text>
                  <Text style={[styles.pointerName, { color: colors.textSecondary }]}>{style.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 数据 */}
          <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>数据</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.settingRow} onPress={handleExportData} activeOpacity={0.7} disabled={exporting}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#339AF015' }]}>
                  <SvgIcon name="share" size={20} color="#339AF0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>导出数据</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>将决策、历史、备忘录导出为 JSON 文件</Text>
                </View>
              </View>
              <SvgIcon name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.settingRow} onPress={handleOpenImport} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#51CF6615' }]}>
                  <SvgIcon name="download" size={20} color="#51CF66" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>导入数据</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>从 JSON 文件导入数据（会覆盖现有数据）</Text>
                </View>
              </View>
              <SvgIcon name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.settingRow} onPress={handleClearData} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#FF6B6B15' }]}>
                  <SvgIcon name="delete" size={20} color="#FF6B6B" />
                </View>
                <Text style={[styles.settingLabel, { color: '#FF6B6B' }]}>清除全部数据</Text>
              </View>
              <SvgIcon name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* 关于 */}
          <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>关于</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.settingRow} onPress={() => setShowAbout(true)} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#69DB7C15' }]}>
                  <SvgIcon name="info" size={20} color="#69DB7C" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>关于应用</Text>
              </View>
              <SvgIcon name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.settingRow} onPress={() => setShowPrivacy(true)} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#B197FC15' }]}>
                  <SvgIcon name="shield" size={20} color="#B197FC" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>隐私政策</Text>
              </View>
              <SvgIcon name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/appreciation')} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#FFD43B15' }]}>
                  <SvgIcon name="heart" size={20} color="#FFD43B" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>赞赏支持</Text>
              </View>
              <SvgIcon name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* 分享应用 */}
          <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>分享应用</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleShareQR}
              disabled={sharing}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#FF922B15' }]}>
                  <SvgIcon name="share" size={20} color="#FF922B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>分享二维码</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                    {sharing ? '生成中...' : '生成二维码分享给朋友'}
                  </Text>
                </View>
              </View>
              <SvgIcon name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* 联系我们 */}
          <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>联系我们</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#339AF015' }]}>
                  <SvgIcon name="mail" size={20} color="#339AF0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>意见反馈</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>3956565836@qq.com</Text>
                </View>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={{ padding: 16 }}>
              <Text style={[{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }]}>
                如果您有任何建议、问题或想法，欢迎通过邮件联系我们。{'\n'}
                您的每一条反馈都是我们改进的动力！
              </Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* 关于弹窗 */}
        {showAbout && (
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.accentBg }]}>
                <SvgIcon name="dice-multiple" size={40} color={colors.accent} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>随机决策助手</Text>
              <Text style={[styles.modalVersion, { color: colors.textSecondary }]}>版本 1.0.0</Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                一款解决日常选择困难的轻量工具。{'\n\n'}
                通过场景化模板和转盘随机，{'\n'}
                帮你快速做出决策。{'\n\n'}
                所有数据仅存储在本地设备。
              </Text>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.accent }]}
                onPress={() => setShowAbout(false)}
              >
                <Text style={styles.modalButtonText}>知道了</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 隐私政策弹窗 */}
        {showPrivacy && (
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>隐私政策</Text>
              <ScrollView style={styles.privacyScroll}>
                <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                  本应用尊重并保护所有用户的个人隐私权。{'\n\n'}
                  1. 数据存储{'\n'}
                  所有数据（包括自定义决策、历史记录、备忘录）仅存储在您的本地设备上，不会上传至任何服务器。{'\n\n'}
                  2. 日历权限{'\n'}
                  备忘录的提醒功能需要访问日历权限，仅在您主动设置提醒时使用，不会读取或修改其他日历数据。{'\n\n'}
                  3. 网络访问{'\n'}
                  本应用不需要网络访问权限，所有功能均可离线使用。{'\n\n'}
                  4. 数据删除{'\n'}
                  您可以随时通过「清除全部数据」功能删除所有本地数据。
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.accent }]}
                onPress={() => setShowPrivacy(false)}
              >
                <Text style={styles.modalButtonText}>我已阅读</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 导入数据弹窗 */}
        {showImportModal && (
          <Modal visible={showImportModal} transparent animationType="slide">
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.importModalContent, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>导入数据</Text>
                  <Text style={[styles.importHint, { color: colors.textSecondary }]}>
                    请粘贴之前导出的 JSON 数据。注意：导入会覆盖当前所有数据。
                  </Text>
                  <TextInput
                    style={[styles.importInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    placeholder="粘贴 JSON 数据..."
                    placeholderTextColor={colors.textTertiary}
                    value={importText}
                    onChangeText={setImportText}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                  />
                  <View style={styles.importButtons}>
                    <TouchableOpacity
                      style={[styles.importCancelBtn, { borderColor: colors.border }]}
                      onPress={() => setShowImportModal(false)}
                      disabled={importing}
                    >
                      <Text style={[styles.importCancelText, { color: colors.textSecondary }]}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.importConfirmBtn, { backgroundColor: colors.accent, opacity: importing ? 0.6 : 1 }]}
                      onPress={handleImportData}
                      disabled={importing}
                    >
                      <Text style={styles.importConfirmText}>{importing ? '导入中...' : '确认导入'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}
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
    alignItems: 'center',
    justifyContent: 'center',
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
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalContent: {
    width: '80%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalVersion: {
    fontSize: 13,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  privacyScroll: {
    maxHeight: 300,
    marginBottom: 16,
  },
  privacyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  // 主题切换
  themeSwatchRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  themeSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeNamesRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 8,
    paddingBottom: 14,
  },
  themeName: {
    fontSize: 10,
    width: 36,
    textAlign: 'center',
  },
  wheelColorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  wheelColorOption: {
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  wheelColorPreview: {
    flexDirection: 'row',
    gap: 2,
  },
  wheelColorName: {
    fontSize: 11,
    fontWeight: '600',
  },
  pointerStyleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pointerOption: {
    alignItems: 'center',
    gap: 4,
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 60,
  },
  pointerIcon: {
    fontSize: 18,
  },
  pointerName: {
    fontSize: 11,
    fontWeight: '600',
  },
  smallBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgPreviewWrap: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
    overflow: 'hidden',
    height: 100,
  },
  bgPreview: {
    width: '100%',
    height: '100%',
  },
  dashedUpload: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedPlus: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dashedText: {
    fontSize: 13,
  },
  // 导入弹窗
  importModalContent: {
    width: '85%',
    borderRadius: 24,
    padding: 24,
  },
  importHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    textAlign: 'center',
  },
  importInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: 150,
    maxHeight: 250,
  },
  importButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  importCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  importCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  importConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  importConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
