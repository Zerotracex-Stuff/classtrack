import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { DayOfWeek, Period } from '../../types';
import { PeriodModal } from './PeriodModal';
import { SubjectModal } from './SubjectModal';
import { Ionicons } from '@expo/vector-icons';
import { formatTime, formatTimeRange } from '../../utils/timeUtils';

interface WeekGridViewProps {
  onCellPress: (weekday: DayOfWeek, period: Period) => void;
}

const DAY_SHORT_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const WeekGridView: React.FC<WeekGridViewProps> = ({ onCellPress }) => {
  const { colors, isDark } = useTheme();
  const { subjects, periods, entries, getSubject, settings } = useApp();

  const [editingPeriod, setEditingPeriod] = React.useState<Period | null>(null);
  const [subjectModalVisible, setSubjectModalVisible] = React.useState(false);

  const workingDays = settings.workingDays;

  const getMinutes = (timeStr: string) => {
    const parts = (timeStr || '00:00').split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  const sortedPeriods = [...periods].sort(
    (a, b) => getMinutes(a.startTime) - getMinutes(b.startTime)
  );

  // Today's weekday index (0 = Mon)
  const todayRaw = new Date().getDay();
  const todayWeekday = ((todayRaw + 6) % 7) as DayOfWeek;

  if (subjects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="book-outline" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Subjects Created Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Add your subjects (e.g. Mathematics, Physics, History) first to build your weekly timetable.
        </Text>
        <TouchableOpacity
          style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
          onPress={() => setSubjectModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={colors.onPrimary} />
          <Text style={[styles.emptyAddBtnText, { color: colors.onPrimary }]}>+ Add First Subject</Text>
        </TouchableOpacity>
        <SubjectModal
          visible={subjectModalVisible}
          onClose={() => setSubjectModalVisible(false)}
          editingSubject={null}
        />
      </View>
    );
  }

  if (sortedPeriods.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="time-outline" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Periods Created Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Set up your class period slots and timings to build your weekly timetable grid.
        </Text>
        <TouchableOpacity
          style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
          onPress={() =>
            setEditingPeriod({
              id: '',
              ord: 1,
              label: 'Period 1',
              startTime: '09:00',
              endTime: '09:50',
            })
          }
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={colors.onPrimary} />
          <Text style={[styles.emptyAddBtnText, { color: colors.onPrimary }]}>+ Add First Period</Text>
        </TouchableOpacity>
        <PeriodModal
          visible={!!editingPeriod}
          editingPeriod={editingPeriod?.id ? editingPeriod : null}
          onClose={() => setEditingPeriod(null)}
        />
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.horizontalScroll}
      contentContainerStyle={styles.horizontalContainer}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.verticalScroll}
        contentContainerStyle={styles.verticalContainer}
      >
        <View style={styles.gridContainer}>
          {/* Header Row: Days */}
          <View style={styles.headerRow}>
            {/* Corner time gutter header */}
            <View style={[styles.timeGutterHeader, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            </View>

            {/* Day columns headers */}
            {workingDays.map(d => {
              const isToday = d === todayWeekday;
              return (
                <View
                  key={d}
                  style={[
                    styles.dayHeaderCell,
                    {
                      backgroundColor: isToday ? colors.primaryContainer : colors.surfaceVariant,
                      borderColor: isToday ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayHeaderText,
                      { color: isToday ? colors.onPrimaryContainer : colors.text, fontWeight: isToday ? '800' : '600' },
                    ]}
                  >
                    {DAY_SHORT_NAMES[d]}
                  </Text>
                  {isToday && (
                    <View style={[styles.todayIndicator, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              );
            })}
          </View>

          {/* Period Rows */}
          {sortedPeriods.map(period => {
            if (period.isBreak) {
              return (
                <View key={period.id} style={styles.periodRow}>
                  {/* Time Gutter for Break */}
                  <TouchableOpacity
                    style={[styles.timeGutterCell, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => setEditingPeriod(period)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.periodTime, { color: colors.textTertiary }]}>
                      {formatTime(period.startTime, settings.timeFormat || '12h')}
                    </Text>
                  </TouchableOpacity>

                  {/* Break Spanning Cell */}
                  <TouchableOpacity
                    style={[
                      styles.breakRowCell,
                      {
                        width: workingDays.length * 110 + (workingDays.length - 1) * 6,
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.12)',
                        borderColor: colors.cancelledBg,
                      },
                    ]}
                    onPress={() => setEditingPeriod(period)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="cafe-outline" size={14} color={colors.cancelled} />
                    <Text style={[styles.breakText, { color: colors.cancelled }]}>
                      {period.label} ({formatTimeRange(period.startTime, period.endTime, settings.timeFormat || '12h')})
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <View key={period.id} style={styles.periodRow}>
                {/* Time Gutter */}
                <TouchableOpacity
                  style={[styles.timeGutterCell, { backgroundColor: colors.surfaceVariant }]}
                  onPress={() => setEditingPeriod(period)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.periodOrd, { color: colors.textSecondary }]}>
                    {period.label}
                  </Text>
                  <Text style={[styles.periodTime, { color: colors.textTertiary }]}>
                    {formatTime(period.startTime, settings.timeFormat || '12h')}
                  </Text>
                  <Text style={[styles.periodTime, { color: colors.textTertiary }]}>
                    {formatTime(period.endTime, settings.timeFormat || '12h')}
                  </Text>
                </TouchableOpacity>

                {/* Day Cells */}
                {workingDays.map(weekday => {
                  const entry = entries.find(
                    e => e.weekday === weekday && e.periodId === period.id
                  );
                  const subject = entry?.subjectId ? getSubject(entry.subjectId) : undefined;
                  const isToday = weekday === todayWeekday;

                  return (
                    <TouchableOpacity
                      key={`${weekday}_${period.id}`}
                      style={[
                        styles.cell,
                        {
                          backgroundColor: subject ? (isDark ? colors.card : '#FFFFFF') : colors.surfaceVariant,
                          borderColor: isToday ? colors.primary : colors.borderSubtle,
                          borderWidth: isToday ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => onCellPress(weekday, period)}
                      activeOpacity={0.7}
                    >
                      {subject ? (
                        <View style={styles.cellContent}>
                          <View
                            style={[
                              styles.cellColorPill,
                              { backgroundColor: subject.color },
                            ]}
                          />
                          <Text
                            style={[styles.cellSubjectName, { color: colors.text }]}
                            numberOfLines={2}
                          >
                            {subject.name}
                          </Text>
                          {(entry?.roomOverride || subject.room) ? (
                            <Text
                              style={[styles.cellMeta, { color: colors.textSecondary }]}
                              numberOfLines={1}
                            >
                              📍 {entry?.roomOverride || subject.room}
                            </Text>
                          ) : null}
                          {(entry?.teacher || entry?.teacherOverride || subject.teacher) ? (
                            <Text
                              style={[styles.cellMeta, { color: colors.textTertiary }]}
                              numberOfLines={1}
                            >
                              👤 {entry?.teacher || entry?.teacherOverride || subject.teacher}
                            </Text>
                          ) : null}
                        </View>
                      ) : entry?.freeText ? (
                        <View style={styles.cellContent}>
                          <Text style={[styles.freeText, { color: colors.text }]} numberOfLines={2}>
                            {entry.freeText}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.emptyCell}>
                          <Ionicons name="add" size={16} color={colors.textTertiary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Period Edit Modal */}
      <PeriodModal
        visible={!!editingPeriod}
        onClose={() => setEditingPeriod(null)}
        editingPeriod={editingPeriod}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  horizontalScroll: {
    flex: 1,
  },
  horizontalContainer: {
    flexGrow: 1,
  },
  verticalScroll: {
    flex: 1,
  },
  verticalContainer: {
    paddingBottom: 60,
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  timeGutterHeader: {
    width: 65,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  dayHeaderCell: {
    width: 110,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    borderWidth: 1,
  },
  dayHeaderText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 16,
    height: 3,
    borderRadius: 1.5,
  },
  periodRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  timeGutterCell: {
    width: 65,
    minHeight: 74,
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  periodOrd: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  periodTime: {
    fontSize: 10,
  },
  cell: {
    width: 110,
    minHeight: 74,
    borderRadius: 12,
    padding: 8,
    marginRight: 6,
    justifyContent: 'center',
  },
  cellContent: {
    flex: 1,
  },
  cellColorPill: {
    width: 16,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  cellSubjectName: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
  cellMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  freeText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyCell: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  breakRowCell: {
    minHeight: 34,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  breakText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
