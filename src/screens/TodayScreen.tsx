import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { NowNextCard } from '../components/today/NowNextCard';
import { SwipeDeck } from '../components/today/SwipeDeck';
import { ExamCard } from '../components/exams/ExamCard';
import { Card } from '../components/common/Card';
import { ShareScheduleModal } from '../components/timetable/ShareScheduleModal';
import { HolidayModal } from '../components/timetable/HolidayModal';
import { WidgetCustomizerModal, DEFAULT_WIDGET_ORDER } from '../components/today/WidgetCustomizerModal';
import { LauncherWidgetModal } from '../components/today/LauncherWidgetModal';
import { AttendanceAnalyticsChart } from '../components/attendance/AttendanceAnalyticsChart';
import { Holiday, Exam, DayOfWeek } from '../types';
import { format, parseISO, isFuture, isToday } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

export const TodayScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const {
    settings,
    holidays,
    exams,
    subjects,
    periods,
    entries,
    attendance,
    setActiveTab,
  } = useApp();

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [holidayModalVisible, setHolidayModalVisible] = useState(false);
  const [widgetModalVisible, setWidgetModalVisible] = useState(false);
  const [launcherModalVisible, setLauncherModalVisible] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const activeHoliday = holidays.find(
    (h: Holiday) => todayStr >= h.startDate && todayStr <= h.endDate
  );

  // Find nearest upcoming exam
  const nearestExam = useMemo(() => {
    return [...exams]
      .filter((e: Exam) => {
        const d = parseISO(e.date);
        return isFuture(d) || isToday(d);
      })
      .sort((a: Exam, b: Exam) => a.date.localeCompare(b.date))[0];
  }, [exams]);

  // Overall Attendance Math
  const { overallPct, totalHeld, totalAttended, totalAbsent, safeBunks } = useMemo(() => {
    let held = 0;
    let attended = 0;
    let absent = 0;

    subjects.forEach(s => {
      const logs = attendance.filter(a => a.subjectId === s.id && a.status !== 'not_held');
      const presentCount = logs.filter(a => a.status === 'present').length;
      held += logs.length;
      attended += presentCount;
      absent += logs.filter(a => a.status === 'absent').length;
    });

    const pct = held > 0 ? Math.round((attended / held) * 100) : 100;
    const target = settings.targetAttendance || 75;

    // Safe bunks estimate across all subjects
    let bunks = 0;
    if (held > 0) {
      const maxBunks = Math.floor((attended - (target / 100) * held) / (target / 100));
      bunks = Math.max(0, maxBunks);
    }

    return { overallPct: pct, totalHeld: held, totalAttended: attended, totalAbsent: absent, safeBunks: bunks };
  }, [subjects, attendance, settings.targetAttendance]);

  // Today's Scheduled Classes List
  const todayWeekday = ((new Date().getDay() + 6) % 7) as DayOfWeek; // 0 = Mon, ..., 6 = Sun
  const todayClasses = useMemo(() => {
    return entries
      .filter(e => e.weekday === todayWeekday)
      .map(entry => {
        const period = periods.find(p => p.id === entry.periodId);
        const subject = subjects.find(s => s.id === entry.subjectId);
        const log = attendance.find(
          a => a.date === todayStr && a.periodId === entry.periodId
        );
        return { entry, period, subject, log };
      })
      .filter(item => item.period && item.subject)
      .sort((a, b) => (a.period?.startTime || '').localeCompare(b.period?.startTime || ''));
  }, [entries, periods, subjects, attendance, todayWeekday, todayStr]);

  // Current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const activeWidgetOrder = settings.widgetOrder || DEFAULT_WIDGET_ORDER;

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'holiday_banner':
        if (!activeHoliday) return null;
        return (
          <Card
            key="holiday_banner"
            style={[
              styles.holidayBanner,
              { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
            ]}
          >
            <View style={styles.holidayRow}>
              <Ionicons name="sunny" size={24} color={colors.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.holidayTitle, { color: colors.onPrimaryContainer }]}>
                  🌴 {activeHoliday.name}
                </Text>
                <Text style={[styles.holidaySubtitle, { color: colors.onPrimaryContainer }]}>
                  Holiday break active — attendance alerts are currently paused. Take the day off!
                </Text>
              </View>
            </View>
          </Card>
        );

      case 'now_next':
        return <NowNextCard key="now_next" />;

      case 'day_horizontal':
        return (
          <View key="day_horizontal" style={styles.sectionMargin}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Classes (Horizontal)</Text>
              <TouchableOpacity onPress={() => setActiveTab('timetable')} activeOpacity={0.7}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Full Timetable →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {todayClasses.length > 0 ? (
                  todayClasses.map(({ entry, period, subject, log }) => (
                    <Card
                      key={entry.periodId}
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        backgroundColor: colors.card,
                        borderColor: subject?.color || colors.primary,
                        borderLeftWidth: 4,
                        minWidth: 140,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
                        ⏰ {period?.startTime} - {period?.endTime}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 4 }} numberOfLines={1}>
                        {subject?.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                        📍 {entry.roomOverride || subject?.room || 'Main Room'}
                      </Text>
                      {log ? (
                        <View style={[styles.logBadge, { marginTop: 6, backgroundColor: log.status === 'present' ? colors.presentBg : colors.absentBg }]}>
                          <Text style={[styles.logBadgeText, { color: log.status === 'present' ? colors.present : colors.absent }]}>
                            {log.status.toUpperCase()}
                          </Text>
                        </View>
                      ) : null}
                    </Card>
                  ))
                ) : (
                  <Card style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>No classes scheduled for today ☕</Text>
                  </Card>
                )}
              </View>
            </ScrollView>
          </View>
        );

      case 'weekly_grid':
        const weekdayNamesShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return (
          <Card key="weekly_grid" style={[styles.widgetCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <View style={styles.widgetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[styles.widgetTitle, { color: colors.text }]}>Weekly Overview</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveTab('timetable')} activeOpacity={0.7}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Grid View →</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              {weekdayNamesShort.map((dayName, idx) => {
                const dayCount = entries.filter(e => e.weekday === idx).length;
                const isTodayDay = todayWeekday === idx;
                return (
                  <View
                    key={dayName}
                    style={{
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      borderRadius: 12,
                      backgroundColor: isTodayDay ? colors.primary : colors.surfaceVariant,
                      flex: 1,
                      marginHorizontal: 2,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isTodayDay ? colors.onPrimary : colors.textSecondary }}>
                      {dayName}
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: isTodayDay ? colors.onPrimary : colors.text, marginTop: 2 }}>
                      {dayCount}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        );

      case 'swipe_deck':
        return <SwipeDeck key="swipe_deck" />;

      case 'quick_actions':
        return (
          <View key="quick_actions" style={styles.sectionMargin}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
              <TouchableOpacity
                onPress={() => setWidgetModalVisible(true)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons name="options-outline" size={14} color={colors.primary} />
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Customize Widgets ⚙️</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickGrid}>
              <TouchableOpacity
                style={[styles.quickCard, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}
                onPress={() => setShareModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIconBox, { backgroundColor: colors.primary }]}>
                  <Ionicons name="qr-code" size={18} color={colors.onPrimary} />
                </View>
                <Text style={[styles.quickTitle, { color: colors.text }]}>Share / Scan QR</Text>
                <Text style={[styles.quickSub, { color: colors.textSecondary }]}>Import schedule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}
                onPress={() => setActiveTab('timetable')}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIconBox, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="calendar-outline" size={18} color="#FFF" />
                </View>
                <Text style={[styles.quickTitle, { color: colors.text }]}>Weekly Schedule</Text>
                <Text style={[styles.quickSub, { color: colors.textSecondary }]}>Full grid view</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}
                onPress={() => setActiveTab('attendance')}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIconBox, { backgroundColor: colors.present }]}>
                  <Ionicons name="calculator-outline" size={18} color="#FFF" />
                </View>
                <Text style={[styles.quickTitle, { color: colors.text }]}>Bunk Calculator</Text>
                <Text style={[styles.quickSub, { color: colors.textSecondary }]}>Attendance logs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}
                onPress={() => setHolidayModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIconBox, { backgroundColor: '#F59E0B' }]}>
                  <Ionicons name="sunny-outline" size={18} color="#FFF" />
                </View>
                <Text style={[styles.quickTitle, { color: colors.text }]}>Vacations</Text>
                <Text style={[styles.quickSub, { color: colors.textSecondary }]}>Add holiday break</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickCard, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}
                onPress={() => setLauncherModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIconBox, { backgroundColor: colors.primary }]}>
                  <Ionicons name="phone-portrait-outline" size={18} color={colors.onPrimary} />
                </View>
                <Text style={[styles.quickTitle, { color: colors.text }]}>Phone Widgets</Text>
                <Text style={[styles.quickSub, { color: colors.textSecondary }]}>Launcher setup 📱</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'attendance_health':
        return (
          <Card key="attendance_health" style={[styles.widgetCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <View style={styles.widgetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="analytics-outline" size={20} color={colors.primary} />
                <Text style={[styles.widgetTitle, { color: colors.text }]}>Attendance Health</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveTab('attendance')} activeOpacity={0.7}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Details →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.pctBadge, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.pctValue, { color: colors.primary }]}>{overallPct}%</Text>
                <Text style={[styles.pctLabel, { color: colors.onPrimaryContainer }]}>Overall</Text>
              </View>

              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.tallyRow}>
                  <Text style={[styles.tallyText, { color: colors.text }]}>
                    <Text style={{ fontWeight: '800', color: colors.present }}>{totalAttended}</Text> Attended
                  </Text>
                  <Text style={[styles.tallyText, { color: colors.text }]}>
                    <Text style={{ fontWeight: '800', color: colors.absent }}>{totalAbsent}</Text> Absent
                  </Text>
                  <Text style={[styles.tallyText, { color: colors.textSecondary }]}>
                    {totalHeld} Total
                  </Text>
                </View>

                {/* Status Pill */}
                <View style={styles.bunkStatusPill}>
                  <Ionicons
                    name={overallPct >= (settings.targetAttendance || 75) ? 'checkmark-circle' : 'alert-circle'}
                    size={14}
                    color={overallPct >= (settings.targetAttendance || 75) ? colors.present : colors.absent}
                  />
                  <Text style={[styles.bunkStatusText, { color: colors.textSecondary }]}>
                    {overallPct >= (settings.targetAttendance || 75)
                      ? `Safe margin: ~${safeBunks} bunks remaining`
                      : `Target: ${settings.targetAttendance || 75}% — Attend upcoming sessions!`}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        );

      case 'today_schedule':
        return (
          <View key="today_schedule" style={styles.sectionMargin}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Schedule</Text>
              <TouchableOpacity onPress={() => setActiveTab('timetable')} activeOpacity={0.7}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Full Timetable →</Text>
              </TouchableOpacity>
            </View>

            {todayClasses.length === 0 ? (
              <Card style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                <Ionicons name="cafe-outline" size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Classes Scheduled Today</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Enjoy your break or review upcoming exam topics!
                </Text>
              </Card>
            ) : (
              todayClasses.map(({ entry, period, subject, log }) => (
                <View
                  key={entry.periodId}
                  style={[
                    styles.classRowCard,
                    { backgroundColor: colors.card, borderColor: colors.borderSubtle, borderLeftColor: subject?.color || colors.primary },
                  ]}
                >
                  <View style={styles.timeCol}>
                    <Text style={[styles.timeText, { color: colors.text }]}>
                      {period?.startTime}
                    </Text>
                    <Text style={[styles.timeSub, { color: colors.textSecondary }]}>
                      {period?.endTime}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={[styles.subjectName, { color: colors.text }]} numberOfLines={1}>
                      {subject?.name}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
                      {(entry.roomOverride || subject?.room) ? (
                        <Text style={[styles.classMeta, { color: colors.textSecondary }]}>
                          📍 {entry.roomOverride || subject?.room}
                        </Text>
                      ) : null}
                      {(entry.teacher || subject?.teacher) ? (
                        <Text style={[styles.classMeta, { color: colors.textSecondary }]}>
                          👨‍🏫 {entry.teacher || subject?.teacher}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Log Status Badge */}
                  {log ? (
                    <View
                      style={[
                        styles.logBadge,
                        {
                          backgroundColor:
                            log.status === 'present'
                              ? colors.presentBg
                              : log.status === 'absent'
                              ? colors.absentBg
                              : colors.surfaceVariant,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.logBadgeText,
                          {
                            color:
                              log.status === 'present'
                                ? colors.present
                                : log.status === 'absent'
                                ? colors.absent
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {log.status.toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.logBadge, { backgroundColor: colors.surfaceVariant }]}>
                      <Text style={[styles.logBadgeText, { color: colors.textTertiary }]}>
                        PENDING
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        );

      case 'attendance_analytics':
        return (
          <View key="attendance_analytics" style={styles.sectionMargin}>
            <AttendanceAnalyticsChart />
          </View>
        );

      case 'upcoming_exams':
        if (!nearestExam) return null;
        return (
          <View key="upcoming_exams" style={styles.sectionMargin}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Exam</Text>
              <TouchableOpacity onPress={() => setActiveTab('exams')} activeOpacity={0.7}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>View All →</Text>
              </TouchableOpacity>
            </View>
            <ExamCard exam={nearestExam} />
          </View>
        );

      case 'smart_tips':
        return (
          <Card key="smart_tips" style={[styles.tipCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}>
            <Ionicons name="bulb-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>ClassTrack Smart Tip</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                Consistency is key! Keeping your attendance target above {settings.targetAttendance || 75}% ensures zero last-minute exam hall ticket issues.
              </Text>
            </View>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={`${getGreeting()}, ${settings.studentName || 'Student'} 👋`}
        subtitle={`${format(new Date(), 'EEEE, MMMM d')} • ${settings.grade || 'Semester'}`}
        rightAction={{
          icon: 'options-outline',
          onPress: () => setWidgetModalVisible(true),
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeWidgetOrder.map(id => renderWidget(id))}
      </ScrollView>

      {/* Modals */}
      <ShareScheduleModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
      />

      <HolidayModal
        visible={holidayModalVisible}
        onClose={() => setHolidayModalVisible(false)}
      />

      <WidgetCustomizerModal
        visible={widgetModalVisible}
        onClose={() => setWidgetModalVisible(false)}
      />

      <LauncherWidgetModal
        visible={launcherModalVisible}
        onClose={() => setLauncherModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: Platform.OS === 'ios' ? 10 : 6,
  },
  customizeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  holidayBanner: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  holidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holidayTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  holidaySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionMargin: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  quickIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  quickSub: {
    fontSize: 11,
    marginTop: 1,
  },
  widgetCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pctBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  pctLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
  },
  tallyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tallyText: {
    fontSize: 12,
  },
  bunkStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  bunkStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  classRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  timeCol: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  timeSub: {
    fontSize: 10,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '800',
  },
  classMeta: {
    fontSize: 11,
  },
  logBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  logBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  tipText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
});
