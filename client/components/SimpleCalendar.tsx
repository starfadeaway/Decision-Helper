/**
 * 简单日历组件 - 支持所有平台（包括Web）
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import dayjs from 'dayjs';

interface SimpleCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
}

export default function SimpleCalendar({ value, onChange }: SimpleCalendarProps) {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(dayjs(value));
  const selectedDate = dayjs(value);

  const daysInMonth = currentMonth.daysInMonth();
  const firstDayOfMonth = currentMonth.startOf('month').day(); // 0 = Sunday
  const today = dayjs();

  const weeks = ['日', '一', '二', '三', '四', '五', '六'];
  const days: (number | null)[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentMonth(currentMonth.add(1, 'month'));
  };

  const handleSelectDay = (day: number) => {
    const newDate = currentMonth.date(day);
    onChange(newDate.toDate());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
          <Text style={[styles.navText, { color: colors.accent }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text }]}>
          {currentMonth.format('YYYY年MM月')}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
          <Text style={[styles.navText, { color: colors.accent }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Week days */}
      <View style={styles.weekDaysRow}>
        {weeks.map((week) => (
          <View key={week} style={styles.weekDayCell}>
            <Text style={[styles.weekDayText, { color: colors.textSecondary }]}>
              {week}
            </Text>
          </View>
        ))}
      </View>

      {/* Days grid */}
      <View style={styles.daysGrid}>
        {days.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const date = currentMonth.date(day);
          const isSelected = selectedDate.isSame(date, 'day');
          const isToday = today.isSame(date, 'day');

          return (
            <TouchableOpacity
              key={`day-${day}`}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: colors.accent, borderRadius: 20 },
                isToday && !isSelected && { borderWidth: 1, borderColor: colors.accent, borderRadius: 20 },
              ]}
              onPress={() => handleSelectDay(day)}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: isSelected ? '#FFFFFF' : colors.text },
                  isToday && !isSelected && { color: colors.accent, fontWeight: '600' },
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBtn: {
    padding: 8,
  },
  navText: {
    fontSize: 24,
    fontWeight: '600',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
  },
});
