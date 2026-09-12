import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

export const AttendanceAnalyticsChart: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { attendance, subjects, entries } = useApp();
  const [activeTab, setActiveTab] = useState<'weekday' | 'trend'>('weekday');

  const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Calculate Weekday Attendance Analytics (Mon = 0, ..., Sun = 6)
  const weekdayStats = useMemo(() => {
    return WEEK_DAYS.map((dayName, idx) => {
      // Find all records logged on this day of week
      const dayLogs = attendance.filter(a => {
        if (a.status === 'not_held') return false;
        // Parse date YYYY-MM-DD
        const dateObj = new Date(a.date);
        const dayOfWeek = (dateObj.getDay() + 6) % 7; // Convert Sun=0 to Mon=0
        return dayOfWeek === idx;
      });

      const attended = dayLogs.filter(a => a.status === 'present').length;
      const total = dayLogs.length;
      const pct = total > 0 ? Math.round((attended / total) * 100) : 100;

      return { dayName, attended, total, pct };
    });
  }, [attendance]);

  // Find Most Bunked & Best Attended Days
  const { bestDay, worstDay, streakDays } = useMemo(() => {
    let best = { dayName: 'N/A', pct: 0 };
    let worst = { dayName: 'N/A', pct: 100 };
    let validDaysCount = 0;

    weekdayStats.forEach(stat => {
      if (stat.total > 0) {
        validDaysCount++;
        if (stat.pct > best.pct) best = stat;
        if (stat.pct < worst.pct) worst = stat;
      }
    });

    // Calculate current streak of 100% attendance days
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const targetDate = subDays(today, i);
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      const dayLogs = attendance.filter(a => a.date === dateStr && a.status !== 'not_held');
      if (dayLogs.length > 0) {
        const presentCount = dayLogs.filter(a => a.status === 'present').length;
        if (presentCount === dayLogs.length) {
          streak++;
        } else {
          break; // streak broken
        }
      }
    }

    return {
      bestDay: validDaysCount > 0 ? best : null,
      worstDay: validDaysCount > 0 ? worst : null,
      streakDays: streak,
    };
  }, [weekdayStats, attendance]);

  // Weekly Trend Data (Last 4 Weeks)
  const weeklyTrend = useMemo(() => {
    const today = new Date();
    const weeks = [];

    for (let i = 3; i >= 0; i--) {
      const refDate = subDays(today, i * 7);
      const wStart = startOfWeek(refDate, { weekStartsOn: 1 });
      const wEnd = endOfWeek(refDate, { weekStartsOn: 1 });

      const wLogs = attendance.filter(a => {
        if (a.status === 'not_held') return false;
        const d = new Date(a.date);
        return d >= wStart && d <= wEnd;
      });

      const attended = wLogs.filter(a => a.status === 'present').length;
      const total = wLogs.length;
      const pct = total > 0 ? Math.round((attended / total) * 100) : 100;
      const label = i === 0 ? 'This Wk' : `Wk -${i}`;

      weeks.push({ label, pct, total, attended });
    }

    return weeks;
  }, [attendance]);

  return (
    <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      {/* Header & View Switcher */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="bar-chart" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Attendance Analytics</Text>
        </View>

        <View style={[styles.toggleBox, { backgroundColor: colors.surfaceVariant }]}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              activeTab === 'weekday' && { backgroundColor: colors.primary, borderRadius: 8 },
            ]}
            onPress={() => setActiveTab('weekday')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, { color: activeTab === 'weekday' ? colors.onPrimary : colors.textSecondary }]}>
              Weekday
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              activeTab === 'trend' && { backgroundColor: colors.primary, borderRadius: 8 },
            ]}
            onPress={() => setActiveTab('trend')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, { color: activeTab === 'trend' ? colors.onPrimary : colors.textSecondary }]}>
              Trend
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Analytics Highlights Row */}
      <View style={styles.highlightsRow}>
        <View style={[styles.highlightChip, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="flame" size={16} color="#F59E0B" />
          <Text style={[styles.highlightText, { color: colors.text }]}>
            <Text style={{ fontWeight: '800' }}>{streakDays}</Text> Day Streak
          </Text>
        </View>

        {worstDay && worstDay.pct < 100 ? (
          <View style={[styles.highlightChip, { backgroundColor: colors.absentBg }]}>
            <Ionicons name="warning-outline" size={16} color={colors.absent} />
            <Text style={[styles.highlightText, { color: colors.absent }]}>
              Most Bunked: <Text style={{ fontWeight: '800' }}>{worstDay.dayName}</Text> ({worstDay.pct}%)
            </Text>
          </View>
        ) : bestDay ? (
          <View style={[styles.highlightChip, { backgroundColor: colors.presentBg }]}>
            <Ionicons name="sparkles" size={16} color={colors.present} />
            <Text style={[styles.highlightText, { color: colors.present }]}>
              Best Day: <Text style={{ fontWeight: '800' }}>{bestDay.dayName}</Text> ({bestDay.pct}%)
            </Text>
          </View>
        ) : null}
      </View>

      {/* Chart Section */}
      {activeTab === 'weekday' ? (
        <View style={styles.chartContainer}>
          <Text style={[styles.chartSub, { color: colors.textSecondary }]}>
            Attendance percentage by day of the week
          </Text>

          <View style={styles.barsRow}>
            {weekdayStats.map((item, idx) => {
              const isGood = item.pct >= 75;
              const hasData = item.total > 0;
              const barHeight = Math.max(12, (item.pct / 100) * 110);

              return (
                <View key={item.dayName} style={styles.barCol}>
                  <Text style={[styles.barPctText, { color: hasData ? (isGood ? colors.present : colors.absent) : colors.textTertiary }]}>
                    {hasData ? `${item.pct}%` : '-'}
                  </Text>

                  <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: barHeight,
                          backgroundColor: hasData
                            ? isGood
                              ? colors.present
                              : colors.absent
                            : colors.textTertiary + '40',
                        },
                      ]}
                    />
                  </View>

                  <Text style={[styles.barLabel, { color: colors.text }]}>{item.dayName}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.chartContainer}>
          <Text style={[styles.chartSub, { color: colors.textSecondary }]}>
            Weekly attendance trend over the past 4 weeks
          </Text>

          <View style={styles.barsRow}>
            {weeklyTrend.map((item) => {
              const isGood = item.pct >= 75;
              const barHeight = Math.max(12, (item.pct / 100) * 110);

              return (
                <View key={item.label} style={styles.barCol}>
                  <Text style={[styles.barPctText, { color: isGood ? colors.present : colors.absent }]}>
                    {item.pct}%
                  </Text>

                  <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: barHeight,
                          backgroundColor: isGood ? colors.primary : colors.absent,
                        },
                      ]}
                    />
                  </View>

                  <Text style={[styles.barLabel, { color: colors.text }]}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  toggleBox: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  highlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  highlightText: {
    fontSize: 12,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartSub: {
    fontSize: 12,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    width: '100%',
    height: 150,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barPctText: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
  },
  barTrack: {
    width: 18,
    height: 110,
    borderRadius: 9,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 9,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
});
