/**
 * 随机决策助手 - 错误处理工具
 * 提供统一的错误处理和用户提示功能
 */
import { Alert, Platform } from 'react-native';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  STORAGE = 'STORAGE',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 自定义错误类
 */
export class AppError extends Error {
  type: ErrorType;
  userMessage: string;

  constructor(message: string, type: ErrorType = ErrorType.UNKNOWN, userMessage?: string) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.userMessage = userMessage || this.getDefaultUserMessage(type);
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.STORAGE:
        return '数据保存失败，请重试';
      case ErrorType.NETWORK:
        return '网络连接失败，请检查网络';
      case ErrorType.VALIDATION:
        return '输入信息有误，请检查';
      default:
        return '发生未知错误，请重试';
    }
  }
}

/**
 * 显示错误提示
 * 在 Web 端使用 alert，在移动端使用 Alert
 */
export function showError(message: string, title?: string): void {
  if (Platform.OS === 'web') {
    // Web 端使用 alert
    window.alert(title ? `${title}: ${message}` : message);
  } else {
    // 移动端使用 Alert
    Alert.alert(title || '错误', message, [{ text: '确定' }]);
  }
}

/**
 * 显示成功提示
 */
export function showSuccess(message: string, title?: string): void {
  if (Platform.OS === 'web') {
    window.alert(title ? `${title}: ${message}` : message);
  } else {
    Alert.alert(title || '成功', message, [{ text: '确定' }]);
  }
}

/**
 * 显示确认对话框
 * 返回用户是否确认
 */
export function showConfirm(message: string, title?: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      const result = window.confirm(title ? `${title}\n${message}` : message);
      resolve(result);
    } else {
      Alert.alert(title || '确认', message, [
        { text: '取消', style: 'cancel', onPress: () => resolve(false) },
        { text: '确定', onPress: () => resolve(true) },
      ]);
    }
  });
}

/**
 * 安全执行异步操作
 * 捕获错误并显示用户友好的提示
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const message = errorMessage || (error instanceof Error ? error.message : '操作失败');
    showError(message);
    console.error('SafeAsync Error:', error);
    return null;
  }
}

/**
 * 安全执行同步操作
 * 捕获错误并显示用户友好的提示
 */
export function safeSync<T>(
  operation: () => T,
  errorMessage?: string
): T | null {
  try {
    return operation();
  } catch (error) {
    const message = errorMessage || (error instanceof Error ? error.message : '操作失败');
    showError(message);
    console.error('SafeSync Error:', error);
    return null;
  }
}

/**
 * 验证必填字段
 */
export function validateRequired(value: string | undefined | null, fieldName: string): string | null {
  if (!value || value.trim() === '') {
    return `${fieldName}不能为空`;
  }
  return null;
}

/**
 * 验证数组非空
 */
export function validateArrayNotEmpty<T>(array: T[] | undefined | null, fieldName: string): string | null {
  if (!array || array.length === 0) {
    return `${fieldName}不能为空`;
  }
  return null;
}

/**
 * 验证数字范围
 */
export function validateNumberRange(
  value: number | undefined | null,
  min: number,
  max: number,
  fieldName: string
): string | null {
  if (value === undefined || value === null || isNaN(value)) {
    return `${fieldName}必须是数字`;
  }
  if (value < min || value > max) {
    return `${fieldName}必须在 ${min} 到 ${max} 之间`;
  }
  return null;
}
