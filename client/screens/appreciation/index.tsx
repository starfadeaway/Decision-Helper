/**
 * 赞赏页面
 * 展示微信支付二维码，感谢用户支持
 */
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking, Platform } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/contexts/ThemeContext';
import SvgIcon from '@/components/SvgIcon';

export default function AppreciationScreen() {
  const router = useSafeRouter();
  const { colors } = useTheme();

  /** 联系开发者 */
  const handleContact = async () => {
    const email = '3956565836@qq.com';
    const url = `mailto:${email}?subject=随机决策助手 - 建议反馈`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('打开邮件失败:', error);
    }
  };

  return (
    <Screen backgroundColor={colors.background} safeAreaEdges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        {/* 返回按钮 */}
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface + '80' }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <SvgIcon name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* 标题 */}
        <Text style={[styles.title, { color: colors.text }]}>支持开发者</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          您的支持是我持续开发的动力
        </Text>

        {/* 二维码卡片 */}
        <View style={[styles.qrCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.qrTitle, { color: colors.text }]}>微信扫码赞赏</Text>
          <Text style={[styles.qrSubtitle, { color: colors.textSecondary }]}>
            任意金额都是对我的鼓励
          </Text>
          
          {/* 二维码图片 */}
          <View style={[styles.qrImageContainer, { backgroundColor: '#fff', borderColor: colors.border }]}>
            <Image
              source={require('@/assets/images/appreciation-qr.png')}
              style={styles.qrImage}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.qrHint, { color: colors.textTertiary }]}>
            推荐使用微信支付
          </Text>
        </View>

        {/* 感谢语 */}
        <View style={[styles.thanksCard, { backgroundColor: colors.surface + '60', borderColor: colors.border }]}>
          <SvgIcon name="heart" size={24} color="#FF6B6B" />
          <Text style={[styles.thanksText, { color: colors.text }]}>
            感谢您的赞赏
          </Text>
          <Text style={[styles.thanksDesc, { color: colors.textSecondary }]}>
            这对我后续的开发是一种极大的鼓舞{'\n'}
            我会继续努力完善这个应用
          </Text>
        </View>

        {/* 联系开发者 */}
        <TouchableOpacity
          style={[styles.contactCard, { backgroundColor: colors.surface + '60', borderColor: colors.border }]}
          onPress={handleContact}
          activeOpacity={0.7}
        >
          <SvgIcon name="mail" size={20} color={colors.accent} />
          <Text style={[styles.contactText, { color: colors.text }]}>联系开发者</Text>
          <Text style={[styles.contactEmail, { color: colors.textSecondary }]}>3956565836@qq.com</Text>
          <SvgIcon name="chevron-right" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* 建议反馈 */}
        <View style={[styles.feedbackCard, { backgroundColor: colors.surface + '40', borderColor: colors.border }]}>
          <SvgIcon name="message" size={20} color={colors.accent} />
          <Text style={[styles.feedbackTitle, { color: colors.text }]}>建议与反馈</Text>
          <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
            如果您有任何建议或发现问题，欢迎通过邮件联系我。{'\n'}
            您的每一条反馈都会帮助我改进这个应用。
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 30,
  },
  qrCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 20,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  qrImageContainer: {
    width: 240,
    height: 240,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrHint: {
    fontSize: 12,
  },
  thanksCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  thanksText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  thanksDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  contactText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  contactEmail: {
    fontSize: 12,
  },
  feedbackCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
