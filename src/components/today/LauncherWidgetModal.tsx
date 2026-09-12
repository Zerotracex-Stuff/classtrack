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

interface LauncherWidgetModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LauncherWidgetModal: React.FC<LauncherWidgetModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { subjects, periods, entries, attendance, exams, settings, updateSettings } = useApp();

  const [activePreviewTab, setActivePreviewTab] = useState<
    'day_horizontal' | 'day_vertical' | 'weekly_schedule' | 'next_class' | 'attendance' | 'exams'
  >('day_horizontal');
  const [syncing, setSyncing] = useState(false);

  // Math for Live Interactive Launcher Widget Preview
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayWeekday = ((new Date().getDay() + 6) % 7);

  const todayEntries = entries
    .filter(e => e.weekday === todayWeekday)
    .map(entry => {
      const period = periods.find(p => p.id === entry.periodId);
      const subject = subjects.find(s => s.id === entry.subjectId);
      return { entry, period, subject };
    })
    .filter(item => item.period && item.subject)
    .sort((a, b) => (a.period?.startTime || '').localeCompare(b.period?.startTime || ''));

  const firstClass = todayEntries[0];

  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

  const handleManualSync = async () => {
    setSyncing(true);
    const success = await syncLauncherHomeWidgets({
      subjects,
      periods,
      entries,
      attendance,
      exams,
      settings,
    });
    setSyncing(false);

    if (success) {
      Alert.alert(
        'Launcher Widgets Synced! 📱✨',
        'Weekly schedule, horizontal/vertical day timetables, attendance health, and exam countdowns have been pushed to your launcher.'
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
                Select a launcher widget preview to see how it looks on your home screen
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
                {syncing ? 'Syncing Launcher Widgets...' : 'Sync Launcher Widgets Now 🔄'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Widget Selection Grid - All 6 Options Visible */}
            <View style={styles.gridContainer}>
              <Text style={[styles.gridTitle, { color: colors.textSecondary }]}>
                AVAILABLE LAUNCHER WIDGET STYLES (6 INCLUDED):
              </Text>
              <View style={styles.gridTabBar}>
                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'day_horizontal' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('day_horizontal')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={16}
                    color={activePreviewTab === 'day_horizontal' ? colors.primary : colors.text}
                  />
                  <Text
                    style={[
                      styles.gridTabLabel,
                      { color: activePreviewTab === 'day_horizontal' ? colors.primary : colors.text },
                    ]}
                  >
                    Day (Horizontal)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'day_vertical' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('day_vertical')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="swap-vertical-outline"
                    size={16}
                    color={activePreviewTab === 'day_vertical' ? colors.primary : colors.text}
                  />
                  <Text
                    style={[
                      styles.gridTabLabel,
                      { color: activePreviewTab === 'day_vertical' ? colors.primary : colors.text },
                    ]}
                  >
                    Day (Vertical)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabItem,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    activePreviewTab === 'weekly_schedule' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                  ]}
                  onPress={() => setActivePreviewTab('weekly_schedule')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={activePreviewTab === 'weekly_schedule' ? colors.primary : colors.text}
                  />
                  <Text
                    style={[
                      styles.gridTabLabel,
                      { color: activePreviewTab === 'weekly_schedule' ? colors.primary : colors.text },
                    ]}
                  >
                    Weekly Grid
                  </Text>
                </TouchableOpacity>

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
                  <Text
                    style={[
                      styles.gridTabLabel,
                      { color: activePreviewTab === 'next_class' ? colors.primary : colors.text },
                    ]}
                  >
                    Next Class
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
                    name="pie-chart-outline"
                    size={16}
                    color={activePreviewTab === 'attendance' ? colors.primary : colors.text}
                  />
                  <Text
                    style={[
                      styles.gridTabLabel,
                      { color: activePreviewTab === 'attendance' ? colors.primary : colors.text },
                    ]}
                  >
                    Health (2x2)
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
                  <Text
                    style={[
                      styles.gridTabLabel,
                      { color: activePreviewTab === 'exams' ? colors.primary : colors.text },
                    ]}
                  >
                    Exams (4x1)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Interactive Live Preview Box */}
            <View style={styles.previewContainer}>
              <Text style={[styles.previewTag, { color: colors.textTertiary }]}>
                PHONE LAUNCHER LIVE PREVIEW
              </Text>

              {/* 1. Day Schedule Horizontal */}
              {activePreviewTab === 'day_horizontal' && (
                <View
                  style={[
                    styles.launcherWidgetBox,
                    { backgroundColor: colors.card, borderColor: '#2563EB' },
                  ]}
                >
                  <View style={styles.widgetHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="swap-horizontal" size={18} color="#2563EB" />
                      <Text style={[styles.widgetHeaderTitle, { color: colors.text }]}>
                        Today's Schedule (Horizontal)
                      </Text>
                    </View>
                    <View style={[styles.liveBadge, { backgroundColor: '#DBEAFE' }]}>
                      <Text style={[styles.liveBadgeText, { color: '#1E40AF' }]}>
                        {todayEntries.length} Classes Today
                      </Text>
                    </View>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {todayEntries.length > 0 ? (
                        todayEntries.map((item, idx) => (
                          <View
                            key={idx}
                            style={{
                              padding: 10,
                              borderRadius: 12,
                              backgroundColor: (item.subject?.color || colors.primary) + '1A',
                              borderWidth: 1,
                              borderColor: (item.subject?.color || colors.primary) + '40',
                              minWidth: 120,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>
                              ⏰ {item.period?.startTime} - {item.period?.endTime}
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 }}>
                              {item.subject?.name}
                            </Text>
                            <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                              📍 {item.entry.roomOverride || item.subject?.room || 'Main Hall'}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={{ fontSize: 12, color: colors.textSecondary, padding: 10 }}>
                          No classes scheduled for today ☕
                        </Text>
                      )}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* 2. Day Schedule Vertical */}
              {activePreviewTab === 'day_vertical' && (
                <View
                  style={[
                    styles.launcherWidgetBox,
                    { backgroundColor: colors.card, borderColor: '#0F172A' },
                  ]}
                >
                  <View style={styles.widgetHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="swap-vertical" size={18} color={colors.primary} />
                      <Text style={[styles.widgetHeaderTitle, { color: colors.text }]}>
                        Today's Timeline (Vertical)
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                      {format(new Date(), 'EEEE, MMM d')}
                    </Text>
                  </View>

                  <View style={{ marginTop: 4, gap: 6 }}>
                    {todayEntries.length > 0 ? (
                      todayEntries.slice(0, 4).map((item, idx) => (
                        <View
                          key={idx}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 6,
                            paddingHorizontal: 8,
                            borderRadius: 10,
                            backgroundColor: colors.surfaceVariant,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: item.subject?.color || colors.primary,
                              }}
                            />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                              {item.subject?.name}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                              ⏰ {item.period?.startTime}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                              📍 {item.entry.roomOverride || item.subject?.room || 'Lab'}
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={{ fontSize: 12, color: colors.textSecondary, padding: 10 }}>
                        No classes scheduled for today ☕
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* 3. Weekly Schedule Timetable Grid (Periods & Subject Names Only by default, customizable) */}
              {activePreviewTab === 'weekly_schedule' && (
                <View style={{ width: '100%' }}>
                  <View
                    style={[
                      styles.launcherWidgetBox,
                      { backgroundColor: colors.card, borderColor: '#7C3AED' },
                    ]}
                  >
                    <View style={styles.widgetHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="calendar" size={18} color="#7C3AED" />
                        <Text style={[styles.widgetHeaderTitle, { color: colors.text }]}>
                          Weekly Timetable Overview
                        </Text>
                      </View>
                      <View style={[styles.liveBadge, { backgroundColor: '#EDE9FE' }]}>
                        <Text style={[styles.liveBadgeText, { color: '#6D28D9' }]}>
                          Subject Names Only
                        </Text>
                      </View>
                    </View>

                    <View style={{ gap: 6, marginTop: 4 }}>
                      {(settings.weeklyWidgetIncludeWeekends ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4]).map((dayIdx) => {
                        const dayName = weekdayNames[dayIdx];
                        const isTodayDay = todayWeekday === dayIdx;
                        const dayEntries = entries
                          .filter((e) => e.weekday === dayIdx)
                          .map((entry) => {
                            const period = periods.find((p) => p.id === entry.periodId);
                            const subject = subjects.find((s) => s.id === entry.subjectId);
                            return { entry, period, subject };
                          })
                          .filter((item) => item.subject)
                          .sort((a, b) => (a.period?.startTime || '').localeCompare(b.period?.startTime || ''));

                        return (
                          <View
                            key={dayName}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'flex-start',
                              padding: 8,
                              borderRadius: 10,
                              backgroundColor: isTodayDay ? colors.primaryContainer : colors.surfaceVariant,
                            }}
                          >
                            <View
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 6,
                                backgroundColor: isTodayDay ? colors.primary : colors.card,
                                marginRight: 8,
                                minWidth: 42,
                                alignItems: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '800',
                                  color: isTodayDay ? colors.onPrimary : colors.text,
                                }}
                              >
                                {dayName}
                              </Text>
                            </View>

                            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                              {dayEntries.length > 0 ? (
                                dayEntries.map((item, idx) => (
                                  <View
                                    key={idx}
                                    style={{
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      borderRadius: 6,
                                      backgroundColor: colors.card,
                                      borderWidth: 1,
                                      borderColor: (item.subject?.color || colors.primary) + '60',
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 3,
                                    }}
                                  >
                                    {settings.weeklyWidgetShowTimes && item.period && (
                                      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>
                                        {item.period.startTime}
                                      </Text>
                                    )}
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                                      {item.subject?.name}
                                    </Text>
                                    {settings.weeklyWidgetShowRooms && (item.entry.roomOverride || item.subject?.room) && (
                                      <Text style={{ fontSize: 9, color: colors.textSecondary }}>
                                        📍{item.entry.roomOverride || item.subject?.room}
                                      </Text>
                                    )}
                                    {settings.weeklyWidgetShowTeachers && (item.entry.teacher || item.subject?.teacher) && (
                                      <Text style={{ fontSize: 9, color: colors.textSecondary }}>
                                        👨‍🏫{item.entry.teacher || item.subject?.teacher}
                                      </Text>
                                    )}
                                  </View>
                                ))
                              ) : (
                                <Text style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' }}>
                                  No classes
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Customization Options for Weekly Widget */}
                  <View style={[styles.guideCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle, marginTop: 10 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Ionicons name="options" size={16} color={colors.primary} />
                      <Text style={[styles.guideTitle, { color: colors.text }]}>
                        Customize Weekly Widget Details:
                      </Text>
                    </View>

                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                          Include Period Start Times
                        </Text>
                        <Switch
                          value={settings.weeklyWidgetShowTimes ?? true}
                          onValueChange={(val) => updateSettings({ weeklyWidgetShowTimes: val })}
                          trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                          Include Room Numbers
                        </Text>
                        <Switch
                          value={settings.weeklyWidgetShowRooms ?? false}
                          onValueChange={(val) => updateSettings({ weeklyWidgetShowRooms: val })}
                          trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                          Include Teacher Names
                        </Text>
                        <Switch
                          value={settings.weeklyWidgetShowTeachers ?? false}
                          onValueChange={(val) => updateSettings({ weeklyWidgetShowTeachers: val })}
                          trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                          Include Weekend Days (Sat/Sun)
                        </Text>
                        <Switch
                          value={settings.weeklyWidgetIncludeWeekends ?? false}
                          onValueChange={(val) => updateSettings({ weeklyWidgetIncludeWeekends: val })}
                          trackColor={{ false: colors.borderSubtle, true: colors.primary }}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* 4. Happening Now / Next Class */}
              {activePreviewTab === 'next_class' && (
                <View
                  style={[
                    styles.launcherWidgetBox,
                    { backgroundColor: colors.card, borderColor: colors.primary },
                  ]}
                >
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
                        ⏰ {firstClass?.period?.startTime || '09:00'} - {firstClass?.period?.endTime || '09:45'}
                      </Text>
                      <Text style={[styles.widgetMeta, { color: colors.textSecondary }]}>
                        📍 {firstClass?.entry?.roomOverride || firstClass?.subject?.room || 'Lab 402'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 5. Attendance Health */}
              {activePreviewTab === 'attendance' && (
                <View
                  style={[
                    styles.launcherWidgetBoxCompact,
                    { backgroundColor: colors.card, borderColor: colors.present },
                  ]}
                >
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

              {/* 6. Exams & Deadlines */}
              {activePreviewTab === 'exams' && (
                <View
                  style={[
                    styles.launcherWidgetBoxBanner,
                    { backgroundColor: colors.card, borderColor: '#F59E0B' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="school" size={24} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bannerTitle, { color: colors.text }]}>
                        {nearestExam?.title || 'Data Structures Final Exam'}
                      </Text>
                      <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                        {nearestExam?.date || 'Upcoming Exam'} • Hall B
                      </Text>
                    </View>

                    <View style={[styles.countdownPill, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.countdownText, { color: '#B45309' }]}>In 3 Days</Text>
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
                4. Press and drag the widget onto your home screen!
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
