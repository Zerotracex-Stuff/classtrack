import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { syncLauncherHomeWidgets } from '../../services/homeWidgetService';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isFuture, isToday } from 'date-fns';
import { formatTimeRange } from '../../utils/timeUtils';

interface LauncherWidgetModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LauncherWidgetModal: React.FC<LauncherWidgetModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { subjects, periods, entries, attendance, exams, holidays, settings } = useApp();

  const [activePreviewTab, setActivePreviewTab] = useState<
    'next_class' | 'upcoming_classes' | 'tomorrows_classes' | 'weekly_timetable' | 'today_schedule' | 'attendance' | 'analytics' | 'exams' | 'quick_actions' | 'smart_tips' | 'holiday'
  >('next_class');
  const [syncing, setSyncing] = useState(false);

  // Math for Live Interactive Launcher Widget Preview
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayWeekday = ((new Date().getDay() + 6) % 7);
  const tomorrowWeekday = (todayWeekday + 1) % 7;

  const todayEntries = entries
    .filter(e => e.weekday === todayWeekday)
    .map(entry => {
      const period = periods.find(p => p.id === entry.periodId);
      const subject = subjects.find(s => s.id === entry.subjectId);
      return { entry, period, subject };
    })
    .filter(item => item.period && item.subject)
    .sort((a, b) => (a.period?.startTime || '').localeCompare(b.period?.startTime || ''));

  const tomorrowEntries = entries
    .filter(e => e.weekday === tomorrowWeekday)
    .map(entry => {
      const period = periods.find(p => p.id === entry.periodId);
      const subject = subjects.find(s => s.id === entry.subjectId);
      return { entry, period, subject };
    })
    .filter(item => item.period && item.subject)
    .sort((a, b) => (a.period?.startTime || '').localeCompare(b.period?.startTime || ''));

  const firstClass = todayEntries[0];

  let held = 0;
  let attended = 0;
  subjects.forEach(s => {
    const logs = attendance.filter(a => a.subjectId === s.id && a.status !== 'not_held');
    held += logs.length;
    attended += logs.filter(a => a.status === 'present').length;
  });

  const target = settings.targetAttendance || 75;
  const overallPct = held > 0 ? Math.round((attended / held) * 100) : 100;
  const safeBunks = held > 0 ? Math.max(0, Math.floor((attended - (target / 100) * held) / (target / 100))) : 0;

  const nearestExam = [...exams]
    .filter((e) => {
      const d = parseISO(e.date);
      return isFuture(d) || isToday(d);
    })
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const activeHoliday = holidays.find(
    h => todayStr >= h.startDate && todayStr <= h.endDate
  );

  let lowestSubjectName = 'All Subjects';
  let lowestPct = 100;
  let subjectsBelowTarget = 0;

  subjects.forEach(s => {
    const logs = attendance.filter(a => a.subjectId === s.id && a.status !== 'not_held');
    const sHeld = logs.length;
    const sAttended = logs.filter(a => a.status === 'present').length;
    const pct = sHeld > 0 ? Math.round((sAttended / sHeld) * 100) : 100;
    if (pct < target) subjectsBelowTarget++;
    if (pct < lowestPct) {
      lowestPct = pct;
      lowestSubjectName = s.name;
    }
  });

  const handleManualSync = async () => {
    setSyncing(true);
    const success = await syncLauncherHomeWidgets({
      subjects,
      periods,
      entries,
      attendance,
      exams,
      holidays,
      settings,
    });
    setSyncing(false);

    if (success) {
      Alert.alert(
        'Launcher Widgets Synced! 📱✨',
        'All launcher widgets (Next Class, Upcoming Classes, Tomorrow\'s Classes, Weekly Timetable, Attendance Health, Risk Analytics, Exam Countdown, Quick Shortcuts, Smart Tips & Vacation Alert) have been pushed to your device launcher.'
      );
    } else {
      Alert.alert('Sync Complete', 'Home launcher data refreshed.');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Device Launcher Widgets 📱</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Select a launcher widget preview to see how it looks on your phone screen
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Sync Button */}
          <View style={styles.syncRow}>
            <TouchableOpacity
              style={[styles.syncBtn, { backgroundColor: colors.primary }]}
              onPress={handleManualSync}
              disabled={syncing}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-circle-outline" size={18} color={colors.onPrimary} />
              <Text style={[styles.syncBtnText, { color: colors.onPrimary }]}>
                {syncing ? 'Syncing Launcher Widgets...' : 'Sync All Launcher Widgets Now 🔄'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Widget Selection Grid */}
            <View style={styles.gridContainer}>
              <Text style={[styles.gridTitle, { color: colors.textSecondary }]}>
                AVAILABLE LAUNCHER WIDGET STYLES:
              </Text>
              <View style={styles.gridTabBar}>
                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'next_class' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('next_class')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={activePreviewTab === 'next_class' ? colors.primary : colors.text}
                  />
                  <Text style={[styles.gridTabLabel, { color: activePreviewTab === 'next_class' ? colors.primary : colors.text }]}>
                    Next Class
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'upcoming_classes' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('upcoming_classes')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="hourglass-outline"
                    size={16}
                    color={activePreviewTab === 'upcoming_classes' ? colors.primary : colors.text}
                  />
                  <Text style={[styles.gridTabLabel, { color: activePreviewTab === 'upcoming_classes' ? colors.primary : colors.text }]}>
                    Upcoming Classes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'tomorrows_classes' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('tomorrows_classes')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="today-outline"
                    size={16}
                    color={activePreviewTab === 'tomorrows_classes' ? colors.primary : colors.text}
                  />
                  <Text style={[styles.gridTabLabel, { color: activePreviewTab === 'tomorrows_classes' ? colors.primary : colors.text }]}>
                    Tomorrow's Classes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'weekly_timetable' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('weekly_timetable')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={activePreviewTab === 'weekly_timetable' ? colors.primary : colors.text}
                  />
                  <Text style={[styles.gridTabLabel, { color: activePreviewTab === 'weekly_timetable' ? colors.primary : colors.text }]}>
                    Weekly Grid
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'today_schedule' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('today_schedule')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="albums-outline"
                    size={16}
                    color={activePreviewTab === 'today_schedule' ? colors.primary : colors.text}
                  />
                  <Text style={[styles.gridTabLabel, { color: activePreviewTab === 'today_schedule' ? colors.primary : colors.text }]}>
                    Today's Deck
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'attendance' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('attendance')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="analytics-outline"
                    size={16}
                    color={activePreviewTab === 'attendance' ? colors.primary : colors.text}
                  />
                  <Text style={[styles.gridTabLabel, { color: activePreviewTab === 'attendance' ? colors.primary : colors.text }]}>
                    Attendance
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'analytics' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('analytics')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="bar-chart-outline"
                    size={16}
                    color={activePreviewTab === 'analytics' ? colors.primary : colors.text}
                  />
                  <Text style={[styles.gridTabLabel, { color: activePreviewTab === 'analytics' ? colors.primary : colors.text }]}>
                    Analytics Risk
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'exams' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('exams')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="school-outline"
                    size={16}
                    color={activePreviewTab === 'exams' ? colors.primary : colors.text}
                  />
                  <Text style={[styles.gridTabLabel, { color: activePreviewTab === 'exams' ? colors.primary : colors.text }]}>
                    Exams
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'quick_actions' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('quick_actions')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="grid-outline"
                    size={16}
                    color={activePreviewTab === 'quick_actions' ? colors.primary : colors.text}
                  />
                  <Text style={[styles.gridTabLabel, { color: activePreviewTab === 'quick_actions' ? colors.primary : colors.text }]}>
                    Quick Actions
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'smart_tips' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('smart_tips')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="bulb-outline"
                    size={16}
                    color={activePreviewTab === 'smart_tips' ? colors.primary : colors.text}
                  />
                  <Text style={[styles.gridTabLabel, { color: activePreviewTab === 'smart_tips' ? colors.primary : colors.text }]}>
                    Smart Tip
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'holiday' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('holiday')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="sunny-outline"
                    size={16}
                    color={activePreviewTab === 'holiday' ? colors.primary : colors.text}
                  />
                  <Text style={[styles.gridTabLabel, { color: activePreviewTab === 'holiday' ? colors.primary : colors.text }]}>
                    Vacation Break
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Interactive Live Preview Box */}
            <View style={styles.previewContainer}>
              <Text style={[styles.previewTag, { color: colors.textTertiary }]}>
                PHONE LAUNCHER LIVE PREVIEW
              </Text>

              {/* 1. Happening Now / Next Class */}
              {activePreviewTab === 'next_class' && (
                <View style={[styles.launcherWidgetBox, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                  <View style={styles.widgetHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="time" size={18} color={colors.primary} />
                      <Text style={[styles.widgetHeaderTitle, { color: colors.text }]}>Next Class</Text>
                    </View>
                    <View style={[styles.liveBadge, { backgroundColor: colors.primaryContainer }]}>
                      <Text style={[styles.liveBadgeText, { color: colors.primary }]}>Starts in 15m</Text>
                    </View>
                  </View>

                  <View style={styles.widgetMainBody}>
                    <Text style={[styles.widgetSubject, { color: colors.text }]}>
                      {firstClass?.subject?.name || 'Computer Science & Lab'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                      <Text style={[styles.widgetMeta, { color: colors.textSecondary }]}>
                        ⏰ {formatTimeRange(firstClass?.period?.startTime || '09:00', firstClass?.period?.endTime || '09:45', settings.timeFormat || '12h')}
                      </Text>
                      <Text style={[styles.widgetMeta, { color: colors.textSecondary }]}>
                        📍 {firstClass?.entry?.roomOverride || firstClass?.subject?.room || 'Lab 402'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 2. Upcoming Classes Today */}
              {activePreviewTab === 'upcoming_classes' && (
                <View style={[styles.launcherWidgetBox, { backgroundColor: colors.card, borderColor: '#6366F1' }]}>
                  <View style={styles.widgetHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="hourglass" size={18} color="#6366F1" />
                      <Text style={[styles.widgetHeaderTitle, { color: colors.text }]}>Upcoming Classes Today</Text>
                    </View>
                    <View style={[styles.liveBadge, { backgroundColor: '#EEF2FF' }]}>
                      <Text style={[styles.liveBadgeText, { color: '#4F46E5' }]}>{todayEntries.length} Upcoming</Text>
                    </View>
                  </View>

                  <View style={styles.widgetMainBody}>
                    <Text style={[styles.widgetSubject, { color: colors.text }]}>
                      {todayEntries.length > 0 ? `Upcoming Today (${todayEntries.length})` : 'All Classes Done 🎉'}
                    </Text>
                    <Text style={[styles.widgetMeta, { color: colors.textSecondary, marginTop: 4 }]}>
                      {todayEntries.length > 0
                        ? todayEntries.slice(0, 3).map(i => `${i.period?.startTime} ${i.subject?.name}`).join('  •  ')
                        : 'No remaining sessions scheduled for today'}
                    </Text>
                  </View>
                </View>
              )}

              {/* 3. Tomorrow's Classes */}
              {activePreviewTab === 'tomorrows_classes' && (
                <View style={[styles.launcherWidgetBox, { backgroundColor: colors.card, borderColor: '#8B5CF6' }]}>
                  <View style={styles.widgetHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="today" size={18} color="#8B5CF6" />
                      <Text style={[styles.widgetHeaderTitle, { color: colors.text }]}>Tomorrow's Schedule</Text>
                    </View>
                    <View style={[styles.liveBadge, { backgroundColor: '#F3E8FF' }]}>
                      <Text style={[styles.liveBadgeText, { color: '#7C3AED' }]}>{tomorrowEntries.length} Classes</Text>
                    </View>
                  </View>

                  <View style={styles.widgetMainBody}>
                    <Text style={[styles.widgetSubject, { color: colors.text }]}>
                      {tomorrowEntries.length > 0 ? `Tomorrow (${tomorrowEntries.length} Lectures)` : 'No Classes Tomorrow 🎉'}
                    </Text>
                    <Text style={[styles.widgetMeta, { color: colors.textSecondary, marginTop: 4 }]}>
                      {tomorrowEntries.length > 0
                        ? tomorrowEntries.slice(0, 3).map(i => `${i.period?.startTime} ${i.subject?.name}`).join('  •  ')
                        : 'Enjoy your day off tomorrow!'}
                    </Text>
                  </View>
                </View>
              )}

              {/* 4. Weekly Timetable Overview */}
              {activePreviewTab === 'weekly_timetable' && (
                <View style={[styles.launcherWidgetBox, { backgroundColor: colors.card, borderColor: '#EC4899' }]}>
                  <View style={styles.widgetHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="calendar" size={18} color="#EC4899" />
                      <Text style={[styles.widgetHeaderTitle, { color: colors.text }]}>Weekly Timetable Grid</Text>
                    </View>
                    <View style={[styles.liveBadge, { backgroundColor: '#FCE7F3' }]}>
                      <Text style={[styles.liveBadgeText, { color: '#DB2777' }]}>{entries.length} Total Sessions</Text>
                    </View>
                  </View>

                  <View style={styles.widgetMainBody}>
                    <Text style={[styles.widgetSubject, { color: colors.text }]}>
                      Weekly Schedule Overview
                    </Text>
                    <Text style={[styles.widgetMeta, { color: colors.textSecondary, marginTop: 4 }]}>
                      Mon-Fri Timetable Grid • Tap to open full schedule details
                    </Text>
                  </View>
                </View>
              )}

              {/* 2. Today's Schedule Deck */}
              {activePreviewTab === 'today_schedule' && (
                <View style={[styles.launcherWidgetBox, { backgroundColor: colors.card, borderColor: '#6366F1' }]}>
                  <View style={styles.widgetHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="albums" size={18} color="#6366F1" />
                      <Text style={[styles.widgetHeaderTitle, { color: colors.text }]}>Today's Schedule Deck</Text>
                    </View>
                    <View style={[styles.liveBadge, { backgroundColor: '#EEF2FF' }]}>
                      <Text style={[styles.liveBadgeText, { color: '#4F46E5' }]}>{todayEntries.length} Classes</Text>
                    </View>
                  </View>

                  <View style={styles.widgetMainBody}>
                    <Text style={[styles.widgetSubject, { color: colors.text }]}>
                      {todayEntries.length > 0 ? `Today: ${todayEntries.length} Scheduled Lectures` : 'No Classes Today 🎉'}
                    </Text>
                    <Text style={[styles.widgetMeta, { color: colors.textSecondary, marginTop: 4 }]}>
                      {todayEntries.length > 0
                        ? `1st: ${firstClass?.subject?.name} at ${firstClass?.period?.startTime}`
                        : 'Rest & review your schedule'}
                    </Text>
                  </View>
                </View>
              )}

              {/* 3. Attendance Health */}
              {activePreviewTab === 'attendance' && (
                <View style={[styles.launcherWidgetBoxCompact, { backgroundColor: colors.card, borderColor: colors.present }]}>
                  <View style={styles.compactTop}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.present} />
                    <Text style={[styles.compactPct, { color: colors.present }]}>{overallPct}%</Text>
                  </View>

                  <Text style={[styles.compactTitle, { color: colors.text }]}>Attendance Health</Text>
                  <Text style={[styles.compactSub, { color: colors.textSecondary }]}>
                    {attended}/{held} Classes • {safeBunks} Safe Bunks
                  </Text>
                </View>
              )}

              {/* 4. Analytics Risk */}
              {activePreviewTab === 'analytics' && (
                <View style={[styles.launcherWidgetBox, { backgroundColor: colors.card, borderColor: subjectsBelowTarget > 0 ? '#EF4444' : '#10B981' }]}>
                  <View style={styles.widgetHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="bar-chart" size={18} color={subjectsBelowTarget > 0 ? '#EF4444' : '#10B981'} />
                      <Text style={[styles.widgetHeaderTitle, { color: colors.text }]}>Analytics & Risk</Text>
                    </View>
                    <View style={[styles.liveBadge, { backgroundColor: subjectsBelowTarget > 0 ? '#FEE2E2' : '#D1FAE5' }]}>
                      <Text style={[styles.liveBadgeText, { color: subjectsBelowTarget > 0 ? '#DC2626' : '#059669' }]}>
                        {subjectsBelowTarget > 0 ? `${subjectsBelowTarget} AT RISK` : 'ALL CLEAR'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.widgetMainBody}>
                    <Text style={[styles.widgetSubject, { color: colors.text }]}>
                      {overallPct}% Overall Attendance
                    </Text>
                    <Text style={[styles.widgetMeta, { color: colors.textSecondary, marginTop: 4 }]}>
                      {subjectsBelowTarget > 0
                        ? `Lowest: ${lowestSubjectName} (${lowestPct}%) • Target ${target}%`
                        : `All ${subjects.length} subjects meet ${target}% target threshold`}
                    </Text>
                  </View>
                </View>
              )}

              {/* 5. Exams & Deadlines */}
              {activePreviewTab === 'exams' && (
                <View style={[styles.launcherWidgetBoxBanner, { backgroundColor: colors.card, borderColor: '#F59E0B' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="school" size={24} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bannerTitle, { color: colors.text }]}>
                        {nearestExam?.title || 'Data Structures Final Exam'}
                      </Text>
                      <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                        {nearestExam?.date || 'Upcoming Exam'} • Room 302
                      </Text>
                    </View>

                    <View style={[styles.countdownPill, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.countdownText, { color: '#B45309' }]}>In 3 Days</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 6. Quick Actions */}
              {activePreviewTab === 'quick_actions' && (
                <View style={[styles.launcherWidgetBoxBanner, { backgroundColor: colors.card, borderColor: '#8B5CF6' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="flash" size={24} color="#8B5CF6" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bannerTitle, { color: colors.text }]}>
                        Quick Shortcuts & Scanner
                      </Text>
                      <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                        📷 Scan QR  •  📅 Timetable  •  🧮 Bunks  •  🌴 Vacations
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 7. Smart Tip */}
              {activePreviewTab === 'smart_tips' && (
                <View style={[styles.launcherWidgetBoxBanner, { backgroundColor: colors.card, borderColor: '#F59E0B' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="bulb" size={24} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bannerTitle, { color: colors.text }]}>
                        ClassTrack Smart Advice
                      </Text>
                      <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                        {overallPct < target
                          ? `🚨 Attendance is ${overallPct}%. Attend next lectures!`
                          : `Keep attendance above ${target}% to avoid exam hall ticket issues!`}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 8. Vacation Break */}
              {activePreviewTab === 'holiday' && (
                <View style={[styles.launcherWidgetBoxBanner, { backgroundColor: colors.card, borderColor: activeHoliday ? '#10B981' : '#64748B' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="sunny" size={24} color={activeHoliday ? '#10B981' : '#64748B'} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bannerTitle, { color: colors.text }]}>
                        {activeHoliday ? `🌴 ${activeHoliday.name}` : 'No Active Vacation Break'}
                      </Text>
                      <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                        {activeHoliday
                          ? 'Vacation active • Attendance alerts paused 🎉'
                          : 'Regular academic schedule in progress'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* How to add to home screen guide */}
            <View style={[styles.guideCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.guideTitle, { color: colors.text }]}>How to add widgets to Launcher:</Text>
              </View>

              <Text style={[styles.stepHeader, { color: colors.text }]}>📱 Android Home Screen:</Text>
              <Text style={[styles.stepBody, { color: colors.textSecondary }]}>
                1. Go to your phone's home screen.{'\n'}
                2. Long-press any empty space → Tap <Text style={{ fontWeight: '700' }}>Widgets</Text>.{'\n'}
                3. Scroll down to <Text style={{ fontWeight: '700' }}>ClassTrack</Text>.{'\n'}
                4. Press and drag any of the 8 widgets onto your launcher home screen!
              </Text>

              <Text style={[styles.stepHeader, { color: colors.text, marginTop: 10 }]}>🍎 iOS Home Screen:</Text>
              <Text style={[styles.stepBody, { color: colors.textSecondary }]}>
                1. Touch & hold empty area on your iOS Home Screen.{'\n'}
                2. Tap the <Text style={{ fontWeight: '700' }}>+</Text> button in the top corner.{'\n'}
                3. Search for <Text style={{ fontWeight: '700' }}>ClassTrack</Text> → Tap <Text style={{ fontWeight: '700' }}>Add Widget</Text>.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    gap: 8,
  },
  syncBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  body: {
    paddingHorizontal: 20,
  },
  gridContainer: {
    marginBottom: 14,
  },
  gridTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  gridTabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridTabItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  gridTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  previewContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  previewTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  launcherWidgetBox: {
    width: '100%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  widgetHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  widgetMainBody: {
    marginTop: 4,
  },
  widgetSubject: {
    fontSize: 18,
    fontWeight: '900',
  },
  widgetMeta: {
    fontSize: 12,
  },
  launcherWidgetBoxCompact: {
    width: '65%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
  },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  compactPct: {
    fontSize: 26,
    fontWeight: '900',
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  compactSub: {
    fontSize: 11,
    marginTop: 2,
  },
  launcherWidgetBoxBanner: {
    width: '100%',
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  bannerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  countdownPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '800',
  },
  guideCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 20,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  stepHeader: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  stepBody: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
});
