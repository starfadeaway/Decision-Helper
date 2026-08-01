/**
 * 撤销提示条组件
 * 删除操作后显示3秒，允许用户撤销
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import SvgIcon from '@/components/SvgIcon';

interface UndoToastProps {
  visible: boolean;
  message?: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export default function UndoToast({
  visible,
  message = '已删除',
  onUndo,
  onDismiss,
  duration = 3000,
}: UndoToastProps) {
  const [translateY] = useState(() => new Animated.Value(100));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  }, [translateY, onDismiss]);

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    } else {
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible, handleDismiss, translateY, duration]);

  const handleUndo = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onUndo();
    handleDismiss();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
    >
      <View style={styles.content}>
        <SvgIcon name="undo" size={18} color="#FFFFFF" />
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoText}>撤销</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  undoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6C63FF',
    borderRadius: 10,
  },
  undoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
