/**
 * 双击/双滑返回退出应用的 Hook
 * 仅在 Android 平台生效
 */
import { useEffect, useRef, useCallback } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';

/**
 * 双击返回退出应用的 Hook
 * @param enabled 是否启用此功能
 */
export function useDoubleBackToExit(enabled: boolean = true) {
  const lastBackPress = useRef<number>(0);
  const EXIT_TIME_WINDOW = 2000; // 2秒内双击

  const handleBackPress = useCallback(() => {
    if (!enabled || Platform.OS !== 'android') {
      return false; // 不拦截返回事件
    }

    const now = Date.now();
    const timeSinceLastPress = now - lastBackPress.current;

    if (timeSinceLastPress < EXIT_TIME_WINDOW) {
      // 第二次按下，退出应用
      BackHandler.exitApp();
      return true;
    } else {
      // 第一次按下，显示提示
      lastBackPress.current = now;
      ToastAndroid.show('再次返回以退出应用', ToastAndroid.SHORT);
      return true; // 拦截返回事件
    }
  }, [enabled]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    return () => {
      subscription.remove();
    };
  }, [handleBackPress, enabled]);
}
