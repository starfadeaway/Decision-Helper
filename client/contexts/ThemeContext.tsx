/**
 * 主题上下文 - 提供亮/暗颜色 + 颜色主题 + 背景图片
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@app_theme_preference';
const COLOR_THEME_KEY = '@app_color_theme';
const BG_IMAGE_KEY = '@app_bg_image';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  inputBg: string;
  accent: string;
  accentBg: string;
  disabled: string;
  shadow: string;
  isDark: boolean;
}

/** 颜色主题定义 */
export interface ColorThemeDef {
  id: string;
  name: string;
  /** 亮色模式背景 */
  lightBg: string;
  /** 亮色模式卡片背景 */
  lightSurface: string;
  /** 亮色模式主色 */
  lightAccent: string;
  /** 亮色模式主色浅底 */
  lightAccentBg: string;
  /** 暗色模式背景 */
  darkBg: string;
  /** 暗色模式卡片 */
  darkSurface: string;
  /** 暗色模式主色 */
  darkAccent: string;
  /** 暗色模式主色浅底 */
  darkAccentBg: string;
}

/** 预设颜色主题 */
export const COLOR_THEMES: ColorThemeDef[] = [
  {
    id: 'default',
    name: '默认灰',
    lightBg: '#F0F0F3', lightSurface: '#FFFFFF', lightAccent: '#6C63FF', lightAccentBg: '#F0EEFF',
    darkBg: '#12121A', darkSurface: '#1E1E2E', darkAccent: '#7B73FF', darkAccentBg: '#2A2650',
  },
  {
    id: 'mint',
    name: '薄荷绿',
    lightBg: '#E8F5E9', lightSurface: '#F1F8F2', lightAccent: '#2E7D32', lightAccentBg: '#C8E6C9',
    darkBg: '#0D1F12', darkSurface: '#162B1C', darkAccent: '#66BB6A', darkAccentBg: '#1B3A22',
  },
  {
    id: 'sky',
    name: '天空蓝',
    lightBg: '#E3F2FD', lightSurface: '#EDF6FE', lightAccent: '#1565C0', lightAccentBg: '#BBDEFB',
    darkBg: '#0A1929', darkSurface: '#132F4C', darkAccent: '#42A5F5', darkAccentBg: '#0D2744',
  },
  {
    id: 'sakura',
    name: '樱花粉',
    lightBg: '#FCE4EC', lightSurface: '#FDF0F4', lightAccent: '#C2185B', lightAccentBg: '#F8BBD0',
    darkBg: '#1F0A14', darkSurface: '#331425', darkAccent: '#F06292', darkAccentBg: '#3D1530',
  },
  {
    id: 'lavender',
    name: '薰衣草',
    lightBg: '#F3E5F5', lightSurface: '#F8EFF9', lightAccent: '#7B1FA2', lightAccentBg: '#E1BEE7',
    darkBg: '#1A0D20', darkSurface: '#2D1738', darkAccent: '#AB47BC', darkAccentBg: '#351A42',
  },
  {
    id: 'warm',
    name: '暖阳橙',
    lightBg: '#FFF3E0', lightSurface: '#FFF8EE', lightAccent: '#E65100', lightAccentBg: '#FFE0B2',
    darkBg: '#1F1208', darkSurface: '#33200F', darkAccent: '#FF9800', darkAccentBg: '#3D2510',
  },
];

function buildColors(themeId: string, isDark: boolean): ThemeColors {
  const t = COLOR_THEMES.find((th) => th.id === themeId) ?? COLOR_THEMES[0];
  if (isDark) {
    return {
      background: t.darkBg,
      surface: t.darkSurface,
      text: '#E8E8F0',
      textSecondary: '#9090A8',
      textTertiary: '#606078',
      border: '#2A2A3E',
      inputBg: '#252538',
      accent: t.darkAccent,
      accentBg: t.darkAccentBg,
      disabled: '#3A3A50',
      shadow: '#000000',
      isDark: true,
    };
  }
  return {
    background: t.lightBg,
    surface: t.lightSurface,
    text: '#2D3436',
    textSecondary: '#636E72',
    textTertiary: '#B2BEC3',
    border: '#E8E8EB',
    inputBg: '#FFFFFF',
    accent: t.lightAccent,
    accentBg: t.lightAccentBg,
    disabled: '#B2BEC3',
    shadow: '#000000',
    isDark: false,
  };
}

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  colorThemeId: string;
  backgroundImageUri: string | null;
  toggleDarkMode: (value: boolean) => Promise<void>;
  setColorTheme: (id: string) => Promise<void>;
  setBackgroundImage: (uri: string | null) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: buildColors('default', false),
  isDark: false,
  colorThemeId: 'default',
  backgroundImageUri: null,
  toggleDarkMode: async () => { /* no-op */ },
  setColorTheme: async () => { /* no-op */ },
  setBackgroundImage: async () => { /* no-op */ },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);
  const [colorThemeId, setColorThemeId] = useState('default');
  const [backgroundImageUri, setBackgroundImageUri] = useState<string | null>(null);

  // 启动时读取所有偏好
  useEffect(() => {
    (async () => {
      try {
        const [themePref, colorTheme, bgImage] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(COLOR_THEME_KEY),
          AsyncStorage.getItem(BG_IMAGE_KEY),
        ]);
        if (themePref === 'dark') setIsDark(true);
        else if (themePref === 'light') setIsDark(false);
        else setIsDark(systemScheme === 'dark');

        if (colorTheme) setColorThemeId(colorTheme);
        if (bgImage) setBackgroundImageUri(bgImage);
      } catch {
        // ignore
      }
    })();
  }, [systemScheme]);

  const toggleDarkMode = useCallback(async (value: boolean) => {
    setIsDark(value);
    try { await AsyncStorage.setItem(THEME_KEY, value ? 'dark' : 'light'); } catch { /* ignore */ }
  }, []);

  const setColorTheme = useCallback(async (id: string) => {
    setColorThemeId(id);
    try { await AsyncStorage.setItem(COLOR_THEME_KEY, id); } catch { /* ignore */ }
  }, []);

  const setBackgroundImage = useCallback(async (uri: string | null) => {
    setBackgroundImageUri(uri);
    try {
      if (uri) await AsyncStorage.setItem(BG_IMAGE_KEY, uri);
      else await AsyncStorage.removeItem(BG_IMAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  const colors = buildColors(colorThemeId, isDark);

  return (
    <ThemeContext.Provider value={{ colors, isDark, colorThemeId, backgroundImageUri, toggleDarkMode, setColorTheme, setBackgroundImage }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
