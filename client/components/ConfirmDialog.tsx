import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, Platform } from 'react-native';
import SvgIcon from './SvgIcon';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType>({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  confirm: () => {},
});

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
  });

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const handleConfirm = () => {
    setVisible(false);
    options.onConfirm?.();
  };

  const handleCancel = () => {
    setVisible(false);
    options.onCancel?.();
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal visible={visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={handleCancel}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dialog}>
                <View style={styles.iconContainer}>
                  <SvgIcon
                    name={options.destructive ? 'trash' : 'check'}
                    size={28}
                    color={options.destructive ? '#FF4757' : '#6C63FF'}
                  />
                </View>
                <Text style={styles.title}>{options.title}</Text>
                <Text style={styles.message}>{options.message}</Text>
                <View style={styles.buttons}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancel}
                  >
                    <Text style={styles.cancelText}>
                      {options.cancelText || '取消'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      options.destructive
                        ? { backgroundColor: '#FF4757' }
                        : { backgroundColor: '#6C63FF' },
                    ]}
                    onPress={handleConfirm}
                  >
                    <Text style={styles.confirmText}>
                      {options.confirmText || '确认'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ConfirmContext.Provider>
  );
}

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 24,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%' as const,
    maxWidth: 340,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#2D3436',
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  message: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center' as const,
    marginBottom: 24,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row' as const,
    gap: 12,
    width: '100%' as const,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F0F0F3',
    alignItems: 'center' as const,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#636E72',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
};
