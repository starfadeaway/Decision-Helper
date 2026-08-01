/**
 * Web 端颜色方案更新组件
 * 用于在 Web 端动态切换亮色/暗色主题
 * 同时支持 Uniwind 主题系统和 CSS dark class
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Uniwind } from 'uniwind';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@app_theme_preference';

/**
 * 在 Web 端应用主题到 DOM
 * 同时操作 class、data-theme 属性和 color-scheme
 */
export function applyWebTheme(theme: 'light' | 'dark' | 'system') {
  if (Platform.OS !== 'web') return;
  
  const doc = globalThis.document;
  if (!doc) return;

  const root = doc.documentElement;
  const body = doc.body;
  
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
    if (body) {
      body.classList.add('dark');
      body.setAttribute('data-theme', 'dark');
      body.style.colorScheme = 'dark';
    }
  } else if (theme === 'light') {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
    if (body) {
      body.classList.remove('dark');
      body.setAttribute('data-theme', 'light');
      body.style.colorScheme = 'light';
    }
  } else {
    // system: 移除手动设置，让系统偏好生效
    root.classList.remove('dark');
    root.removeAttribute('data-theme');
    root.style.colorScheme = '';
    if (body) {
      body.classList.remove('dark');
      body.removeAttribute('data-theme');
      body.style.colorScheme = '';
    }
  }
}

/**
 * 从存储中加载并应用主题
 */
export async function loadAndApplyTheme() {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    const theme = (stored === 'dark' || stored === 'light') ? stored : 'system';
    Uniwind.setTheme(theme);
    applyWebTheme(theme);
  } catch {
    // 默认跟随系统
    Uniwind.setTheme('system');
    applyWebTheme('system');
  }
}

/**
 * 保存并应用主题偏好
 */
export async function saveAndApplyTheme(theme: 'light' | 'dark' | 'system') {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  Uniwind.setTheme(theme);
  applyWebTheme(theme);
}

/**
 * 获取当前主题偏好
 */
export async function getThemePreference(): Promise<'light' | 'dark' | 'system'> {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // ignore
  }
  return 'system';
}

/**
 * Web 端颜色方案更新组件
 * 在应用启动时从存储中加载主题偏好并应用
 */
export function WebOnlyColorSchemeUpdater({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      loadAndApplyTheme();
    }
  }, []);

  return <>{children}</>;
}
