/**
 * 页面功能引导组件
 * 每个页面只显示一次，支持跳过和下一步
 */
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SvgIcon from '@/components/SvgIcon';

interface GuideStep {
  title: string;
  description: string;
  icon?: string;
}

interface PageGuideProps {
  pageKey: string; // 页面唯一标识
  steps: GuideStep[];
}

export default function PageGuide({ pageKey, steps }: PageGuideProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const checkAndShow = async () => {
      const hasSeen = await AsyncStorage.getItem(`guide_seen_${pageKey}`);
      if (!hasSeen) {
        setVisible(true);
      }
    };
    checkAndShow();
  }, [pageKey]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = async () => {
    setVisible(false);
    await AsyncStorage.setItem(`guide_seen_${pageKey}`, 'true');
  };

  const handleSkip = async () => {
    setVisible(false);
    await AsyncStorage.setItem(`guide_seen_${pageKey}`, 'true');
  };

  if (!visible || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 跳过按钮 */}
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>跳过</Text>
          </TouchableOpacity>

          {/* 图标 */}
          {step.icon && (
            <View style={styles.iconWrap}>
              <SvgIcon name={step.icon} size={48} color="#6C63FF" />
            </View>
          )}

          {/* 标题 */}
          <Text style={styles.title}>{step.title}</Text>

          {/* 描述 */}
          <Text style={styles.description}>{step.description}</Text>

          {/* 步骤指示器 */}
          <View style={styles.dotsRow}>
            {steps.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, idx === currentStep ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>

          {/* 下一步按钮 */}
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextText}>
              {currentStep < steps.length - 1 ? '下一步' : '开始使用'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    position: 'relative',
  },
  skipBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C63FF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#6C63FF',
    width: 20,
  },
  dotInactive: {
    backgroundColor: '#E5E7EB',
  },
  nextBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
