/**
 * 随机决策助手 - 15 个预置场景模板
 * 饮食 4 个、生活日常 4 个、休闲娱乐 3 个、学习工作 2 个、聚会游戏 2 个
 */
import type { DecisionItem } from '@/types';

export const PRESET_TEMPLATES: DecisionItem[] = [
  // ===== 高频快捷区 (4个) =====
  {
    id: 'preset-food-today',
    name: '今天吃什么',
    category: '饮食',
    options: ['火锅', '烧烤', '麻辣烫', '日料', '披萨', '炒菜', '面条', '沙拉'],
    isPreset: true,
    isHighFrequency: true,
    icon: 'food',
  },
  {
    id: 'preset-drink-today',
    name: '今天喝什么',
    category: '饮食',
    options: ['奶茶', '咖啡', '果汁', '柠檬水', '可乐', '矿泉水', '酸奶', '豆浆'],
    isPreset: true,
    isHighFrequency: true,
    icon: 'coffee',
  },
  {
    id: 'preset-who-pays',
    name: '谁买单',
    category: '聚会游戏',
    options: ['我', '你', '他/她', 'AA制', '请客', '猜拳决定'],
    isPreset: true,
    isHighFrequency: true,
    icon: 'cash',
  },
  {
    id: 'preset-chores',
    name: '谁做家务',
    category: '生活日常',
    options: ['我', '另一半', '石头剪刀布', '轮流', '今天休息', '请保洁'],
    isPreset: true,
    isHighFrequency: true,
    icon: 'home',
  },

  // ===== 饮食 (补充) =====
  {
    id: 'preset-where-eat',
    name: '去哪吃',
    category: '饮食',
    options: ['家里做', '外卖', '楼下小店', '商场餐厅', '路边摊', '食堂'],
    isPreset: true,
    icon: 'compass',
  },

  // ===== 生活日常 (补充3个) =====
  {
    id: 'preset-what-wear',
    name: '今天穿什么',
    category: '生活日常',
    options: ['休闲风', '运动风', '正式装', '简约风', '混搭', '怎么舒服怎么来'],
    isPreset: true,
    icon: 'heart',
  },
  {
    id: 'preset-weekend-do',
    name: '周末做什么',
    category: '生活日常',
    options: ['宅家休息', '逛街购物', '看电影', '运动健身', '约朋友', '学习充电', '去公园'],
    isPreset: true,
    icon: 'calendar',
  },
  {
    id: 'preset-how-relax',
    name: '怎么放松',
    category: '生活日常',
    options: ['听音乐', '泡澡', '散步', '冥想', '打游戏', '看书', '早睡'],
    isPreset: true,
    icon: 'moon',
  },

  // ===== 休闲娱乐 (3个) =====
  {
    id: 'preset-watch-what',
    name: '看什么剧',
    category: '休闲娱乐',
    options: ['喜剧片', '动作片', '科幻片', '爱情片', '悬疑片', '纪录片', '动画片', '恐怖片'],
    isPreset: true,
    icon: 'film',
  },
  {
    id: 'preset-play-what',
    name: '玩什么游戏',
    category: '休闲娱乐',
    options: ['王者荣耀', '原神', '狼人杀', '桌游', 'Switch', '手游休闲', '剧本杀'],
    isPreset: true,
    icon: 'gamepad',
  },
  {
    id: 'preset-listen-what',
    name: '听什么歌',
    category: '休闲娱乐',
    options: ['流行', '摇滚', '民谣', '电子', '古典', '说唱', 'R&B', '爵士'],
    isPreset: true,
    icon: 'music',
  },

  // ===== 学习工作 (2个) =====
  {
    id: 'preset-what-learn',
    name: '学点什么',
    category: '学习工作',
    options: ['编程', '英语', '画画', '摄影', '写作', '理财', '心理学', '设计'],
    isPreset: true,
    icon: 'book',
  },
  {
    id: 'preset-first-task',
    name: '先做哪项工作',
    category: '学习工作',
    options: ['回复邮件', '写文档', '开会', '写代码', '做PPT', '整理资料', '头脑风暴'],
    isPreset: true,
    icon: 'briefcase',
  },

  // ===== 聚会游戏 (补充2个) =====
  {
    id: 'preset-truth-dare',
    name: '真心话还是大冒险',
    category: '聚会游戏',
    options: [
      '说一个秘密',
      '模仿一个人',
      '唱一首歌',
      '打电话给好友说我爱你',
      '做10个俯卧撑',
      '讲一个笑话',
      '发一条朋友圈',
      '表演才艺',
    ],
    isPreset: true,
    icon: 'dice-multiple',
  },
  {
    id: 'preset-werewolf-role',
    name: '狼人杀随机分职',
    category: '聚会游戏',
    options: [
      '狼人',
      '狼人',
      '狼人',
      '村民',
      '村民',
      '村民',
      '村民',
      '预言家',
      '女巫',
      '猎人',
      '守卫',
      '白痴',
    ],
    isPreset: true,
    icon: 'mask',
  },
];

/** 获取高频快捷模板 */
export function getHighFrequencyTemplates(): DecisionItem[] {
  return PRESET_TEMPLATES.filter((t) => t.isHighFrequency);
}

/** 按分类获取模板 */
export function getTemplatesByCategory(): Record<string, DecisionItem[]> {
  const result: Record<string, DecisionItem[]> = {};
  for (const template of PRESET_TEMPLATES) {
    if (template.isHighFrequency) continue;
    if (!result[template.category]) {
      result[template.category] = [];
    }
    result[template.category].push(template);
  }
  return result;
}

/** 根据 ID 获取预置模板 */
export function getPresetById(id: string): DecisionItem | undefined {
  return PRESET_TEMPLATES.find((t) => t.id === id);
}
