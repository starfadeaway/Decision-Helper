/**
 * 预置模板的数据契约守卫
 *
 * 这里的期望值不是「随便写的数字」，而是从 data/templates.ts 实测出来的真值
 * （15 个模板 / 5 个分类 / 高频 4 个 / 非高频 11 个），并且**写死分类分布**，
 * 而不是只断言「五类齐全」—— 后者拦不住「文件头注释把分类数写错」这种错
 * （历史真实发生过：注释写「饮食 4 个 / 聚会游戏 2 个」，实际是 3 / 3）。
 *
 * 本文件只测纯逻辑数据，不碰任何原生模块，因此零 mock。
 */
import {
  PRESET_TEMPLATES,
  getHighFrequencyTemplates,
  getTemplatesByCategory,
} from '@/data/templates';

/** 实测分类分布（写死；改动数据时必须同步改这里，并想清楚为什么） */
const EXPECTED_CATEGORY_DISTRIBUTION: Record<string, number> = {
  饮食: 3,
  生活日常: 4,
  休闲娱乐: 3,
  学习工作: 2,
  聚会游戏: 3,
};

const EXPECTED_TOTAL = 15;
const EXPECTED_CATEGORY_COUNT = 5;
const EXPECTED_HIGH_FREQUENCY = 4;
const EXPECTED_NON_HIGH_FREQUENCY = 11;

describe('PRESET_TEMPLATES', () => {
  it(`共 ${EXPECTED_TOTAL} 个模板`, () => {
    expect(PRESET_TEMPLATES).toHaveLength(EXPECTED_TOTAL);
  });

  it('id 唯一且都以 preset- 开头', () => {
    const ids = PRESET_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => {
      expect(id.startsWith('preset-')).toBe(true);
    });
  });

  it('name / icon 非空，且 isPreset 为 true', () => {
    PRESET_TEMPLATES.forEach((t) => {
      expect(t.name.trim().length).toBeGreaterThan(0);
      expect((t.icon ?? '').trim().length).toBeGreaterThan(0);
      expect(t.isPreset).toBe(true);
    });
  });

  it('每个模板至少 2 个选项，且选项文本非空', () => {
    PRESET_TEMPLATES.forEach((t) => {
      expect(t.options.length).toBeGreaterThanOrEqual(2);
      t.options.forEach((o) => {
        expect(o.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('分类分布与实测一致', () => {
    const actual: Record<string, number> = {};
    PRESET_TEMPLATES.forEach((t) => {
      actual[t.category] = (actual[t.category] ?? 0) + 1;
    });
    expect(actual).toEqual(EXPECTED_CATEGORY_DISTRIBUTION);
  });

  it(`高频模板恰好 ${EXPECTED_HIGH_FREQUENCY} 个`, () => {
    expect(PRESET_TEMPLATES.filter((t) => t.isHighFrequency)).toHaveLength(
      EXPECTED_HIGH_FREQUENCY
    );
  });
});

describe('getHighFrequencyTemplates', () => {
  it(`返回 ${EXPECTED_HIGH_FREQUENCY} 条，且全部标记为高频`, () => {
    const list = getHighFrequencyTemplates();
    expect(list).toHaveLength(EXPECTED_HIGH_FREQUENCY);
    list.forEach((t) => {
      expect(t.isHighFrequency).toBe(true);
    });
  });
});

describe('getTemplatesByCategory', () => {
  it(`返回 ${EXPECTED_NON_HIGH_FREQUENCY} 条、${EXPECTED_CATEGORY_COUNT} 个分类，且不含任何高频项`, () => {
    const grouped = getTemplatesByCategory();
    const keys = Object.keys(grouped);
    expect(keys).toHaveLength(EXPECTED_CATEGORY_COUNT);
    const all = keys.flatMap((k) => grouped[k]);
    expect(all).toHaveLength(EXPECTED_NON_HIGH_FREQUENCY);
    all.forEach((t) => {
      expect(t.isHighFrequency).toBeFalsy();
    });
  });
});
