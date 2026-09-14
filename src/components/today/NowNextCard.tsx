import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Ionicons } from '@expo/vector-icons';
import { Period, Subject, TimetableEntry } from '../../types';
import { formatTime, formatTimeRange } from '../../utils/timeUtils';
import { format } from 'date-fns';

export const NowNextCard: React.FC = () => {
  const { colors } = useTheme();
  const { subjects, periods, entries, getSubject, settings, holidays } = useApp();
  const timeFormat = settings.timeFormat || '12h';
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = format(currentTime, 'yyyy-MM-dd');
  const activeHoliday = holidays.find(
    h => todayStr >= h.startDate && todayStr <= h.endDate
  );

  // Today's weekday: 0 = Mon ... 6 = Sun
  const rawDay = currentTime.getDay();
  const todayWeekday = ((rawDay + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  // Check if today is a working day
  const isWorkingDay = settings.workingDays.includes(todayWeekday);

  // Time helper in minutes
  const getMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Sort periods chronologically
  const todayPeriods = [...periods].sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime));

  // Find active and next period
  let activePeriod: Period | undefined;
  let activeSubject: Subject | undefined;
  let activeEntry: TimetableEntry | undefined;
  let nextPeriod: Period | undefined;
  let nextSubject: Subject | undefined;
  let nextEntry: TimetableEntry | undefined;
  let progress = 0;
  let remainingMins = 0;

  if (activeHoliday) {
    return (
      <Card style={[styles.weekendCard, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="sunny" size={24} color={colors.onPrimary} />
          </View>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={[styles.statusTitle, { color: colors.onPrimaryContainer }]}>
              🌴 {activeHoliday.name}
            </Text>
            <Text style={[styles.statusSubtitle, { color: colors.onPrimaryContainer, opacity: 0.9 }]}>
              Holiday break active ({activeHoliday.startDate} to {activeHoliday.endDate}) • No classes scheduled for today!
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  if (isWorkingDay) {
    for (const p of todayPeriods) {
      const startMins = getMinutes(p.startTime);
      const endMins = getMinutes(p.endTime);

      if (currentMinutes >= startMins && currentMinutes <= endMins) {
        activePeriod = p;
        activeEntry = entries.find(e => e.weekday === todayWeekday && e.periodId === p.id);
        activeSubject = activeEntry?.subjectId ? getSubject(activeEntry.subjectId) : undefined;
        const totalDuration = endMins - startMins;
        const elapsed = currentMinutes - startMins;
        progress = totalDuration > 0 ? Math.min(Math.max(elapsed / totalDuration, 0), 1) : 0;
        remainingMins = endMins - currentMinutes;
      } else if (currentMinutes < startMins && !nextPeriod) {
        nextPeriod = p;
        nextEntry = entries.find(e => e.weekday === todayWeekday && e.periodId === p.id);
        nextSubject = nextEntry?.subjectId ? getSubject(nextEntry.subjectId) : undefined;
      }
    }
  }

  const activeTeacher = activeEntry?.teacher || activeEntry?.teacherOverride || activeSubject?.teacher;
  const activeRoom = activeEntry?.roomOverride || activeSubject?.room;

  const nextTeacher = nextEntry?.teacher || nextEntry?.teacherOverride || nextSubject?.teacher;
  const nextRoom = nextEntry?.roomOverride || nextSubject?.room;

  if (!isWorkingDay) {
    return (
      <Card style={[styles.weekendCard, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="cafe" size={24} color={colors.primary} />
          </View>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>Weekend Recharge</Text>
            <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
              No scheduled classes for today. Relax and enjoy your time off!
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  if (subjects.length === 0) {
    return (
      <Card style={[styles.weekendCard, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="book-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>No Subjects Created Yet</Text>
            <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
              Go to the Timetable tab to add your subjects and build your class schedule.
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  if (todayPeriods.length === 0) {
    return (
      <Card style={[styles.weekendCard, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="time-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>No Period Slots Yet</Text>
            <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
              Go to the Schedule tab to add your class periods and timings.
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card style={[styles.container, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      {/* Active Class Section */}
      {activePeriod ? (
        <View>
          <View style={styles.topRow}>
            <Badge
              label="HAPPENING NOW"
              variant="primary"
              size="sm"
              icon={<Ionicons name="radio" size={12} color={colors.onPrimaryContainer} />}
            />
            <Text style={[styles.timeRemaining, { color: colors.primary }]}>
              {remainingMins} min left
            </Text>
          </View>

          <View style={styles.subjectRow}>
            <View
              style={[
                styles.colorBar,
                { backgroundColor: activeSubject?.color || colors.primary },
              ]}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.subjectName, { color: colors.text }]}>
                {activePeriod.isBreak
                  ? activePeriod.label
                  : activeSubject?.name || 'Free Period / Unassigned'}
              </Text>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {formatTimeRange(activePeriod.startTime, activePeriod.endTime, timeFormat)}
                {activeRoom ? ` • ${activeRoom}` : ''}
                {activeTeacher ? ` • 👤 ${activeTeacher}` : ''}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: activeSubject?.color || colors.primary,
                },
              ]}
            />
          </View>
        </View>
      ) : (
        <View style={styles.noActivePeriod}>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.noActiveText, { color: colors.text }]}>
              {nextPeriod ? 'No class in session right now' : 'All classes completed for today! 🎉'}
            </Text>
          </View>
        </View>
      )}

      {/* Next Class Preview */}
      {nextPeriod && (
        <View style={[styles.nextSection, { borderTopColor: colors.borderSubtle }]}>
          <Text style={[styles.nextLabel, { color: colors.textTertiary }]}>UP NEXT</Text>
          <View style={styles.nextDetails}>
            <Text style={[styles.nextName, { color: colors.text }]}>
              {nextPeriod.isBreak
                ? nextPeriod.label
                : nextSubject?.name || 'Free Period'}
            </Text>
            <Text style={[styles.nextTime, { color: colors.textSecondary }]}>
              at {formatTime(nextPeriod.startTime, timeFormat)}
              {nextRoom ? ` • ${nextRoom}` : ''}
              {nextTeacher ? ` • 👤 ${nextTeacher}` : ''}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  weekendCard: {
    padding: 18,
    borderRadius: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeRemaining: {
    fontSize: 13,
    fontWeight: '700',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  colorBar: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  subjectName: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metaText: {
    fontSize: 13,
    marginTop: 3,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  noActivePeriod: {
    paddingVertical: 6,
  },
  noActiveText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  nextSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nextDetails: {
    alignItems: 'flex-end',
  },
  nextName: {
    fontSize: 14,
    fontWeight: '700',
  },
  nextTime: {
    fontSize: 12,
    marginTop: 1,
  },
});
