/**
 * 历史记录统计组件
 * 提供饼图和柱状图两种可视化统计方式
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, G, Text as SvgText, Rect } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';
import type { HistoryRecord } from '@/types';

interface StatsProps {
  records: HistoryRecord[];
}

// 分类颜色映射
const CATEGORY_COLORS: Record<string, string> = {
  '饮食': '#FF6B6B',
  '生活日常': '#4ECDC4',
  '休闲娱乐': '#45B7D1',
  '学习工作': '#96CEB4',
  '聚会游戏': '#FFEAA7',
  '其他': '#DDA0DD',
};

// 获取分类颜色
const getCategoryColor = (category: string, index: number): string => {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  // 如果没有预定义颜色，使用默认颜色数组
  const defaultColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
  return defaultColors[index % defaultColors.length];
};

/**
 * 饼图组件
 */
function PieChart({ data, size = 150 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const { colors } = useTheme();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <View style={[styles.chartContainer, { width: size, height: size }]}>
        <Text style={[styles.noDataText, { color: colors.textTertiary }]}>暂无数据</Text>
      </View>
    );
  }

  const radius = size / 2;
  const centerX = radius;
  const centerY = radius;
  
  // 预计算每个扇区的角度，避免在 map 中重新赋值变量
  const slices: { startAngle: number; endAngle: number; sliceAngle: number; color: string }[] = [];
  let currentAngle = 0;
  for (const item of data) {
    const sliceAngle = (item.value / total) * 360;
    slices.push({ startAngle: currentAngle, endAngle: currentAngle + sliceAngle, sliceAngle, color: item.color });
    currentAngle += sliceAngle;
  }

  const paths = slices.map((slice, index) => {
    const startRad = (slice.startAngle - 90) * Math.PI / 180;
    const endRad = (slice.endAngle - 90) * Math.PI / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const largeArcFlag = slice.sliceAngle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    return (
      <Path
        key={index}
        d={pathData}
        fill={slice.color}
        stroke={colors.surface}
        strokeWidth={2}
      />
    );
  });

  return (
    <Svg width={size} height={size}>
      {paths}
    </Svg>
  );
}

/**
 * 柱状图组件 - 近7天趋势
 * X轴标签采用斜向排列，避免日期文字重叠
 */
function BarChart({ data, width = 300, height = 150 }: { data: { label: string; value: number; color: string }[]; width?: number; height?: number }) {
  const { colors } = useTheme();
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(24, (width - 50) / data.length - 6);
  const chartHeight = height - 50; // 预留更多空间给旋转的X轴标签
  
  if (data.length === 0) {
    return (
      <View style={[styles.chartContainer, { width, height }]}>
        <Text style={[styles.noDataText, { color: colors.textTertiary }]}>暂无数据</Text>
      </View>
    );
  }

  // 计算每个柱子之间的间距
  const availableWidth = width - 50; // 留出Y轴空间
  const stepX = availableWidth / data.length;

  // 计算Y轴刻度值（0, 中间值, 最大值）
  const yTicks = [0, Math.ceil(maxValue / 2), maxValue];

  return (
    <Svg width={width} height={height}>
      {/* Y轴 */}
      <Path d={`M 35 10 L 35 ${chartHeight + 10}`} stroke={colors.border} strokeWidth={1} />
      {/* X轴 */}
      <Path d={`M 35 ${chartHeight + 10} L ${width - 5} ${chartHeight + 10}`} stroke={colors.border} strokeWidth={1} />
      
      {/* Y轴标签 */}
      {yTicks.map((tick, i) => {
        const tickY = chartHeight + 10 - (tick / maxValue) * chartHeight;
        return (
          <G key={`ytick-${i}`}>
            {/* 刻度线 */}
            <Path d={`M 32 ${tickY} L 35 ${tickY}`} stroke={colors.border} strokeWidth={1} />
            {/* 数值标签 */}
            <SvgText
              x={28}
              y={tickY + 3}
              textAnchor="end"
              fontSize={8}
              fill={colors.textTertiary}
            >
              {tick}
            </SvgText>
          </G>
        );
      })}
      
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * chartHeight;
        const x = 40 + index * stepX + (stepX - barWidth) / 2;
        const y = chartHeight + 10 - barHeight;
        const labelX = 40 + index * stepX + stepX / 2;
        
        return (
          <G key={index}>
            {/* 柱子 */}
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={item.color}
              rx={3}
            />
            {/* 数值标签 - 显示在柱子顶部 */}
            {item.value > 0 && (
              <SvgText
                x={labelX}
                y={y - 4}
                textAnchor="middle"
                fontSize={9}
                fill={colors.textSecondary}
              >
                {item.value}
              </SvgText>
            )}
            {/* 日期标签 - 旋转-45度斜向排列，避免重叠 */}
            <SvgText
              x={0}
              y={0}
              textAnchor="end"
              fontSize={9}
              fill={colors.textTertiary}
              transform={`translate(${labelX}, ${chartHeight + 18}) rotate(-45)`}
            >
              {item.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

/**
 * 统计面板组件
 */
export default function HistoryStats({ records }: StatsProps) {
  const { colors } = useTheme();
  
  // 按分类统计
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    records.forEach(record => {
      const category = record.category || '其他';
      stats[category] = (stats[category] || 0) + 1;
    });
    
    return Object.entries(stats)
      .map(([label, value], index) => ({
        label,
        value,
        color: getCategoryColor(label, index),
      }))
      .sort((a, b) => b.value - a.value);
  }, [records]);
  
  // 按日期统计（最近7天）
  const dailyStats = useMemo(() => {
    const stats: Record<string, number> = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      stats[dateStr] = 0;
    }
    
    records.forEach(record => {
      const dateStr = new Date(record.timestamp).toISOString().split('T')[0];
      if (stats[dateStr] !== undefined) {
        stats[dateStr]++;
      }
    });
    
    return Object.entries(stats)
      .map(([label, value]) => ({
        label: label.slice(5), // 只显示 MM-DD
        value,
        color: colors.accent,
      }));
  }, [records, colors.accent]);

  const totalRecords = records.length;
  const totalCategories = categoryStats.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface + 'E6' }]}>
      {/* 统计概览 */}
      <View style={styles.overviewRow}>
        <View style={styles.overviewItem}>
          <Text style={[styles.overviewValue, { color: colors.accent }]}>{totalRecords}</Text>
          <Text style={[styles.overviewLabel, { color: colors.textTertiary }]}>总记录</Text>
        </View>
        <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />
        <View style={styles.overviewItem}>
          <Text style={[styles.overviewValue, { color: colors.accent }]}>{totalCategories}</Text>
          <Text style={[styles.overviewLabel, { color: colors.textTertiary }]}>分类数</Text>
        </View>
      </View>
      
      {/* 图表区域 */}
      <View style={styles.chartsRow}>
        {/* 饼图 */}
        <View style={styles.chartSection}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>分类占比</Text>
          <View style={styles.pieContainer}>
            <PieChart data={categoryStats} size={120} />
          </View>
          {/* 图例 */}
          <View style={styles.legend}>
            {categoryStats.slice(0, 4).map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.label} {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* 柱状图 */}
        <View style={styles.chartSection}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>近7天趋势</Text>
          <BarChart data={dailyStats} width={160} height={130} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  overviewItem: {
    alignItems: 'center',
    flex: 1,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  overviewLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  overviewDivider: {
    width: 1,
    height: 30,
  },
  chartsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartSection: {
    alignItems: 'center',
    flex: 1,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  chartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 12,
  },
  pieContainer: {
    marginBottom: 8,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
  },
});
