# 随机决策助手 · Decision Helper

> 一个**纯本地、完全离线**的 React Native 随机决策工具：转盘帮你做选择，决策历史、自定义项与备忘录全部留在手机本地，不上传、不联网。

[![CI](https://github.com/starfadeaway/Decision-Helper/actions/workflows/ci.yml/badge.svg)](https://github.com/starfadeaway/Decision-Helper/actions/workflows/ci.yml)

---

## 功能

- **转盘决策**：扇区式转盘，支持权重随机；旋转过程中有随进度渐变的滴答音效与触感反馈，落定后有结果提示音。
- **预置场景模板**：15 个模板覆盖 5 个分类（饮食 3 / 生活日常 4 / 休闲娱乐 3 / 学习工作 2 / 聚会游戏 3），其中 4 个高频模板置顶快捷区。
- **自定义决策**：自建选项、编辑、置顶、删除。
- **决策历史与统计**：记录每次结果并按分类统计。
- **备忘录**：带标签的备忘，支持提醒。
- **数据导入导出**：本地文件导入 / 导出，方便换机。
- **深浅色主题**：跟随系统或手动切换，6 套配色。

## 技术栈

| | |
|---|---|
| 框架 | Expo SDK 54.0.33 · React Native 0.81.5（New Architecture 开启）· React 19.1.0 |
| 语言 | TypeScript 5.8（`strict: true`） |
| 路由 | expo-router（文件式路由） |
| 样式 | Tailwind CSS 4 + Uniwind |
| 状态 / 存储 | React Context + AsyncStorage（**无后端、无网络请求**） |
| 原生模块 | expo-av / expo-haptics / expo-calendar / expo-image-picker / expo-sharing / expo-clipboard / expo-notifications |
| 动画 | react-native-reanimated 4 + react-native-worklets |
| 引擎 | Hermes（release 构建编译为 Hermes 字节码） |
| 打包 | Gradle 8.13 · AGP 8.13 · NDK 27.1.12297006 · compileSdk 36 / minSdk 24 |

## 快速开始

前置：**Node.js 20+**、npm 10+。

```bash
# 1. 安装依赖（依赖只装在 client/ 下）
npm ci --prefix client --ignore-scripts

# 2. 启动开发服务器（默认 http://localhost:8081）
npm run start
```

根目录的 `package.json` 只是脚本转发层，四个命令都可以在根目录直接用：

```bash
npm run lint     # tsc --noEmit + ESLint（--quiet，只看 error）
npm run test     # jest（数据契约守卫）
npm run build    # expo export --platform web，产物在 client/dist/
```

也可以进 `client/` 里跑同名脚本，行为一致。

> `--ignore-scripts` 是有意为之：client 原本带一个 `postinstall` 会跑 `npx depcheck` 并自动改依赖树，在 CI 里既慢又不可控。依赖版本由 `client/package-lock.json` 固定。

## 质量门禁

CI（`.github/workflows/ci.yml`）跑在 Node 20 上，三道门禁缺一不可：

| 门禁 | 命令 | 拦什么 |
|---|---|---|
| 类型 + 规范 | `npm run lint` | 类型错误、ESLint 规则违反 |
| 单元测试 | `npm test -- --ci` | 预置模板的数据契约被改坏 |
| 构建 | `npm run build` | 只在打包期暴露的问题（缺模块、资源路径错、别名解析失败） |

单元测试目前覆盖 `client/data/templates.ts` 的数据契约：模板总数、id 唯一性、字段完整性、选项数量下限，以及**写死的分类分布**——最后这条专门用来拦「文件头注释与真实数据分叉」这类错误。

## 构建 Android APK

前置条件：

- **JDK 17**（本机用的是 `D:\jdk17`，Temurin 17.0.19）
- **Android SDK**，且已安装 platform 36 / build-tools 36.0.0 / NDK 27.1.12297006
- 环境变量 `ANDROID_HOME` 指向 SDK 目录

```powershell
$env:JAVA_HOME = 'D:\jdk17'          # 必须指向真实存在的 JDK 目录
cd client\android
.\gradlew.bat --version               # 硬前置：先确认 JVM 与 Gradle 正常
.\gradlew.bat assembleRelease         # 产出可独立安装运行的 release APK
```

产物：`client/android/app/build/outputs/apk/release/app-release.apk`（release 用仓库内的 debug keystore 签名，内嵌 Hermes bundle，装上就能跑，不需要连开发服务器）。

调试用的 `assembleDebug` **不内嵌 JS bundle**，装到手机上还得连 Metro，除非另配 `adb reverse`。

### 两个必须知道的坑

**1. 仓库路径必须不含非 ASCII 字符。**
Android 的原生 C++ 工具链在中文路径下会失败：CMake 生成的预编译头文件里包含的路径按系统 ANSI 编码（中文 Windows 是 GBK）写出，而 clang 按 UTF-8 读，于是报

```
fatal error: cannot open file '.../ExpoHeader.pch': unspecified system_category error
```

这不是能靠配置绕过的（`android.overridePathCheck=true` 只是让 AGP 不再拒绝非 ASCII 路径，编码问题依旧）。把仓库放到纯英文路径下构建即可，例如：

```bash
git clone https://github.com/starfadeaway/Decision-Helper.git C:/build/Decision-Helper
cd C:/build/Decision-Helper/client/android
gradlew.bat assembleRelease
```

**2. `gradle.properties` 里的 `-Dfile.encoding=UTF-8` 不能删。**
Gradle 用守护进程 JVM 的默认字符集解码子进程输出（`settings.gradle` / `app/build.gradle` 里的 `node --print require.resolve(...)` 路径解析、Expo 的 autolinking 模块解析都走这条通道）。JDK 17 在中文 Windows 上默认 GBK，而 node 输出 UTF-8，路径里的中文会被打乱码，报出「Included build ... does not exist」——而那个目录其实存在。

### 加速提示

默认会为 4 个 ABI（`armeabi-v7a, arm64-v8a, x86, x86_64`）编译原生代码。本地只做真机调试时可以只编一个：

```bash
gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

## 离线边界

这个应用**不联网**，说清楚具体指什么：

- 代码里没有任何 `fetch` / `axios` / `XMLHttpRequest` 请求，没有后端服务，没有 API 密钥。
- 所有数据存在设备本地（AsyncStorage）：自定义决策、历史记录、备忘录、设置与统计。
- **音效随包内置**（`client/assets/sounds/` 下的两个 mp3），不打网络请求，离线时正常播放。
- **安装包里没有联网权限** —— 见下面「权限」一节，这条可以用 `aapt2` 直接复核。

## 权限

原生库会把自己的权限无条件声明进合并清单：Glide 要 `INTERNET`，ShortcutBadger 要十几家厂商的桌面角标权限，firebase-messaging 要 `c2dm` 与 `WAKE_LOCK`……这些应用一条都用不到。`client/android/app/src/main/AndroidManifest.xml` 里用 `tools:node="remove"` 逐条摘掉，每条都写明了理由。

最终 APK 只剩 4 条权限：

```bash
aapt2 dump badging app-release.apk | grep uses-permission
```

```
uses-permission: name='android.permission.READ_EXTERNAL_STORAGE' maxSdkVersion='32'
uses-permission: name='android.permission.VIBRATE'
uses-permission: name='android.permission.POST_NOTIFICATIONS'
uses-permission: name='io.expo.client.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'
```

| 权限 | 用途 |
|---|---|
| `READ_EXTERNAL_STORAGE`（仅 ≤ Android 12） | 选背景图时读相册；Android 13+ 走系统 PhotoPicker，不需要权限 |
| `VIBRATE` | 通知与触感反馈 |
| `POST_NOTIFICATIONS` | 决策结果弹一条本地通知（Android 13+ 需要显式授权） |
| `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | androidx 自带的自签名权限，保护 Android 13+ 的动态广播接收器 |

`INTERNET` 不在其中 ——「完全离线可用」不是一句宣传语，装完 APK 在系统权限列表里就能自己核对。

## 工程说明

这套工程的脚手架来自 Coze 的 React Native / Expo 模板（`client/heroui/` 是 vendored 的 HeroUI 组件库，`eslint-plugins/` 是脚手架自带的规则集）。模板负责的是脚手架与组件底座；**业务代码、页面实现、交互与视觉均为手写**：

| | |
|---|---|
| 手写代码 | 49 个文件 / **10,830 行**（`app` `screens` `components` `contexts` `hooks` `utils` `data`） |
| 其中页面层 | `screens/` 10 个页面 / 6,113 行 |
| vendored 组件库 | `client/heroui/` 375 个文件 / 39,247 行（第三方，非手写） |

> 行数口径：按文件实际行数统计（含空行），不含 `client/heroui/`。

## 目录结构

```
Decision-Helper/
├── client/                     # Expo 应用根（package.json + app.config.ts 都在这里）
│   ├── app/                    # expo-router 路由（10 个功能路由 + 2 个布局 + 404）
│   ├── screens/                # 页面实现（与 app/ 路由一一对应）
│   ├── components/             # 可复用组件（转盘、页面容器、图标等）
│   ├── contexts/               # React Context（主题、引导）
│   ├── hooks/                  # 自定义 Hooks
│   ├── utils/                  # 存储、音效、日历、导入导出
│   ├── data/                   # 预置模板数据 + 数据契约测试
│   ├── assets/                 # 图片 / 字体 / 音效
│   ├── android/                # 原生工程（已入库，prebuild 产物）
│   ├── heroui/                 # vendored HeroUI 组件库
│   ├── app.config.ts           # 应用配置（唯一口径源）
│   └── package.json            # 依赖与脚本
├── eslint-plugins/             # 脚手架自带的 ESLint 规则集（6 个插件）
├── .github/workflows/ci.yml    # 质量门禁
├── package.json                # 脚本转发层
└── .npmrc                      # npm 配置（registry 指向国内镜像）
```

路由与页面的对应关系：`app/` 下只放路由配置，真正的页面实现在 `screens/`。当前共 10 个功能路由，其中 **8 个核心页面**：底部 5 个 tab（决策 / 全部 / 备忘录 / 历史 / 设置）加 3 个独立页（决策结果 / 我的决策 / 赞赏支持），另有 2 个编辑二级页（编辑决策 / 编辑备忘录）。

## 素材与许可

- **音效**：滴答声与结果提示音来自 [Mixkit](https://mixkit.co/free-sound-effects/)（Free License，允许商用、无需署名），已作为 mp3 随包内置于 `client/assets/sounds/`。
- **组件库**：`client/heroui/` 为 vendored 的 HeroUI，遵循其上游许可证。
- **图标与图片**：仓库内 `client/assets/images/`。
