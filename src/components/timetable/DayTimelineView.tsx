import React, { useState } from 'react';
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
import { Card } from '../common/Card';
import { formatTime, formatTimeRange } from '../../utils/timeUtils';

interface DayTimelineViewProps {
  onCellPress: (weekday: DayOfWeek, period: Period) => void;
}

const DAY_FULL_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const DayTimelineView: React.FC<DayTimelineViewProps> = ({ onCellPress }) => {
  const { colors, isDark } = useTheme();
  const { subjects, periods, entries, getSubject, settings } = useApp();

  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);

  const workingDays = settings.workingDays;
  const todayRaw = new Date().getDay();
  const todayWeekday = ((todayRaw + 6) % 7) as DayOfWeek;

  // Selected day tab in timeline
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    workingDays.includes(todayWeekday) ? todayWeekday : workingDays[0] || 0
  );

  const getMinutes = (timeStr: string) => {
    const parts = (timeStr || '00:00').split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  const sortedPeriods = [...periods].sort(
    (a, b) => getMinutes(a.startTime) - getMinutes(b.startTime)
  );

  if (subjects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="book-outline" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Subjects Created Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Add your subjects first so you can assign them to daily class slots.
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
          Set up your class period slots and timings to build your daily timeline schedule.
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
    <View style={styles.container}>
      {/* Horizontal Day Switcher */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daySelectorScroll}
        contentContainerStyle={styles.daySelectorContainer}
      >
        {workingDays.map(d => {
          const isSelected = selectedDay === d;
          const isToday = d === todayWeekday;

          return (
            <TouchableOpacity
              key={d}
              style={[
                styles.dayTab,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                  borderColor: isToday ? colors.primary : colors.borderSubtle,
                },
              ]}
              onPress={() => setSelectedDay(d)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayTabText,
                  { color: isSelected ? colors.onPrimary : colors.text, fontWeight: isSelected ? '800' : '600' },
                ]}
              >
                {DAY_FULL_NAMES[d].substring(0, 3)}
              </Text>
              {isToday && (
                <View
                  style={[
                    styles.todayDot,
                    { backgroundColor: isSelected ? colors.onPrimary : colors.primary },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Timeline List */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.timelineScroll}>
        <View style={styles.timelineContent}>
          {sortedPeriods.map((period, index) => {
            const entry = entries.find(
              e => e.weekday === selectedDay && e.periodId === period.id
            );
            const subject = entry?.subjectId ? getSubject(entry.subjectId) : undefined;
            const isLast = index === sortedPeriods.length - 1;

            if (period.isBreak) {
              return (
                <View key={period.id} style={styles.timelineRow}>
                  {/* Time column */}
                  <TouchableOpacity
                    style={styles.timeColumn}
                    onPress={() => setEditingPeriod(period)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeText, { color: colors.textTertiary }]}>
                      {period.startTime}
                    </Text>
                  </TouchableOpacity>

                  {/* Node & vertical line */}
                  <View style={styles.nodeColumn}>
                    <View
                      style={[
                        styles.nodeCircle,
                        { backgroundColor: colors.cancelledBg, borderColor: colors.cancelled },
                      ]}
                    >
                      <Ionicons name="cafe" size={12} color={colors.cancelled} />
                    </View>
                    {!isLast && <View style={[styles.line, { backgroundColor: colors.borderSubtle }]} />}
                  </View>

                  {/* Card */}
                  <TouchableOpacity
                    style={[styles.breakCard, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => setEditingPeriod(period)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.breakCardTitle, { color: colors.cancelled }]}>
                      ☕ {period.label} ({formatTimeRange(period.startTime, period.endTime, settings.timeFormat || '12h')})
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <View key={period.id} style={styles.timelineRow}>
                {/* Time column */}
                <TouchableOpacity
                  style={styles.timeColumn}
                  onPress={() => setEditingPeriod(period)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timeText, { color: colors.text }]}>
                    {formatTime(period.startTime, settings.timeFormat || '12h')}
                  </Text>
                  <Text style={[styles.timeSubText, { color: colors.textTertiary }]}>
                    {formatTime(period.endTime, settings.timeFormat || '12h')}
                  </Text>
                </TouchableOpacity>

                {/* Node & vertical line */}
                <View style={styles.nodeColumn}>
                  <View
                    style={[
                      styles.nodeCircle,
                      {
                        backgroundColor: subject ? subject.color : colors.surfaceVariant,
                        borderColor: subject ? subject.color : colors.border,
                      },
                    ]}
                  />
                  {!isLast && <View style={[styles.line, { backgroundColor: colors.borderSubtle }]} />}
                </View>

                {/* Subject Slot Card */}
                <TouchableOpacity
                  style={styles.cardTouchable}
                  onPress={() => onCellPress(selectedDay, period)}
                  activeOpacity={0.7}
                >
                  <Card
                    style={[
                      styles.slotCard,
                      {
                        backgroundColor: colors.card,
                        borderLeftWidth: 4,
                        borderLeftColor: subject ? subject.color : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.slotHeader}>
                      <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>
                        {period.label}
                      </Text>
                      {entry?.roomOverride || subject?.room ? (
                        <View style={[styles.roomPill, { backgroundColor: colors.surfaceVariant }]}>
                          <Text style={[styles.roomText, { color: colors.textSecondary }]}>
                            📍 {entry?.roomOverride || subject?.room}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={[styles.subjectTitle, { color: colors.text }]}>
                      {subject ? subject.name : entry?.freeText || 'Tap to assign subject'}
                    </Text>

                    {(entry?.teacher || entry?.teacherOverride || subject?.teacher) ? (
                      <Text style={[styles.teacherName, { color: colors.textSecondary }]}>
                        👤 {entry?.teacher || entry?.teacherOverride || subject?.teacher}
                      </Text>
                    ) : null}

                    {entry?.notes ? (
                      <View style={[styles.notesContainer, { backgroundColor: colors.surfaceVariant }]}>
                        <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                          📝 {entry.notes}
                        </Text>
                      </View>
                    ) : null}
                  </Card>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {editingPeriod && (
        <PeriodModal
          visible={!!editingPeriod}
          onClose={() => setEditingPeriod(null)}
          editingPeriod={editingPeriod}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  daySelectorScroll: {
    flexGrow: 0,
    height: 40,
    marginBottom: 6,
  },
  daySelectorContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  dayTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    height: 34,
  },
  dayTabText: {
    fontSize: 12,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginLeft: 4,
  },
  timelineScroll: {
    flex: 1,
  },
  timelineContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 42,
  },
  timeColumn: {
    width: 48,
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingTop: 0,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeSubText: {
    fontSize: 10,
    marginTop: 0,
  },
  nodeColumn: {
    width: 20,
    alignItems: 'center',
  },
  nodeCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    top: 10,
    bottom: 0,
    width: 2,
  },
  cardTouchable: {
    flex: 1,
    marginLeft: 8,
    marginBottom: 4,
  },
  slotCard: {
    marginVertical: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  periodLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  roomPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roomText: {
    fontSize: 9,
    fontWeight: '600',
  },
  subjectTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 16,
  },
  teacherName: {
    fontSize: 10,
    marginTop: 1,
  },
  notesContainer: {
    marginTop: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notesText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  breakCard: {
    flex: 1,
    marginLeft: 8,
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 28,
  },
  breakCardTitle: {
    fontSize: 10,
    fontWeight: '700',
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
