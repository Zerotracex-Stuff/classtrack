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
import { Subject, UserSettings } from '../../types';

interface LauncherWidgetModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LauncherWidgetModal: React.FC<LauncherWidgetModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { subjects, periods, entries, attendance, exams, holidays, settings, updateSettings } = useApp();

  const [activePreviewTab, setActivePreviewTab] = useState<
    'next_class' | 'upcoming_classes' | 'tomorrows_classes' | 'weekly_timetable' | 'today_schedule' | 'attendance' | 'analytics' | 'exams' | 'quick_actions' | 'smart_tips' | 'holiday'
  >('next_class');
  const [syncing, setSyncing] = useState(false);
  const [showCustomizationPanel, setShowCustomizationPanel] = useState(true);

  // Customization preference flags
  const showTime = settings.launcherWidgetShowTime !== false;
  const showPeriod = settings.launcherWidgetShowPeriod !== false;
  const showRoom = settings.launcherWidgetShowRoom !== false;
  const showTeacher = settings.launcherWidgetShowTeacher !== false;
  const showSubjectCode = settings.launcherWidgetShowSubjectCode === true;
  const showAttendance = settings.launcherWidgetShowAttendanceStatus !== false;

  const handleToggleOption = async (key: keyof UserSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    await updateSettings(updated);
    syncLauncherHomeWidgets({
      subjects,
      periods,
      entries,
      attendance,
      exams,
      holidays,
      settings: updated,
    });
  };

  const getSubjectDisplayName = (sub?: Subject) => {
    if (!sub) return 'Class';
    if (showSubjectCode && sub.code) return sub.code;
    return sub.name;
  };

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

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const upcomingTodayEntries = todayEntries.filter(item => {
    if (!item.period) return false;
    const [endH, endM] = item.period.endTime.split(':').map(Number);
    return endH * 60 + endM >= currentMins;
  });

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

  const getAttendanceInfo = (periodId?: string, subjectId?: string) => {
    const record = attendance.find(a =>
      a.date === todayStr &&
      (a.periodId ? a.periodId === periodId : a.subjectId === subjectId)
    );
    if (!record) return { status: 'unmarked', label: 'UNMARKED', bg: '#F1F5F9', color: '#64748B' };
    if (record.status === 'present') return { status: 'present', label: '✓ PRESENT', bg: '#DCFCE7', color: '#16A34A' };
    if (record.status === 'absent') return { status: 'absent', label: '✗ ABSENT', bg: '#FEE2E2', color: '#DC2626' };
    if (record.status === 'not_held') return { status: 'cancelled', label: 'CANCELLED', bg: '#FEF3C7', color: '#D97706' };
    return { status: 'unmarked', label: 'UNMARKED', bg: '#F1F5F9', color: '#64748B' };
  };

  const sortedPeriods = [...periods].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  const weekDays = [
    { day: 0, label: 'MON' },
    { day: 1, label: 'TUE' },
    { day: 2, label: 'WED' },
    { day: 3, label: 'THU' },
    { day: 4, label: 'FRI' },
    { day: 5, label: 'SAT' },
  ];

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
            {/* Widget Detail Customization Options Card */}
            <View style={[styles.customizationCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}>
              <TouchableOpacity
                style={styles.customizationHeader}
                onPress={() => setShowCustomizationPanel(!showCustomizationPanel)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={[styles.customizationIconWrap, { backgroundColor: colors.primaryContainer }]}>
                    <Ionicons name="options-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.customizationTitle, { color: colors.text }]}>Customize Widget Details</Text>
                    <Text style={[styles.customizationSub, { color: colors.textSecondary }]}>
                      {showCustomizationPanel ? 'Tap to collapse customization options' : 'Customize time, period, room, teacher & badges'}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={showCustomizationPanel ? 'chevron-up-circle' : 'chevron-down-circle'}
                  size={22}
                  color={colors.primary}
                />
              </TouchableOpacity>

              {showCustomizationPanel && (
                <View style={[styles.customizationBody, { borderTopColor: colors.borderSubtle, borderTopWidth: 1 }]}>
                  {/* 1. Time */}
                  <View style={[styles.toggleRow, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Class Time</Text>
                      </View>
                      <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                        Show start & end schedule timings (e.g. 09:00 - 09:45)
                      </Text>
                    </View>
                    <Switch
                      value={showTime}
                      onValueChange={(val) => handleToggleOption('launcherWidgetShowTime', val)}
                      trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                    />
                  </View>

                  {/* 2. Period Label */}
                  <View style={[styles.toggleRow, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="pricetag-outline" size={16} color="#6366F1" />
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Period Label & Number</Text>
                      </View>
                      <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                        Display period badges (e.g. P1, Period 2, Class #1)
                      </Text>
                    </View>
                    <Switch
                      value={showPeriod}
                      onValueChange={(val) => handleToggleOption('launcherWidgetShowPeriod', val)}
                      trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                    />
                  </View>

                  {/* 3. Room Number */}
                  <View style={[styles.toggleRow, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="location-outline" size={16} color="#0EA5E9" />
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Room & Location</Text>
                      </View>
                      <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                        Display classroom number or lecture hall venue
                      </Text>
                    </View>
                    <Switch
                      value={showRoom}
                      onValueChange={(val) => handleToggleOption('launcherWidgetShowRoom', val)}
                      trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                    />
                  </View>

                  {/* 4. Teacher Name */}
                  <View style={[styles.toggleRow, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="person-outline" size={16} color="#8B5CF6" />
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Teacher / Faculty</Text>
                      </View>
                      <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                        Display lecturer or instructor name
                      </Text>
                    </View>
                    <Switch
                      value={showTeacher}
                      onValueChange={(val) => handleToggleOption('launcherWidgetShowTeacher', val)}
                      trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                    />
                  </View>

                  {/* 5. Short Subject Code */}
                  <View style={[styles.toggleRow, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="text-outline" size={16} color="#10B981" />
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Short Course Code</Text>
                      </View>
                      <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                        Use short code (e.g. CS101) instead of full subject name
                      </Text>
                    </View>
                    <Switch
                      value={showSubjectCode}
                      onValueChange={(val) => handleToggleOption('launcherWidgetShowSubjectCode', val)}
                      trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                    />
                  </View>

                  {/* 6. Attendance Status */}
                  <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Attendance Mark Status</Text>
                      </View>
                      <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                        Show live attendance badge (✓ Present, ✗ Absent, Unmarked)
                      </Text>
                    </View>
                    <Switch
                      value={showAttendance}
                      onValueChange={(val) => handleToggleOption('launcherWidgetShowAttendanceStatus', val)}
                      trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                    />
                  </View>
                </View>
              )}
            </View>

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
                      {getSubjectDisplayName(firstClass?.subject)}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                      {showPeriod && firstClass?.period?.label ? (
                        <Text style={[styles.widgetMeta, { color: colors.primary, fontWeight: '700' }]}>
                          🏷️ {firstClass.period.label}
                        </Text>
                      ) : null}
                      {showTime ? (
                        <Text style={[styles.widgetMeta, { color: colors.textSecondary }]}>
                          ⏰ {formatTimeRange(firstClass?.period?.startTime || '09:00', firstClass?.period?.endTime || '09:45', settings.timeFormat || '12h')}
                        </Text>
                      ) : null}
                      {showRoom && (firstClass?.entry?.roomOverride || firstClass?.subject?.room) ? (
                        <Text style={[styles.widgetMeta, { color: colors.textSecondary }]}>
                          📍 {firstClass?.entry?.roomOverride || firstClass?.subject?.room}
                        </Text>
                      ) : null}
                      {showTeacher && (firstClass?.entry?.teacher || firstClass?.subject?.teacher) ? (
                        <Text style={[styles.widgetMeta, { color: colors.textSecondary }]}>
                          👤 {firstClass?.entry?.teacher || firstClass?.subject?.teacher}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              )}

              {/* 2. Upcoming Classes Today (Separated Individual Cards) */}
              {activePreviewTab === 'upcoming_classes' && (
                <View style={[styles.launcherWidgetBox, { backgroundColor: colors.card, borderColor: '#6366F1' }]}>
                  <View style={styles.widgetHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="hourglass" size={18} color="#6366F1" />
                      <Text style={[styles.widgetHeaderTitle, { color: colors.text }]}>Upcoming Classes Today</Text>
                    </View>
                    <View style={[styles.liveBadge, { backgroundColor: '#EEF2FF' }]}>
                      <Text style={[styles.liveBadgeText, { color: '#4F46E5' }]}>{upcomingTodayEntries.length} Left</Text>
                    </View>
                  </View>

                  {upcomingTodayEntries.length > 0 ? (
                    <View>
                      <ScrollView
                        style={{ maxHeight: 280 }}
                        contentContainerStyle={styles.itemsListContainer}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {upcomingTodayEntries.map((item, idx) => {
                          const [startH, startM] = (item.period?.startTime || '00:00').split(':').map(Number);
                          const [endH, endM] = (item.period?.endTime || '00:00').split(':').map(Number);
                          const sMins = startH * 60 + startM;
                          const eMins = endH * 60 + endM;
                          let statusText = 'UPCOMING';
                          let statusBg = '#EEF2FF';
                          let statusColor = '#4F46E5';

                          if (currentMins >= sMins && currentMins <= eMins) {
                            statusText = `IN SESSION (${eMins - currentMins}m left)`;
                            statusBg = '#DCFCE7';
                            statusColor = '#16A34A';
                          } else if (currentMins < sMins) {
                            const minsUntil = sMins - currentMins;
                            if (minsUntil <= 60) {
                              statusText = `STARTS IN ${minsUntil}m`;
                              statusBg = '#FEF3C7';
                              statusColor = '#D97706';
                            }
                          }

                          const att = getAttendanceInfo(item.entry.periodId, item.entry.subjectId);

                          const roomVal = showRoom ? (item.entry.roomOverride || item.subject?.room) : null;
                          const teacherVal = showTeacher ? (item.entry.teacher || item.subject?.teacher) : null;
                          const metaParts = [];
                          if (roomVal) metaParts.push(`📍 ${roomVal}`);
                          if (teacherVal) metaParts.push(`👤 ${teacherVal}`);

                          return (
                            <View
                              key={item.entry.id || idx}
                              style={[styles.classItemCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}
                            >
                              <View style={[styles.cardAccentBar, { backgroundColor: '#6366F1' }]} />
                              <View style={{ flex: 1 }}>
                                <View style={styles.cardHeaderRow}>
                                  {showTime ? (
                                    <View style={[styles.timeBadge, { backgroundColor: '#312E81' }]}>
                                      <Text style={styles.timeBadgeText}>
                                        ⏰ {formatTimeRange(item.period?.startTime || '00:00', item.period?.endTime || '00:00', settings.timeFormat || '12h')}
                                      </Text>
                                    </View>
                                  ) : null}
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: showTime ? 0 : 'auto' }}>
                                    {showAttendance ? (
                                      <View style={[styles.attendanceBadge, { backgroundColor: att.bg }]}>
                                        <Text style={[styles.attendanceBadgeText, { color: att.color }]}>{att.label}</Text>
                                      </View>
                                    ) : null}
                                    {showPeriod ? (
                                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                                          {item.period?.label ? `${item.period.label} • ${statusText}` : statusText}
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>
                                </View>
                                <Text style={[styles.cardSubjectTitle, { color: colors.text }]} numberOfLines={1}>
                                  {getSubjectDisplayName(item.subject)}
                                </Text>
                                {metaParts.length > 0 ? (
                                  <Text style={[styles.cardMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {metaParts.join('  •  ')}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          );
                        })}
                      </ScrollView>
                      {upcomingTodayEntries.length > 3 && (
                        <Text style={[styles.scrollHintText, { color: colors.textTertiary }]}>
                          ⇅ Scroll to view all {upcomingTodayEntries.length} upcoming classes
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyCardBox}>
                      <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                      <Text style={[styles.emptyCardTitle, { color: colors.text }]}>All Classes Completed Today! 🎉</Text>
                      <Text style={[styles.emptyCardSub, { color: colors.textSecondary }]}>
                        No remaining sessions for today. Take time to relax and review your notes.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* 3. Tomorrow's Classes (Separated Individual Cards) */}
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

                  {tomorrowEntries.length > 0 ? (
                    <View>
                      <ScrollView
                        style={{ maxHeight: 280 }}
                        contentContainerStyle={styles.itemsListContainer}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {tomorrowEntries.map((item, idx) => {
                          const roomVal = showRoom ? (item.entry.roomOverride || item.subject?.room) : null;
                          const teacherVal = showTeacher ? (item.entry.teacher || item.subject?.teacher) : null;
                          const metaParts = [];
                          if (roomVal) metaParts.push(`📍 ${roomVal}`);
                          if (teacherVal) metaParts.push(`👤 ${teacherVal}`);

                          return (
                            <View
                              key={item.entry.id || idx}
                              style={[styles.classItemCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}
                            >
                              <View style={[styles.cardAccentBar, { backgroundColor: '#8B5CF6' }]} />
                              <View style={{ flex: 1 }}>
                                <View style={styles.cardHeaderRow}>
                                  {showTime ? (
                                    <View style={[styles.timeBadge, { backgroundColor: '#4C1D95' }]}>
                                      <Text style={styles.timeBadgeText}>
                                        ⏰ {formatTimeRange(item.period?.startTime || '00:00', item.period?.endTime || '00:00', settings.timeFormat || '12h')}
                                      </Text>
                                    </View>
                                  ) : null}
                                  {showPeriod ? (
                                    <View style={[styles.statusBadge, { backgroundColor: '#F3E8FF', marginLeft: showTime ? 0 : 'auto' }]}>
                                      <Text style={[styles.statusBadgeText, { color: '#7C3AED' }]}>
                                        {item.period?.label ? item.period.label : `LECTURE ${idx + 1}`}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                                <Text style={[styles.cardSubjectTitle, { color: colors.text }]} numberOfLines={1}>
                                  {getSubjectDisplayName(item.subject)}
                                </Text>
                                {metaParts.length > 0 ? (
                                  <Text style={[styles.cardMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {metaParts.join('  •  ')}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          );
                        })}
                      </ScrollView>
                      {tomorrowEntries.length > 3 && (
                        <Text style={[styles.scrollHintText, { color: colors.textTertiary }]}>
                          ⇅ Scroll to view all {tomorrowEntries.length} tomorrow lectures
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyCardBox}>
                      <Ionicons name="sunny" size={32} color="#F59E0B" />
                      <Text style={[styles.emptyCardTitle, { color: colors.text }]}>No Classes Tomorrow! 🌴</Text>
                      <Text style={[styles.emptyCardSub, { color: colors.textSecondary }]}>
                        You have no lectures scheduled for tomorrow. Enjoy your break!
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* 4. Weekly Timetable Overview (Table / Grid View) */}
              {activePreviewTab === 'weekly_timetable' && (
                <View style={[styles.launcherWidgetBox, { backgroundColor: colors.card, borderColor: '#6366F1', paddingHorizontal: 10 }]}>
                  <View style={styles.widgetHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="grid" size={18} color="#6366F1" />
                      <Text style={[styles.widgetHeaderTitle, { color: colors.text }]}>Weekly Timetable Table</Text>
                    </View>
                    <View style={[styles.liveBadge, { backgroundColor: '#EEF2FF' }]}>
                      <Text style={[styles.liveBadgeText, { color: '#4F46E5' }]}>{entries.length} Sessions</Text>
                    </View>
                  </View>

                  <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ marginTop: 8 }}>
                    <View style={styles.tableWrapper}>
                      {/* Table Header Row */}
                      <View style={styles.tableHeaderRow}>
                        <View style={[styles.thCell, styles.timeThCell, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}>
                          <Text style={[styles.thText, { color: colors.textSecondary }]}>TIME</Text>
                        </View>
                        {weekDays.map(d => {
                          const isToday = d.day === todayWeekday;
                          return (
                            <View
                              key={d.day}
                              style={[
                                styles.thCell,
                                styles.dayThCell,
                                { backgroundColor: isToday ? '#6366F1' : colors.surfaceVariant, borderColor: isToday ? '#6366F1' : colors.borderSubtle },
                              ]}
                            >
                              <Text style={[styles.thText, { color: isToday ? '#FFFFFF' : colors.text }]}>
                                {d.label}{isToday ? ' ★' : ''}
                              </Text>
                            </View>
                          );
                        })}
                      </View>

                      {/* Table Body Rows */}
                      <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                        {sortedPeriods.map(period => (
                          <View key={period.id} style={styles.tableDataRow}>
                            {/* Time column */}
                            <View style={[styles.tdCell, styles.timeTdCell, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}>
                              {showTime ? (
                                <>
                                  <Text style={[styles.timeCellText, { color: colors.text }]}>{period.startTime}</Text>
                                  <Text style={[styles.timeCellSubText, { color: colors.textSecondary }]}>{period.endTime}</Text>
                                </>
                              ) : (
                                <Text style={[styles.timeCellText, { color: colors.text }]}>{period.label || `P${period.id}`}</Text>
                              )}
                            </View>

                            {/* Day columns */}
                            {weekDays.map(d => {
                              const isToday = d.day === todayWeekday;
                              const entry = entries.find(e => e.weekday === d.day && e.periodId === period.id);
                              const subject = entry ? subjects.find(s => s.id === entry.subjectId) : null;
                              const att = isToday && entry ? getAttendanceInfo(period.id, subject?.id) : null;

                              return (
                                <View
                                  key={d.day}
                                  style={[
                                    styles.tdCell,
                                    styles.dayTdCell,
                                    {
                                      backgroundColor: isToday ? (subject ? '#EEF2FF' : colors.surfaceVariant) : (subject ? colors.card : colors.surface),
                                      borderColor: isToday ? '#818CF8' : colors.borderSubtle,
                                    },
                                  ]}
                                >
                                  {subject ? (
                                    <>
                                      <Text
                                        style={[
                                          styles.tableSubjectText,
                                          { color: isToday ? '#4338CA' : colors.text },
                                        ]}
                                        numberOfLines={1}
                                      >
                                        {getSubjectDisplayName(subject)}
                                      </Text>
                                      {showRoom && (entry?.roomOverride || subject.room) ? (
                                        <Text style={[styles.tableRoomText, { color: colors.textTertiary }]} numberOfLines={1}>
                                          {entry?.roomOverride || subject.room}
                                        </Text>
                                      ) : null}
                                      {showTeacher && (entry?.teacher || subject.teacher) ? (
                                        <Text style={[styles.tableRoomText, { color: colors.textTertiary }]} numberOfLines={1}>
                                          {entry?.teacher || subject.teacher}
                                        </Text>
                                      ) : null}
                                      {showAttendance && att && att.status !== 'unmarked' ? (
                                        <View style={[styles.tableAttPill, { backgroundColor: att.bg }]}>
                                          <Text style={[styles.tableAttText, { color: att.color }]}>
                                            {att.status === 'present' ? '✓' : att.status === 'absent' ? '✗' : 'OFF'}
                                          </Text>
                                        </View>
                                      ) : null}
                                    </>
                                  ) : (
                                    <Text style={[styles.tableEmptyText, { color: colors.textTertiary }]}>—</Text>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </ScrollView>
                  <Text style={[styles.scrollHintText, { color: colors.textTertiary, marginTop: 6 }]}>
                    ⇄ Scroll horizontally & vertically to explore full weekly schedule table
                  </Text>
                </View>
              )}

              {/* 5. Today's Schedule Deck (Separated Individual Cards) */}
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

                  {todayEntries.length > 0 ? (
                    <View>
                      <ScrollView
                        style={{ maxHeight: 280 }}
                        contentContainerStyle={styles.itemsListContainer}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {todayEntries.map((item, idx) => {
                          const [startH, startM] = (item.period?.startTime || '00:00').split(':').map(Number);
                          const [endH, endM] = (item.period?.endTime || '00:00').split(':').map(Number);
                          const sMins = startH * 60 + startM;
                          const eMins = endH * 60 + endM;
                          let statusText = 'UPCOMING';
                          let statusBg = '#EEF2FF';
                          let statusColor = '#4F46E5';

                          if (currentMins >= sMins && currentMins <= eMins) {
                            statusText = `IN SESSION (${eMins - currentMins}m)`;
                            statusBg = '#DCFCE7';
                            statusColor = '#16A34A';
                          } else if (currentMins > eMins) {
                            statusText = 'DONE ✓';
                            statusBg = '#F1F5F9';
                            statusColor = '#64748B';
                          }

                          const att = getAttendanceInfo(item.entry.periodId, item.entry.subjectId);

                          const roomVal = showRoom ? (item.entry.roomOverride || item.subject?.room) : null;
                          const teacherVal = showTeacher ? (item.entry.teacher || item.subject?.teacher) : null;
                          const metaParts = [];
                          if (roomVal) metaParts.push(`📍 ${roomVal}`);
                          if (teacherVal) metaParts.push(`👤 ${teacherVal}`);

                          return (
                            <View
                              key={item.entry.id || idx}
                              style={[styles.classItemCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}
                            >
                              <View style={[styles.cardAccentBar, { backgroundColor: '#6366F1' }]} />
                              <View style={{ flex: 1 }}>
                                <View style={styles.cardHeaderRow}>
                                  {showTime ? (
                                    <View style={[styles.timeBadge, { backgroundColor: '#312E81' }]}>
                                      <Text style={styles.timeBadgeText}>
                                        ⏰ {formatTimeRange(item.period?.startTime || '00:00', item.period?.endTime || '00:00', settings.timeFormat || '12h')}
                                      </Text>
                                    </View>
                                  ) : null}
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: showTime ? 0 : 'auto' }}>
                                    {showAttendance ? (
                                      <View style={[styles.attendanceBadge, { backgroundColor: att.bg }]}>
                                        <Text style={[styles.attendanceBadgeText, { color: att.color }]}>{att.label}</Text>
                                      </View>
                                    ) : null}
                                    {showPeriod ? (
                                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                                          {item.period?.label ? `${item.period.label} • ${statusText}` : statusText}
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>
                                </View>
                                <Text style={[styles.cardSubjectTitle, { color: colors.text }]} numberOfLines={1}>
                                  {getSubjectDisplayName(item.subject)}
                                </Text>
                                {metaParts.length > 0 ? (
                                  <Text style={[styles.cardMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {metaParts.join('  •  ')}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          );
                        })}
                      </ScrollView>
                      {todayEntries.length > 3 && (
                        <Text style={[styles.scrollHintText, { color: colors.textTertiary }]}>
                          ⇅ Scroll to view all {todayEntries.length} today lectures
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyCardBox}>
                      <Ionicons name="cafe" size={32} color="#6366F1" />
                      <Text style={[styles.emptyCardTitle, { color: colors.text }]}>No Classes Scheduled Today ☕</Text>
                      <Text style={[styles.emptyCardSub, { color: colors.textSecondary }]}>
                        Enjoy your day off! Relax, recharge, or catch up on studies.
                      </Text>
                    </View>
                  )}
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
  customizationCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  customizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    justifyContent: 'space-between',
  },
  customizationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizationTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  customizationSub: {
    fontSize: 11,
    marginTop: 2,
  },
  customizationBody: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleDesc: {
    fontSize: 10,
    marginTop: 2,
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
  itemsListContainer: {
    gap: 8,
    marginTop: 4,
  },
  classItemCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    overflow: 'hidden',
  },
  cardAccentBar: {
    width: 4,
    borderRadius: 2,
    marginRight: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E0E7FF',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cardSubjectTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  cardMetaText: {
    fontSize: 11,
    marginTop: 2,
  },
  moreText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyCardBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyCardSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  weeklyGridContainer: {
    gap: 6,
    marginTop: 4,
  },
  weeklyDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  weeklyDayPill: {
    width: 52,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyDayPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  weeklyDaySubjectsText: {
    fontSize: 11,
  },
  weeklyCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  weeklyCountText: {
    fontSize: 10,
    fontWeight: '800',
  },
  attendanceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  attendanceBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  scrollHintText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  tableWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
  },
  thCell: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeThCell: {
    width: 68,
  },
  dayThCell: {
    width: 76,
  },
  thText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableDataRow: {
    flexDirection: 'row',
  },
  tdCell: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  timeTdCell: {
    width: 68,
  },
  dayTdCell: {
    width: 76,
  },
  timeCellText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeCellSubText: {
    fontSize: 9,
    marginTop: 1,
  },
  tableSubjectText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  tableRoomText: {
    fontSize: 8,
    marginTop: 1,
    textAlign: 'center',
  },
  tableAttPill: {
    marginTop: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tableAttText: {
    fontSize: 8,
    fontWeight: '900',
  },
  tableEmptyText: {
    fontSize: 12,
  },
});
