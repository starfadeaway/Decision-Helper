/**
 * 音效工具
 * 提供转盘旋转滴答声和结果提示音
 * 
 * Web 端：使用 Web Audio API 生成渐变滴答声
 * Native 端：使用 expo-av 播放音效 + expo-haptics 触感反馈
 */
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Web Audio API 上下文
let audioContext: AudioContext | null = null;

// Native 音效实例
let tickSound: Audio.Sound | null = null;
let resultSound: Audio.Sound | null = null;

/**
 * 获取 Web Audio 上下文
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioContext;
}

/**
 * 初始化 Native 音频模式
 */
async function initNativeAudio() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });
  } catch {
    // 忽略错误
  }
}

/**
 * 加载 Native 音效
 */
async function loadNativeSounds() {
  if (Platform.OS === 'web') return;
  
  try {
    // 使用系统音效或简单的提示音
    // 这里使用一个简短的提示音 URL
    const { sound: tick } = await Audio.Sound.createAsync(
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
      { shouldPlay: false, volume: 0.3 }
    );
    tickSound = tick;
    
    const { sound: result } = await Audio.Sound.createAsync(
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3' },
      { shouldPlay: false, volume: 0.5 }
    );
    resultSound = result;
  } catch {
    // 如果加载失败，使用触感反馈作为后备
    tickSound = null;
    resultSound = null;
  }
}

/**
 * 播放单次滴答声（Web 端）
 */
function playWebTick(frequency: number, volume: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  } catch {
    // 忽略错误
  }
}

/**
 * 播放单次滴答声（Native 端）
 */
async function playNativeTick() {
  // 优先使用音效
  if (tickSound) {
    try {
      await tickSound.replayAsync();
    } catch {
      // 如果播放失败，使用触感反馈
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } else {
    // 使用触感反馈作为后备
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/**
 * 播放单次滴答声
 */
export async function playSingleTick(frequency: number, volume: number) {
  if (Platform.OS === 'web') {
    playWebTick(frequency, volume);
  } else {
    await playNativeTick();
  }
}

/**
 * 预加载 Native 音效（模块加载时自动调用）
 */
async function preloadNativeSounds() {
  if (Platform.OS === 'web') return;
  
  try {
    await initNativeAudio();
    await loadNativeSounds();
  } catch {
    // 预加载失败不影响后续使用
  }
}

// 模块加载时预加载音效
preloadNativeSounds();

/**
 * 开始渐变滴答声（转盘旋转时）
 */
export async function startSpinningSound() {
  stopSpinningSound();
  
  // 确保 Native 音效已加载
  if (Platform.OS !== 'web') {
    await initNativeAudio();
    if (!tickSound || !resultSound) {
      await loadNativeSounds();
    }
  }
  
  const ctx = Platform.OS === 'web' ? getAudioContext() : null;
  if (Platform.OS === 'web' && !ctx) return;

  let tickCount = 0;
  const maxTicks = 40; // 最多40次滴答
  const initialInterval = 50; // 初始间隔50ms（快速）
  const finalInterval = 200; // 最终间隔200ms（慢速）
  
  async function scheduleNextTick() {
    if (tickCount >= maxTicks) {
      stopSpinningSound();
      return;
    }
    
    // 进度 0 -> 1
    const progress = tickCount / maxTicks;
    // 间隔从 initialInterval 渐变到 finalInterval
    const currentInterval = initialInterval + (finalInterval - initialInterval) * progress;
    // 频率从 800Hz 渐变到 300Hz
    const currentFrequency = 800 - 500 * progress;
    // 音量从 0.1 渐变到 0.03
    const currentVolume = 0.1 - 0.07 * progress;
    
    await playSingleTick(currentFrequency, currentVolume);
    tickCount++;
    
    tickIntervalId = setTimeout(scheduleNextTick, currentInterval);
  }
  
  scheduleNextTick();
}

// 定时器 ID
let tickIntervalId: ReturnType<typeof setTimeout> | null = null;

/**
 * 停止渐变滴答声
 */
export function stopSpinningSound() {
  if (tickIntervalId !== null) {
    clearTimeout(tickIntervalId);
    tickIntervalId = null;
  }
}

/**
 * 播放结果提示音（转盘停止时）
 */
export async function playResultSound() {
  // Native 端使用音效 + 触感反馈
  if (Platform.OS !== 'web') {
    if (resultSound) {
      try {
        await resultSound.replayAsync();
      } catch {
        // 如果播放失败，使用触感反馈
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    return;
  }
  
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
    oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // 忽略错误
  }
}

/**
 * 清理音效资源
 */
export async function cleanupSounds() {
  stopSpinningSound();
  
  if (tickSound) {
    await tickSound.unloadAsync();
    tickSound = null;
  }
  
  if (resultSound) {
    await resultSound.unloadAsync();
    resultSound = null;
  }
}
