import { ExpoConfig } from 'expo/config';

/**
 * 应用配置 —— 全仓库唯一的配置口径源
 *
 * 写死的字段不要改回环境变量：
 * - name / slug：应用名与 Expo 项目标识
 * - scheme：deep link 前缀，expo-router 的内部跳转依赖它
 * - android.package：必须与已入库的 android/ 目录（namespace / applicationId）一致，
 *   这样以后真跑 expo prebuild 时是幂等的，不会把包名改回别的值
 *
 * 平台来源说明：这套工程最初由 Coze 的脚手架生成，配置里曾有 COZE_* 分支与
 * 后端 origin 的三元表达式。脱离该平台后它们恒为空，留着只是门面噪音，已移除。
 *
 * ndkVersion 故意不写：Expo SDK 54 的默认值 27.1.12297006 即当前版本；
 * 一旦显式钉死别的版本，本机没有对应 NDK 就会在原生构建时失败。
 */
const config: ExpoConfig = {
  name: '转盘决策',
  slug: 'decision-helper',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'decisionhelper',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'io.expo.client',
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  // 这四个插件都对应代码里的真实调用，没有一个是摆设：
  // expo-router（路由）/ expo-splash-screen（启动页）/ expo-image-picker（相册）/
  // expo-calendar（备忘录提醒）
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: '允许转盘决策App访问您的相册，以便您上传或保存图片。',
      },
    ],
    [
      'expo-calendar',
      {
        calendarPermission: '转盘决策App需要访问您的日历以设置备忘录提醒。',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: 'df298061-04b5-47ea-947a-83278cdc6b9b',
    },
  },
  experiments: {
    typedRoutes: true,
  },
};

export default config;
