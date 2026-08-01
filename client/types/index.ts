/**
 * 随机决策助手 - 类型定义
 */

/** 决策分类 */
export type DecisionCategory = '饮食' | '生活日常' | '休闲娱乐' | '学习工作' | '聚会游戏';

/** 带权重的选项 */
export interface WeightedOption {
  text: string;
  weight: number; // 权重百分比，所有选项权重之和应为100
}

/** 决策模板/自定义决策 */
export interface DecisionItem {
  id: string;
  name: string;
  category: DecisionCategory;
  options: string[];
  weights?: number[]; // 可选权重数组，与 options 对应， undefined 表示等概率
  isPreset: boolean;
  isHighFrequency?: boolean;
  icon?: string;
  pinned?: boolean; // 是否置顶
  createdAt?: string; // 创建时间
}

/** 历史记录 */
export interface HistoryRecord {
  id: string;
  decisionName: string;
  decisionId: string;
  result: string;
  options: string[];
  timestamp: number;
  pinned?: boolean;
  category?: string;
}

/** 备忘录 */
export interface MemoItem {
  id: string;
  title: string;
  content: string;
  reminderTime: number | null; // 毫秒时间戳，null 表示无提醒
  calendarEventId: string | null; // 系统日历事件 ID
  createdAt: number;
  updatedAt: number;
  pinned?: boolean; // 是否置顶
  tags?: string[]; // 标签列表
}

/** 预设标签 */
export const PRESET_MEMO_TAGS = ['工作', '生活', '学习', '紧急', '重要', '想法', '待办'];

/** 转盘颜色方案 */
export interface WheelColorScheme {
  id: string;
  name: string;
  colors: string[];
}

/** 预置转盘颜色方案 */
export const WHEEL_COLOR_SCHEMES: WheelColorScheme[] = [
  {
    id: 'default',
    name: '默认',
    colors: ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#74C0FC', '#B197FC', '#FF8787', '#FFC078'],
  },
  {
    id: 'pastel',
    name: '柔和',
    colors: ['#FFE8E8', '#FFF3E0', '#FFFDE7', '#E8F5E9', '#E3F2FD', '#F3E5F5', '#FCE4EC', '#E0F7FA'],
  },
  {
    id: 'vivid',
    name: '鲜艳',
    colors: ['#E91E63', '#FF5722', '#FFC107', '#4CAF50', '#2196F3', '#9C27B0', '#00BCD4', '#FF9800'],
  },
  {
    id: 'ocean',
    name: '海洋',
    colors: ['#0077B6', '#00B4D8', '#48CAE4', '#90E0EF', '#023E8A', '#0096C7', '#ADE8F4', '#CAF0F8'],
  },
  {
    id: 'forest',
    name: '森林',
    colors: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7', '#1B4332', '#D8F3DC'],
  },
];

/** 指针样式 */
export type PointerStyle = 'triangle' | 'circle' | 'diamond' | 'arrow';

/** 应用设置 */
export interface AppSettings {
  darkMode: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  vibrationEnabled: boolean;
  wheelColorScheme: string; // 颜色方案 ID
  pointerStyle: PointerStyle; // 指针样式
  onboardingCompleted: boolean; // 是否完成新手引导
}

/** 默认设置 */
export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  soundEnabled: true,
  hapticEnabled: true,
  vibrationEnabled: true,
  wheelColorScheme: 'default',
  pointerStyle: 'triangle',
  onboardingCompleted: false,
};

/** 转盘扇区颜色 */
export const WHEEL_COLORS = [
  '#FF6B6B', // 红
  '#FFA94D', // 橙
  '#FFD43B', // 黄
  '#69DB7C', // 绿
  '#74C0FC', // 蓝
  '#B197FC', // 紫
  '#FF8787', // 浅红
  '#FFC078', // 浅橙
  '#FFE066', // 浅黄
  '#8CE99A', // 浅绿
  '#A5D8FF', // 浅蓝
  '#D0BFFF', // 浅紫
  '#F783AC', // 粉
  '#63E6BE', // 青
  '#E599F7', // 紫粉
  '#FFEC99', // 米黄
  '#B2F2BB', // 草绿
  '#99E9F2', // 天蓝
  '#EEA5A5', // 玫瑰
  '#C3FAE8', // 薄荷
];

/** 高频快捷区图标映射 */
export const CATEGORY_ICONS: Record<DecisionCategory, string> = {
  '饮食': 'food',
  '生活日常': 'home-account',
  '休闲娱乐': 'movie-open-outline',
  '学习工作': 'book-open-variant',
  '聚会游戏': 'dice-multiple',
};
