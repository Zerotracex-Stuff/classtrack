import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ACCENT_PALETTES } from '../theme/colors';
import { AccentColorKey, DayOfWeek, ThemeMode } from '../types';
import { exportAllData } from '../database/storage';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Paths, File } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { ShareScheduleModal } from '../components/timetable/ShareScheduleModal';
import { LauncherWidgetModal } from '../components/today/LauncherWidgetModal';
import { getScheduledNotificationCount, scheduleAllReminders } from '../services/notificationService';

interface FeatureItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  badge: string;
}

const APP_FEATURES: FeatureItem[] = [
  {
    icon: 'grid-outline',
    title: 'Dual Layout Timetable (Week Grid & Day Timeline)',
    description:
      'Effortlessly switch between an expansive multi-day matrix grid and a chronological day timeline with time gutters, recess breaks, and instant cell editing.',
    badge: 'Timetable',
  },
  {
    icon: 'card-outline',
    title: 'Tinder-Style Attendance Deck',
    description:
      'Mark your classes with intuitive physical gestures: Swipe Right for Present, Left for Absent, or Up for Cancelled/Not Held. Includes real-time tallies and full undo support.',
    badge: 'Attendance',
  },
  {
    icon: 'calculator-outline',
    title: 'Smart Bunk & Recovery Calculator',
    description:
      'Mathematically calculates how many classes you can safely bunk while staying above your target percentage, or how many consecutive classes you must attend to recover.',
    badge: 'Bunk Analytics',
  },
  {
    icon: 'time-outline',
    title: 'Subject History & Class Logs',
    description:
      'Tap any subject card to view all previous sessions with date, period, and teacher. Retroactively modify attendance status or manually log past classes.',
    badge: 'Records',
  },
  {
    icon: 'person-outline',
    title: 'Period-Specific Teacher Assignment',
    description:
      'Assign different teachers for specific periods of the same subject (e.g. lab instructors, guest faculty, or lecturers) for complete real-world accuracy.',
    badge: 'Timetable',
  },
  {
    icon: 'notifications-outline',
    title: 'Smart Pre & Post Class Reminders',
    description:
      'Receive timely 10-minute pre-class alerts with room and teacher details, and automatic post-class reminders if you forgot to mark attendance.',
    badge: 'Reminders',
  },
  {
    icon: 'school-outline',
    title: 'Exams Countdown & Vacation Holidays',
    description:
      'Track upcoming exam deadlines with live countdown badges (Today, Tomorrow, in X Days) and schedule vacation periods that pause attendance tracking.',
    badge: 'Exams',
  },
  {
    icon: 'folder-outline',
    title: 'Native File Backup & Instant Restore',
    description:
      'Export your full academic profile, timetable, and attendance history as a standard .json file, or restore existing backups across devices via system file picker.',
    badge: 'Storage',
  },
  {
    icon: 'color-palette-outline',
    title: 'Material Design 3 & Dynamic Theming',
    description:
      'Tailor your experience with true Dark and Light themes alongside 8 Material You accent color palettes (Indigo, Emerald, Sky, Violet, Coral, and more).',
    badge: 'Customization',
  },
  {
    icon: 'shield-checkmark-outline',
    title: '100% Offline & Private',
    description:
      'All your timetable entries, attendance records, and personal profile stay strictly on your device. Zero telemetry, zero tracking, and zero cloud dependency.',
    badge: 'Privacy',
  },
];

export const SettingsScreen: React.FC = () => {
  const { colors, themeMode, setThemeMode, accentColor, setAccentColor, isDark } = useTheme();
  const {
    settings,
    updateSettings,
    resetDatabase,
    importBackup,
    subjects,
    periods,
    entries,
    attendance,
    exams,
    holidays,
    sendTestAlert,
    scheduleDelayedTestAlert,
  } = useApp();

  const [studentName, setStudentName] = useState(settings.studentName || '');
  const [institution, setInstitution] = useState(settings.institution || '');
  const [grade, setGrade] = useState(settings.grade || '');
  const [department, setDepartment] = useState(settings.department || '');
  const [rollNumber, setRollNumber] = useState(settings.rollNumber || '');
  const [targetAtt, setTargetAtt] = useState(String(settings.targetAttendance || 75));
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [launcherModalVisible, setLauncherModalVisible] = useState(false);
  const [activeReminderCount, setActiveReminderCount] = useState<number>(0);

  React.useEffect(() => {
    (async () => {
      const cnt = await getScheduledNotificationCount();
      setActiveReminderCount(cnt);
    })();
  }, [periods, entries, subjects, attendance, holidays, settings]);

  const handleResyncReminders = async () => {
    try {
      const count = await scheduleAllReminders({
        periods,
        entries,
        subjects,
        attendance,
        holidays,
        settings,
      });
      const totalOsCount = await getScheduledNotificationCount();
      setActiveReminderCount(totalOsCount);
      Alert.alert(
        'Reminders Resynced! 🔔',
        `Successfully registered ${totalOsCount} active reminders with your phone OS background daemon!`
      );
    } catch (err: any) {
      Alert.alert('Resync Error', err?.message || 'Could not resync reminders.');
    }
  };

  const handleSaveProfile = async () => {
    await updateSettings({
      studentName: studentName.trim(),
      institution: institution.trim(),
      department: department.trim(),
      grade: grade.trim(),
      rollNumber: rollNumber.trim(),
    });
    Alert.alert('Profile Saved', 'Your student details have been updated.');
  };

  const handleExportFile = async () => {
    try {
      setIsExporting(true);
      const json = await exportAllData();
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `classtrack-backup-${dateStr}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Backup Exported', `Downloaded ${fileName}`);
      } else {
        const backupFile = new File(Paths.document, fileName);
        backupFile.create({ overwrite: true });
        backupFile.write(json);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(backupFile.uri, {
            mimeType: 'application/json',
            dialogTitle: 'Save or Share ClassTrack Backup File',
            UTI: 'public.json',
          });
        } else {
          Alert.alert('Backup Exported', `Saved ${fileName} to documents folder.`);
        }
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async () => {
    try {
      setIsImporting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      let jsonContent = '';

      if (Platform.OS === 'web' && asset.file) {
        jsonContent = await asset.file.text();
      } else {
        const res = await fetch(asset.uri);
        jsonContent = await res.text();
      }

      if (!jsonContent || !jsonContent.trim()) {
        throw new Error('Selected backup file is empty.');
      }

      await importBackup(jsonContent.trim());
      Alert.alert('Backup Restored', `Successfully imported all data from "${asset.name}"!`);
    } catch (err: any) {
      Alert.alert('Import Failed', err?.message || 'Invalid or unreadable backup JSON file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to wipe all data and reset to defaults?')) {
        resetDatabase();
      }
    } else {
      Alert.alert(
        'Reset Database',
        'Are you sure you want to wipe all custom data and restore initial sample data?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Wipe & Reset',
            style: 'destructive',
            onPress: () => resetDatabase(),
          },
        ]
      );
    }
  };

  const handleTestAlert = async () => {
    try {
      setTestingAlert(true);
      const id = await sendTestAlert();
      Alert.alert('Alert Sent 🔔', `Test notification queued (ID: ${id || 'ok'}).\nCheck your notification drawer in 1 second!`);
    } catch (err: any) {
      Alert.alert('Notification Error', err?.message || 'Could not send test notification. Please verify notification permissions in Android Settings.');
    } finally {
      setTestingAlert(false);
    }
  };

  const handle1MinTestAlert = async () => {
    try {
      setTestingAlert(true);
      const id = await scheduleDelayedTestAlert(60);
      Alert.alert(
        '⏱️ Test Scheduled in 60 Seconds',
        `Notification scheduled for 1 minute from now! (Ref: ${id || 'registered'})\n\n👉 Important Android Notes:\n1. If battery optimization or Doze is on, Android can delay background alarms.\n2. Ensure "Alarms & Reminders" is allowed for ClassTrack in Settings.\n3. Now you can remove the app from recent apps. Wait 60-90s for Android to deliver it.`,
        [{ text: 'Got it!' }]
      );
    } catch (err: any) {
      Alert.alert('Notification Error', err?.message || 'Could not schedule test alert. Please verify notification permissions.');
    } finally {
      setTestingAlert(false);
    }
  };

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Settings & More" subtitle="Customize ClassTrack to your rhythm" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Phone Launcher Widgets Setup Card */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.onPrimaryContainer, marginBottom: 0 }]}>
                  Phone Launcher Widgets 📱
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.onPrimaryContainer, lineHeight: 17 }}>
                Keep your live schedule, attendance percentage, and exam countdowns directly on your phone's home screen.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.tourBtn, { backgroundColor: colors.primary }]}
              onPress={() => setLauncherModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="options-outline" size={16} color={colors.onPrimary} />
              <Text style={[styles.tourBtnText, { color: colors.onPrimary }]}>Setup</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Profile Card */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Student Profile</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>FULL NAME</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
            ]}
            value={studentName}
            onChangeText={setStudentName}
            placeholder="Student Name"
            placeholderTextColor={colors.textTertiary}
          />

          <View style={styles.twoCols}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                COLLEGE / SCHOOL
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                ]}
                value={institution}
                onChangeText={setInstitution}
                placeholder="Institution"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                DEPARTMENT / MAJOR
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                ]}
                value={department}
                onChangeText={setDepartment}
                placeholder="e.g. CSE / Mech"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.twoCols}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                GRADE / SEMESTER
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                ]}
                value={grade}
                onChangeText={setGrade}
                placeholder="e.g. Sem 4"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                ROLL / REGISTRATION NO.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                ]}
                value={rollNumber}
                onChangeText={setRollNumber}
                placeholder="e.g. 2024-042"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveProfileBtn, { backgroundColor: colors.primary }]}
            onPress={handleSaveProfile}
          >
            <Text style={[styles.saveProfileText, { color: colors.onPrimary }]}>
              Update Profile
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Setup & Onboarding Wizard */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Setup & Onboarding</Text>
            <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.fieldSubtitle, { color: colors.textSecondary }]}>
            Review or update all onboarding details, routine days, attendance target, and preferences with the multi-step wizard.
          </Text>

          <TouchableOpacity
            style={[styles.wizardBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}
            onPress={() => updateSettings({ onboarded: false })}
            activeOpacity={0.7}
          >
            <Ionicons name="compass-outline" size={18} color={colors.primary} />
            <Text style={[styles.wizardBtnText, { color: colors.text }]}>
              Re-launch Onboarding Wizard
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Appearance & Theming */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance & Theme</Text>

          {/* Theme Mode Selector */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>THEME MODE</Text>
          <View style={[styles.themeRow, { backgroundColor: colors.surfaceVariant }]}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map(mode => {
              const isActive = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeOption,
                    isActive && {
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                    },
                  ]}
                  onPress={() => setThemeMode(mode)}
                >
                  <Ionicons
                    name={
                      mode === 'light'
                        ? 'sunny-outline'
                        : mode === 'dark'
                        ? 'moon-outline'
                        : 'phone-portrait-outline'
                    }
                    size={16}
                    color={isActive ? colors.onPrimary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeText,
                      { color: isActive ? colors.onPrimary : colors.textSecondary },
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Material Accent Palettes */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
            MATERIAL YOU ACCENT COLOR
          </Text>
          <View style={styles.accentGrid}>
            {(Object.keys(ACCENT_PALETTES) as AccentColorKey[]).map(key => {
              const pal = ACCENT_PALETTES[key];
              const isSelected = accentColor === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.accentChip,
                    {
                      backgroundColor: isSelected ? colors.primaryContainer : colors.surfaceVariant,
                      borderColor: isSelected ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => setAccentColor(key)}
                >
                  <View style={[styles.accentDot, { backgroundColor: pal.light.primary }]} />
                  <Text
                    style={[
                      styles.accentName,
                      {
                        color: isSelected ? colors.onPrimaryContainer : colors.text,
                        fontWeight: isSelected ? '800' : '500',
                      },
                    ]}
                  >
                    {pal.name.split(' ')[1] || pal.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Attendance Target */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Attendance Target</Text>
          <Text style={[styles.fieldSubtitle, { color: colors.textSecondary }]}>
            Minimum attendance required by your university/school.
          </Text>

          <View style={styles.targetRow}>
            {[65, 70, 75, 80, 85, 90].map(val => {
              const isSelected = settings.targetAttendance === val;
              return (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.targetPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                      borderColor: isSelected ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => updateSettings({ targetAttendance: val })}
                >
                  <Text
                    style={[
                      styles.targetPillText,
                      {
                        color: isSelected ? colors.onPrimary : colors.text,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {val}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Working Days Config */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Working Days</Text>
          <Text style={[styles.fieldSubtitle, { color: colors.textSecondary }]}>
            Toggle working days included in your weekly schedule.
          </Text>

          <View style={styles.daysRow}>
            {DAY_LABELS.map((label, idx) => {
              const d = idx as DayOfWeek;
              const isIncluded = settings.workingDays.includes(d);
              return (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: isIncluded ? colors.primary : colors.surfaceVariant,
                      borderColor: isIncluded ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => {
                    if (isIncluded) {
                      if (settings.workingDays.length > 1) {
                        updateSettings({
                          workingDays: settings.workingDays.filter((day: DayOfWeek) => day !== d),
                        });
                      }
                    } else {
                      updateSettings({
                        workingDays: [...settings.workingDays, d].sort(),
                      });
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.dayPillText,
                      {
                        color: isIncluded ? colors.onPrimary : colors.text,
                        fontWeight: isIncluded ? '800' : '600',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Notifications & Reminders */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Notifications & Reminders</Text>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.fieldSubtitle, { color: colors.textSecondary }]}>
            Never miss a class or forget to mark your daily attendance.
          </Text>

          {/* Toggle 1: 10 mins before class */}
          <View style={[styles.toggleRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>10-Min Pre-Class Alert</Text>
              <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                Get an alert with subject, room, and teacher 10 minutes before every class starts.
              </Text>
            </View>
            <Switch
              value={settings.notifyBeforeClass ?? true}
              onValueChange={val => updateSettings({ notifyBeforeClass: val })}
              trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
              thumbColor={colors.onPrimary}
            />
          </View>

          {/* Toggle 2: Unmarked attendance reminder */}
          <View style={[styles.toggleRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>Unmarked Attendance Alert</Text>
              <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                Get a reminder 5 minutes after class ends if you forgot to mark attendance.
              </Text>
            </View>
            <Switch
              value={settings.notifyUnmarkedAttendance ?? true}
              onValueChange={val => updateSettings({ notifyUnmarkedAttendance: val })}
              trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
              thumbColor={colors.onPrimary}
            />
          </View>

          {/* OS Daemon Scheduled Status Badge */}
          <View style={[styles.privacyRow, { backgroundColor: colors.primaryContainer + '60', borderColor: colors.primary, marginTop: 12 }]}>
            <Ionicons name="notifications-circle" size={20} color={colors.primary} />
            <Text style={[styles.privacyText, { color: colors.text, flex: 1 }]}>
              <Text style={{ fontWeight: '800' }}>{activeReminderCount}</Text> active class & attendance reminders registered in OS background daemon.
            </Text>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.backupButtonsRow}>
            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary, borderWidth: 1 }]}
              onPress={handleTestAlert}
              disabled={testingAlert}
              activeOpacity={0.7}
            >
              <Ionicons name="paper-plane-outline" size={16} color={colors.primary} />
              <Text style={[styles.backupBtnText, { color: colors.primary }]}>
                {testingAlert ? 'Sending...' : 'Instant Test (1s)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B', borderWidth: 1, marginLeft: 10 }]}
              onPress={handle1MinTestAlert}
              disabled={testingAlert}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={16} color="#D97706" />
              <Text style={[styles.backupBtnText, { color: '#D97706' }]}>
                Test in 1 Min ⏱️
              </Text>
            </TouchableOpacity>
          </View>

          {/* Resync Reminders */}
          <TouchableOpacity
            style={[styles.backupBtn, { backgroundColor: colors.surfaceVariant, marginTop: 10, width: '100%' }]}
            onPress={handleResyncReminders}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
            <Text style={[styles.backupBtnText, { color: colors.primary }]}>
              Resync All Timetable Reminders (Next 14 Days)
            </Text>
          </TouchableOpacity>
        </Card>

        {/* File Backup & Restore */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>File Backup & Restore</Text>
            <Ionicons name="folder-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.fieldSubtitle, { color: colors.textSecondary }]}>
            Export your entire schedule, subjects, attendance logs, and exams into a JSON file, or restore from a previously saved file.
          </Text>

          <View style={styles.backupButtonsRow}>
            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: colors.surfaceVariant }]}
              onPress={handleExportFile}
              disabled={isExporting}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={18} color={colors.primary} />
              <Text style={[styles.backupBtnText, { color: colors.primary }]}>
                {isExporting ? 'Exporting...' : 'Export File (.json)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: colors.surfaceVariant, marginLeft: 10 }]}
              onPress={handleImportFile}
              disabled={isImporting}
              activeOpacity={0.7}
            >
              <Ionicons name="document-attach-outline" size={18} color={colors.secondary} />
              <Text style={[styles.backupBtnText, { color: colors.secondary }]}>
                {isImporting ? 'Importing...' : 'Import File (.json)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Share with Classmates QR button */}
          <TouchableOpacity
            style={[styles.testAlertBtn, { backgroundColor: colors.primaryContainer, borderColor: colors.primary, marginTop: 10 }]}
            onPress={() => setShareModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
            <Text style={[styles.testAlertBtnText, { color: colors.primary, fontWeight: '700' }]}>
              Share Schedule via QR Code / File
            </Text>
          </TouchableOpacity>

          {/* Reset Database */}
          <TouchableOpacity
            style={[styles.resetBtn, { backgroundColor: colors.absentBg }]}
            onPress={handleReset}
          >
            <Ionicons name="alert-circle-outline" size={18} color={colors.absent} />
            <Text style={[styles.resetText, { color: colors.absent }]}>
              Wipe Data & Reset to Defaults
            </Text>
          </TouchableOpacity>
        </Card>

        {/* About ClassTrack & Created by ZTX */}
        <Card
          style={[
            styles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.aboutHeaderRow}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.aboutIconImage}
              resizeMode="cover"
            />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <View style={styles.appNameRow}>
                <Text style={[styles.aboutAppTitle, { color: colors.text }]}>ClassTrack</Text>
                <View style={[styles.versionPill, { backgroundColor: colors.primaryContainer }]}>
                  <Text style={[styles.versionPillText, { color: colors.onPrimaryContainer }]}>
                    v1.0.0
                  </Text>
                </View>
              </View>
              <Text style={[styles.aboutAppTagline, { color: colors.textSecondary }]}>
                Offline-First Academic Companion
              </Text>
            </View>
          </View>

          {/* Created by ZTX Highlight Banner */}
          <View
            style={[
              styles.creatorBanner,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.creatorHeader}>
              <View style={[styles.ztxBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.ztxBadgeText, { color: colors.onPrimary }]}>ZTX</Text>
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.creatorTitle, { color: colors.text }]}>Created by ZTX</Text>
                <Text style={[styles.creatorSubtitle, { color: colors.primary }]}>
                  Lead Developer & Architect
                </Text>
              </View>
            </View>
            <Text style={[styles.creatorBio, { color: colors.textSecondary }]}>
              ClassTrack was engineered by ZTX to empower students and teachers with an elegant, ultra-responsive routine companion featuring gesture-driven attendance, smart bunk recovery calculations, and absolute data privacy.
            </Text>
          </View>

          {/* Privacy & Offline Guarantee */}
          <View style={[styles.privacyRow, { backgroundColor: colors.presentBg, borderColor: colors.present + '30' }]}>
            <Ionicons name="shield-checkmark" size={18} color={colors.present} />
            <Text style={[styles.privacyText, { color: colors.present }]}>
              100% Offline • Zero Tracking • Local Storage
            </Text>
          </View>
        </Card>

        {/* Features Overview */}
        <Card
          style={[
            styles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
              Features Overview
            </Text>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.fieldSubtitle, { color: colors.textSecondary }]}>
            Explore the complete suite of capabilities built into ClassTrack.
          </Text>

          <View style={styles.featuresList}>
            {APP_FEATURES.map((feat, idx) => (
              <View
                key={feat.title}
                style={[
                  styles.featureRow,
                  idx !== APP_FEATURES.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.borderSubtle,
                  },
                ]}
              >
                <View style={[styles.featureIconBox, { backgroundColor: colors.primaryContainer }]}>
                  <Ionicons name={feat.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.featureTitleRow}>
                    <Text style={[styles.featureTitle, { color: colors.text }]}>
                      {feat.title}
                    </Text>
                  </View>
                  <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                    {feat.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Footer */}
        <View style={styles.aboutContainer}>
          <Text style={[styles.aboutTitle, { color: colors.text }]}>ClassTrack</Text>
          <Text style={[styles.aboutSubtitle, { color: colors.textTertiary }]}>
            Created by ZTX • All Rights Reserved
          </Text>
        </View>
      </ScrollView>

      <ShareScheduleModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
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
  tourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tourBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  fieldSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  twoCols: {
    flexDirection: 'row',
  },
  saveProfileBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    marginTop: 16,
  },
  saveProfileText: {
    fontSize: 14,
    fontWeight: '700',
  },
  wizardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  wizardBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  themeRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    marginTop: 4,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  themeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  accentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  accentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  accentName: {
    fontSize: 12,
  },
  targetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  targetPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  targetPillText: {
    fontSize: 13,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayPillText: {
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  toggleDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  testAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    gap: 8,
  },
  testAlertBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  backupButtonsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  backupBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14,
    gap: 6,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '700',
  },
  aboutContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  aboutSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  aboutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aboutIconImage: {
    width: 58,
    height: 58,
    borderRadius: 16,
  },
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aboutAppTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  versionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  aboutAppTagline: {
    fontSize: 13,
    marginTop: 2,
  },
  creatorBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  creatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ztxBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ztxBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  creatorTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  creatorSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  creatorBio: {
    fontSize: 12,
    lineHeight: 18,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  privacyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuresList: {
    marginTop: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
});
