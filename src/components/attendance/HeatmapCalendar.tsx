import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceStatus, DayOfWeek } from '../../types';

export const HeatmapCalendar: React.FC = () => {
  const { colors, isDark } = useTheme();
  const {
    attendance,
    getSubject,
    markAttendance,
    removeAttendance,
    entries,
    periods,
    holidays,
    subjects,
    settings,
  } = useApp();

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonthDate);
  const monthEnd = endOfMonth(currentMonthDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Leading empty slots for day-of-week alignment (Sunday = 0 ... Saturday = 6)
  const startDayOfWeek = getDay(monthStart);
  const blanks = Array.from({ length: startDayOfWeek });

  const handlePrevMonth = () => setCurrentMonthDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonthDate(prev => addMonths(prev, 1));

  // Determine attendance status for calendar dot
  const getDayStatus = (dateStr: string) => {
    const isHoliday = holidays.some(h => dateStr >= h.startDate && dateStr <= h.endDate);
    if (isHoliday) return 'holiday';

    const dayRecords = attendance.filter(a => a.date === dateStr);
    if (dayRecords.length === 0) return 'none';

    const hasAbsent = dayRecords.some(r => r.status === 'absent');
    const hasPresent = dayRecords.some(r => r.status === 'present');

    if (hasAbsent && hasPresent) return 'partial';
    if (hasAbsent) return 'absent';
    if (hasPresent) return 'present';
    return 'none';
  };

  const getMinutes = (t: string) => {
    const parts = (t || '00:00').split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  // Compute rich details for selected date
  const selectedDateDetails = React.useMemo(() => {
    if (!selectedDateStr) return null;

    const parsedDate = parseISO(selectedDateStr);
    const dayOfWeekRaw = getDay(parsedDate);
    const weekday = ((dayOfWeekRaw + 6) % 7) as DayOfWeek;

    const activeHoliday = holidays.find(
      h => selectedDateStr >= h.startDate && selectedDateStr <= h.endDate
    );

    const isWorkingDay = settings.workingDays.includes(weekday);

    // Get sorted periods (non-break)
    const sortedPeriods = [...periods]
      .filter(p => !p.isBreak)
      .sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime));

    // Map scheduled classes for this weekday
    const scheduledClasses = sortedPeriods
      .map(p => {
        const entry = entries.find(e => e.weekday === weekday && e.periodId === p.id);
        const sub = entry?.subjectId ? getSubject(entry.subjectId) : undefined;
        const rec = sub
          ? attendance.find(a => a.date === selectedDateStr && a.subjectId === sub.id)
          : undefined;

        return {
          period: p,
          entry,
          subject: sub,
          record: rec,
        };
      })
      .filter(item => !!item.subject);

    // Any other ad-hoc attendance records logged on this date
    const otherRecords = attendance
      .filter(
        a =>
          a.date === selectedDateStr &&
          !scheduledClasses.some(sc => sc.subject?.id === a.subjectId)
      )
      .map(rec => ({
        subject: getSubject(rec.subjectId),
        record: rec,
      }))
      .filter(item => !!item.subject);

    const allDayRecords = attendance.filter(a => a.date === selectedDateStr);
    const presentCount = allDayRecords.filter(r => r.status === 'present').length;
    const absentCount = allDayRecords.filter(r => r.status === 'absent').length;
    const cancelledCount = allDayRecords.filter(r => r.status === 'not_held').length;
    const totalCount = presentCount + absentCount;
    const dayPercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : null;

    return {
      parsedDate,
      weekday,
      isWorkingDay,
      activeHoliday,
      scheduledClasses,
      otherRecords,
      presentCount,
      absentCount,
      cancelledCount,
      dayPercentage,
    };
  }, [selectedDateStr, holidays, settings.workingDays, periods, entries, attendance, getSubject]);

  return (
    <Card style={[styles.container, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      {/* Month Navigation Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {format(currentMonthDate, 'MMMM yyyy')}
          </Text>
          <Text style={[styles.monthSubtitle, { color: colors.textSecondary }]}>
            Tap any day to view detailed schedule & attendance
          </Text>
        </View>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.surfaceVariant }]}
            onPress={handlePrevMonth}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.surfaceVariant, marginLeft: 8 }]}
            onPress={handleNextMonth}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday labels */}
      <View style={styles.weekdayRow}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
          <Text key={i} style={[styles.weekdayLabel, { color: colors.textTertiary }]}>
            {d}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {blanks.map((_, i) => (
          <View key={`blank_${i}`} style={styles.daySlot} />
        ))}

        {daysInMonth.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const status = getDayStatus(dateStr);
          const isCurrent = isToday(day);

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.daySlot,
                isCurrent && {
                  borderWidth: 1.5,
                  borderColor: colors.primary,
                  borderRadius: 10,
                },
              ]}
              onPress={() => setSelectedDateStr(dateStr)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNumber,
                  {
                    color: isCurrent ? colors.primary : colors.text,
                    fontWeight: isCurrent ? '800' : '500',
                  },
                ]}
              >
                {format(day, 'd')}
              </Text>

              {/* Status Dot */}
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      status === 'present'
                        ? colors.present
                        : status === 'partial'
                        ? colors.cancelled
                        : status === 'absent'
                        ? colors.absent
                        : status === 'holiday'
                        ? colors.primary
                        : 'transparent',
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={[styles.legendRow, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.legendItem}>
          <View style={[styles.statusDot, { backgroundColor: colors.present }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.statusDot, { backgroundColor: colors.cancelled }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Partial</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.statusDot, { backgroundColor: colors.absent }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Absent</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Holiday</Text>
        </View>
      </View>

      {/* Modal: Detailed Day Schedule & Attendance Inspector */}
      <Modal
        visible={!!selectedDateStr}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDateStr(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            {/* Modal Top Bar */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedDateDetails
                    ? format(selectedDateDetails.parsedDate, 'EEEE, MMM d, yyyy')
                    : ''}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Day Attendance & Class Breakdown
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedDateStr(null)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Holiday Banner if applicable */}
              {selectedDateDetails?.activeHoliday && (
                <View style={[styles.holidayAlert, { backgroundColor: colors.primaryContainer }]}>
                  <Ionicons name="sunny" size={20} color={colors.primary} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={[styles.holidayTitle, { color: colors.onPrimaryContainer }]}>
                      {selectedDateDetails.activeHoliday.name}
                    </Text>
                    <Text style={[styles.holidaySub, { color: colors.onPrimaryContainer }]}>
                      Official holiday period
                    </Text>
                  </View>
                </View>
              )}

              {/* Day Attendance Tally Bar */}
              <View style={[styles.daySummaryBox, { backgroundColor: colors.surfaceVariant }]}>
                <View style={styles.summaryMetric}>
                  <Text style={[styles.summaryNum, { color: colors.text }]}>
                    {selectedDateDetails?.dayPercentage !== null
                      ? `${selectedDateDetails?.dayPercentage}%`
                      : '—'}
                  </Text>
                  <Text style={[styles.summaryLbl, { color: colors.textSecondary }]}>
                    Day Rate
                  </Text>
                </View>

                <View style={styles.summaryMetric}>
                  <Text style={[styles.summaryNum, { color: colors.present }]}>
                    {selectedDateDetails?.presentCount || 0}
                  </Text>
                  <Text style={[styles.summaryLbl, { color: colors.present }]}>Present</Text>
                </View>

                <View style={styles.summaryMetric}>
                  <Text style={[styles.summaryNum, { color: colors.absent }]}>
                    {selectedDateDetails?.absentCount || 0}
                  </Text>
                  <Text style={[styles.summaryLbl, { color: colors.absent }]}>Absent</Text>
                </View>

                <View style={styles.summaryMetric}>
                  <Text style={[styles.summaryNum, { color: colors.cancelled }]}>
                    {selectedDateDetails?.cancelledCount || 0}
                  </Text>
                  <Text style={[styles.summaryLbl, { color: colors.cancelled }]}>Cancelled</Text>
                </View>
              </View>

              {/* Scheduled Classes for this date */}
              <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
                SCHEDULED CLASSES
              </Text>

              {selectedDateDetails?.scheduledClasses.length === 0 ? (
                <View style={styles.emptyDayNotice}>
                  <Ionicons name="cafe-outline" size={32} color={colors.textTertiary} />
                  <Text style={[styles.emptyDayTitle, { color: colors.text }]}>
                    No Scheduled Classes
                  </Text>
                  <Text style={[styles.emptyDaySubtitle, { color: colors.textSecondary }]}>
                    {selectedDateDetails?.isWorkingDay
                      ? 'No periods assigned for this day in your timetable.'
                      : 'Weekend or non-working day.'}
                  </Text>
                </View>
              ) : (
                selectedDateDetails?.scheduledClasses.map(item => {
                  const sub = item.subject!;
                  const p = item.period;
                  const rec = item.record;
                  const currentStatus = rec?.status;

                  return (
                    <View
                      key={p.id}
                      style={[
                        styles.classCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.borderSubtle,
                          borderLeftWidth: 4,
                          borderLeftColor: sub.color,
                        },
                      ]}
                    >
                      <View style={styles.classCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.classPeriodLabel, { color: colors.textSecondary }]}>
                            {p.label} • {p.startTime} - {p.endTime}
                          </Text>
                          <Text style={[styles.classSubjectName, { color: colors.text }]}>
                            {sub.name}
                          </Text>
                          {((item.entry?.roomOverride || sub.room) || (item.entry?.teacher || item.entry?.teacherOverride || sub.teacher)) ? (
                            <Text style={[styles.classMeta, { color: colors.textSecondary }]}>
                              {(item.entry?.roomOverride || sub.room) ? `📍 ${item.entry?.roomOverride || sub.room}` : ''}
                              {(item.entry?.roomOverride || sub.room) && (item.entry?.teacher || item.entry?.teacherOverride || sub.teacher) ? ' • ' : ''}
                              {(item.entry?.teacher || item.entry?.teacherOverride || sub.teacher) ? `👤 ${item.entry?.teacher || item.entry?.teacherOverride || sub.teacher}` : ''}
                            </Text>
                          ) : null}
                        </View>

                        {/* Status Tag */}
                        {currentStatus ? (
                          <Badge
                            label={currentStatus.toUpperCase()}
                            variant={
                              currentStatus === 'present'
                                ? 'success'
                                : currentStatus === 'absent'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                          />
                        ) : (
                          <Badge label="NOT MARKED" variant="neutral" size="sm" />
                        )}
                      </View>

                      {/* Interactive Attendance Buttons */}
                      <View style={styles.actionButtonGroup}>
                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            currentStatus === 'present'
                              ? { backgroundColor: colors.present }
                              : { backgroundColor: colors.presentBg },
                          ]}
                          onPress={() =>
                            selectedDateStr &&
                            markAttendance(sub.id, selectedDateStr, 'present')
                          }
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={currentStatus === 'present' ? '#FFF' : colors.present}
                          />
                          <Text
                            style={[
                              styles.statusButtonText,
                              { color: currentStatus === 'present' ? '#FFF' : colors.present },
                            ]}
                          >
                            Present
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            currentStatus === 'absent'
                              ? { backgroundColor: colors.absent }
                              : { backgroundColor: colors.absentBg },
                          ]}
                          onPress={() =>
                            selectedDateStr &&
                            markAttendance(sub.id, selectedDateStr, 'absent')
                          }
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="close"
                            size={16}
                            color={currentStatus === 'absent' ? '#FFF' : colors.absent}
                          />
                          <Text
                            style={[
                              styles.statusButtonText,
                              { color: currentStatus === 'absent' ? '#FFF' : colors.absent },
                            ]}
                          >
                            Absent
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            currentStatus === 'not_held'
                              ? { backgroundColor: colors.cancelled }
                              : { backgroundColor: colors.cancelledBg },
                          ]}
                          onPress={() =>
                            selectedDateStr &&
                            markAttendance(sub.id, selectedDateStr, 'not_held')
                          }
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="remove-outline"
                            size={16}
                            color={currentStatus === 'not_held' ? '#FFF' : colors.cancelled}
                          />
                          <Text
                            style={[
                              styles.statusButtonText,
                              { color: currentStatus === 'not_held' ? '#FFF' : colors.cancelled },
                            ]}
                          >
                            Cancel
                          </Text>
                        </TouchableOpacity>

                        {currentStatus && (
                          <TouchableOpacity
                            style={[styles.clearMarkBtn, { backgroundColor: colors.surfaceVariant }]}
                            onPress={() =>
                              selectedDateStr && removeAttendance(sub.id, selectedDateStr)
                            }
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}

              {/* Extra logged classes on this date */}
              {selectedDateDetails && selectedDateDetails.otherRecords.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
                    EXTRA / AD-HOC CLASSES
                  </Text>
                  {selectedDateDetails.otherRecords.map(item => (
                    <View
                      key={item.record.id}
                      style={[
                        styles.classCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.borderSubtle,
                          borderLeftWidth: 4,
                          borderLeftColor: item.subject!.color,
                        },
                      ]}
                    >
                      <View style={styles.classCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.classSubjectName, { color: colors.text }]}>
                            {item.subject!.name}
                          </Text>
                          <Text style={[styles.classMeta, { color: colors.textSecondary }]}>
                            Extra class entry
                          </Text>
                        </View>
                        <Badge
                          label={item.record.status.toUpperCase()}
                          variant={
                            item.record.status === 'present'
                              ? 'success'
                              : item.record.status === 'absent'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  monthSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  navRow: {
    flexDirection: 'row',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  daySlot: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 13,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginBottom: 10,
  },
  holidayAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  holidayTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  holidaySub: {
    fontSize: 12,
    marginTop: 1,
  },
  daySummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryMetric: {
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLbl: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  emptyDayNotice: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDayTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyDaySubtitle: {
    fontSize: 13,
    marginTop: 3,
    textAlign: 'center',
  },
  classCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  classCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  classPeriodLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  classSubjectName: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  classMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  clearMarkBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
