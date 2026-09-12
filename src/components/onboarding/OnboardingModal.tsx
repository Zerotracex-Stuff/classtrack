import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { DayOfWeek, ThemeMode, AccentColorKey, Subject, Period } from '../../types';
import { ACCENT_PALETTES } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeRange } from '../../utils/timeUtils';

const PRESET_SUBJECT_SUGGESTIONS = [
  { name: 'Mathematics', code: 'MATH101', color: '#4F46E5', icon: 'calculator-outline' },
  { name: 'Computer Science', code: 'CS201', color: '#059669', icon: 'code-slash-outline' },
  { name: 'Physics', code: 'PHYS102', color: '#D97706', icon: 'flask-outline' },
  { name: 'Chemistry', code: 'CHEM103', color: '#7C3AED', icon: 'beaker-outline' },
  { name: 'English Literature', code: 'ENG101', color: '#E11D48', icon: 'book-outline' },
  { name: 'Economics', code: 'ECON202', color: '#0284C7', icon: 'briefcase-outline' },
];

export const OnboardingModal: React.FC = () => {
  const { colors, themeMode, setThemeMode, accentColor, setAccentColor } = useTheme();
  const {
    settings,
    updateSettings,
    subjects,
    periods,
    addSubject,
    addPeriod,
    saveEntry,
    getEntry,
  } = useApp();

  const [step, setStep] = useState(1);
  const [name, setName] = useState(settings.studentName || '');
  const [institution, setInstitution] = useState(settings.institution || '');
  const [department, setDepartment] = useState(settings.department || '');
  const [grade, setGrade] = useState(settings.grade || '');
  const [rollNumber, setRollNumber] = useState(settings.rollNumber || '');
  const [target, setTarget] = useState(settings.targetAttendance || 75);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(settings.timeFormat || '12h');
  const [density, setDensity] = useState<'cozy' | 'compact'>(settings.density || 'cozy');
  const [workingDays, setWorkingDays] = useState<DayOfWeek[]>(settings.workingDays || [0, 1, 2, 3, 4]);
  const [notifyBeforeClass, setNotifyBeforeClass] = useState<boolean>(settings.notifyBeforeClass ?? true);
  const [notifyUnmarked, setNotifyUnmarked] = useState<boolean>(settings.notifyUnmarkedAttendance ?? true);

  // Optional Onboarding Inputs
  // Period form
  const [newPeriodLabel, setNewPeriodLabel] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('09:00');
  const [newPeriodEnd, setNewPeriodEnd] = useState('09:45');
  const [newPeriodIsBreak, setNewPeriodIsBreak] = useState(false);

  // Subject form
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#4F46E5');

  // Assign timetable form
  const [assignDay, setAssignDay] = useState<DayOfWeek>(0);

  if (settings.onboarded) {
    return null;
  }

  const toggleDay = (day: DayOfWeek) => {
    if (workingDays.includes(day)) {
      if (workingDays.length > 1) {
        setWorkingDays(workingDays.filter(d => d !== day));
      }
    } else {
      setWorkingDays([...workingDays, day].sort());
    }
  };

  const handleAddPeriodQuick = async () => {
    if (!newPeriodStart.trim() || !newPeriodEnd.trim()) return;
    const label = newPeriodLabel.trim() || `Period ${periods.length + 1}`;
    await addPeriod({
      ord: periods.length + 1,
      label,
      startTime: newPeriodStart.trim(),
      endTime: newPeriodEnd.trim(),
      isBreak: newPeriodIsBreak,
    });
    setNewPeriodLabel('');
    setNewPeriodIsBreak(false);
  };

  const handleAddSubjectQuick = async (preset?: typeof PRESET_SUBJECT_SUGGESTIONS[0]) => {
    const subName = preset ? preset.name : newSubjectName.trim();
    const subCode = preset ? preset.code : newSubjectCode.trim();
    const subColor = preset ? preset.color : newSubjectColor;
    const subIcon = preset ? preset.icon : 'book-outline';

    if (!subName) return;

    await addSubject({
      name: subName,
      code: subCode || undefined,
      color: subColor,
      icon: subIcon,
    });

    setNewSubjectName('');
    setNewSubjectCode('');
  };

  const handleFinish = async () => {
    await updateSettings({
      studentName: name.trim() || 'Student',
      institution: institution.trim(),
      department: department.trim(),
      grade: grade.trim(),
      rollNumber: rollNumber.trim(),
      targetAttendance: target,
      workingDays,
      timeFormat,
      density,
      notifyBeforeClass,
      notifyUnmarkedAttendance: notifyUnmarked,
      onboarded: true,
    });
  };

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const TOTAL_STEPS = 6;

  return (
    <Modal visible={!settings.onboarded} animationType="fade" transparent={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Progress indicator */}
        <View style={styles.progressBarRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
            <View
              key={s}
              style={[
                styles.progressSegment,
                {
                  backgroundColor: s <= step ? colors.primary : colors.surfaceVariant,
                },
              ]}
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* STEP 1: Student Profile */}
          {step === 1 && (
            <View>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name="school" size={38} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Welcome to ClassTrack</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Your personal, offline-first timetable & smart attendance companion. Let's set up your profile.
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>FULL NAME *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                  ]}
                  placeholder="e.g. Alex Rivers"
                  placeholderTextColor={colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                />

                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>
                  COLLEGE / SCHOOL / UNIVERSITY
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                  ]}
                  placeholder="e.g. Faculty of Engineering & Technology"
                  placeholderTextColor={colors.textTertiary}
                  value={institution}
                  onChangeText={setInstitution}
                />

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>
                      DEPARTMENT / MAJOR
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                      ]}
                      placeholder="e.g. CSE / Mechanical"
                      placeholderTextColor={colors.textTertiary}
                      value={department}
                      onChangeText={setDepartment}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>
                      SEMESTER / YEAR
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                      ]}
                      placeholder="e.g. Sem 4 / Year 2"
                      placeholderTextColor={colors.textTertiary}
                      value={grade}
                      onChangeText={setGrade}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* STEP 2: Working Days & Preferences */}
          {step === 2 && (
            <View>
              <View style={[styles.iconCircle, { backgroundColor: colors.secondaryContainer }]}>
                <Ionicons name="calendar" size={38} color={colors.secondary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Academic Routine</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Configure your active class days and timetable layout density.
              </Text>

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
                ACTIVE WORKING DAYS
              </Text>
              <View style={styles.daysGrid}>
                {DAY_LABELS.map((label, idx) => {
                  const d = idx as DayOfWeek;
                  const isSelected = workingDays.includes(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.dayBox,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                          borderColor: isSelected ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => toggleDay(d)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayBoxText,
                          { color: isSelected ? colors.onPrimary : colors.text, fontWeight: isSelected ? '800' : '500' },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 22 }]}>
                TIME FORMAT PREFERENCE
              </Text>
              <View style={styles.choiceRow}>
                {(['12h', '24h'] as const).map(fmt => (
                  <TouchableOpacity
                    key={fmt}
                    style={[
                      styles.choiceBtn,
                      {
                        backgroundColor: timeFormat === fmt ? colors.primary : colors.surfaceVariant,
                        borderColor: timeFormat === fmt ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => setTimeFormat(fmt)}
                  >
                    <Text
                      style={[
                        styles.choiceBtnText,
                        { color: timeFormat === fmt ? colors.onPrimary : colors.text },
                      ]}
                    >
                      {fmt === '12h' ? '12-Hour (09:00 AM)' : '24-Hour (09:00)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 3: Period Timings (Optional) */}
          {step === 3 && (
            <View>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name="time-outline" size={38} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Create Periods <Text style={{ fontSize: 16, fontWeight: '400', color: colors.textSecondary }}>(Optional)</Text>
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Set up your daily period slots and break times. You can modify these anytime later.
              </Text>

              {/* Current Periods List */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  CURRENT PERIOD SLOTS ({periods.length})
                </Text>
                {periods.map((p, idx) => (
                  <View
                    key={p.id}
                    style={[
                      styles.periodRowCard,
                      { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <Text style={[styles.periodOrdText, { color: colors.primary }]}>#{idx + 1}</Text>
                    <Text style={[styles.periodLabelText, { color: colors.text }]}>{p.label}</Text>
                    <Text style={[styles.periodTimeText, { color: colors.textSecondary }]}>
                      {formatTimeRange(p.startTime, p.endTime, timeFormat)}
                    </Text>
                    {p.isBreak && (
                      <View style={[styles.breakTag, { backgroundColor: colors.primaryContainer }]}>
                        <Text style={[styles.breakTagText, { color: colors.onPrimaryContainer }]}>BREAK</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Quick Add Period Input */}
              <View style={[styles.quickAddBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.label, { color: colors.text }]}>+ ADD A PERIOD SLOT</Text>
                <View style={styles.rowInputs}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderSubtle }]}
                      placeholder="Slot Name (e.g. Period 1)"
                      placeholderTextColor={colors.textTertiary}
                      value={newPeriodLabel}
                      onChangeText={setNewPeriodLabel}
                    />
                  </View>
                  <View style={{ width: 80, marginRight: 6 }}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderSubtle }]}
                      placeholder="09:00"
                      placeholderTextColor={colors.textTertiary}
                      value={newPeriodStart}
                      onChangeText={setNewPeriodStart}
                    />
                  </View>
                  <View style={{ width: 80 }}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderSubtle }]}
                      placeholder="09:45"
                      placeholderTextColor={colors.textTertiary}
                      value={newPeriodEnd}
                      onChangeText={setNewPeriodEnd}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.addInlineBtn, { backgroundColor: colors.primary }]}
                  onPress={handleAddPeriodQuick}
                >
                  <Ionicons name="add" size={16} color={colors.onPrimary} />
                  <Text style={[styles.addInlineText, { color: colors.onPrimary }]}>Add Period Slot</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 4: Create Subjects (Optional) */}
          {step === 4 && (
            <View>
              <View style={[styles.iconCircle, { backgroundColor: colors.secondaryContainer }]}>
                <Ionicons name="book-outline" size={38} color={colors.secondary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Create Subjects <Text style={{ fontSize: 16, fontWeight: '400', color: colors.textSecondary }}>(Optional)</Text>
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Add your course subjects or tap quick suggestions to add in 1 tap.
              </Text>

              {/* Preset Quick Add Suggestions */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>1-TAP PRESET SUBJECTS</Text>
              <View style={styles.presetChipGrid}>
                {PRESET_SUBJECT_SUGGESTIONS.map(preset => (
                  <TouchableOpacity
                    key={preset.name}
                    style={[styles.presetSubChip, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => handleAddSubjectQuick(preset)}
                  >
                    <Ionicons name={preset.icon as any} size={14} color={preset.color} />
                    <Text style={[styles.presetSubText, { color: colors.text }]}>+ {preset.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Current Subjects List */}
              <View style={{ marginTop: 14, marginBottom: 14 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  ADDED SUBJECTS ({subjects.length})
                </Text>
                <View style={styles.subBadgeGrid}>
                  {subjects.map(s => (
                    <View
                      key={s.id}
                      style={[
                        styles.addedSubBadge,
                        { backgroundColor: s.color + '20', borderColor: s.color },
                      ]}
                    >
                      <Ionicons name={(s.icon as any) || 'book-outline'} size={14} color={s.color} />
                      <Text style={[styles.addedSubText, { color: colors.text }]}>{s.name}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Custom Subject Input */}
              <View style={[styles.quickAddBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.label, { color: colors.text }]}>+ CREATE CUSTOM SUBJECT</Text>
                <View style={styles.rowInputs}>
                  <View style={{ flex: 2, marginRight: 6 }}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderSubtle }]}
                      placeholder="Subject Name (e.g. Data Structures)"
                      placeholderTextColor={colors.textTertiary}
                      value={newSubjectName}
                      onChangeText={setNewSubjectName}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderSubtle }]}
                      placeholder="Code (e.g. CS201)"
                      placeholderTextColor={colors.textTertiary}
                      value={newSubjectCode}
                      onChangeText={setNewSubjectCode}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.addInlineBtn, { backgroundColor: colors.secondary, opacity: newSubjectName.trim() ? 1 : 0.6 }]}
                  onPress={() => handleAddSubjectQuick()}
                  disabled={!newSubjectName.trim()}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={[styles.addInlineText, { color: '#FFF' }]}>Add Subject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 5: Assign Timetable Slots (Optional) */}
          {step === 5 && (
            <View>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name="grid-outline" size={38} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Assign Timetable <Text style={{ fontSize: 16, fontWeight: '400', color: colors.textSecondary }}>(Optional)</Text>
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Assign your created subjects to daily period slots right now, or skip to assign later.
              </Text>

              {/* Day Selector */}
              <View style={styles.daySelectorRow}>
                {DAY_LABELS.slice(0, workingDays.length).map((lbl, idx) => {
                  const d = workingDays[idx] !== undefined ? workingDays[idx] : (idx as DayOfWeek);
                  const isSel = assignDay === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.daySelectorChip,
                        {
                          backgroundColor: isSel ? colors.primary : colors.surfaceVariant,
                          borderColor: isSel ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => setAssignDay(d)}
                    >
                      <Text
                        style={[
                          styles.daySelectorText,
                          { color: isSel ? colors.onPrimary : colors.text, fontWeight: isSel ? '700' : '500' },
                        ]}
                      >
                        {DAY_LABELS[d]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Periods List & Subject Selection */}
              <View style={{ marginTop: 10 }}>
                {periods.map(p => {
                  const existing = getEntry(assignDay, p.id);
                  const assignedSub = subjects.find(s => s.id === existing?.subjectId);

                  return (
                    <View
                      key={p.id}
                      style={[
                        styles.assignRowCard,
                        { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.assignPeriodLabel, { color: colors.text }]}>{p.label}</Text>
                        <Text style={[styles.assignPeriodTime, { color: colors.textSecondary }]}>
                          {formatTimeRange(p.startTime, p.endTime, timeFormat)}
                        </Text>
                      </View>

                      {/* Subject Picker Horizontal Scroll */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: 200 }}>
                        {subjects.map(s => {
                          const isAssigned = existing?.subjectId === s.id;
                          return (
                            <TouchableOpacity
                              key={s.id}
                              style={[
                                styles.assignSubPill,
                                {
                                  backgroundColor: isAssigned ? s.color : colors.surface,
                                  borderColor: isAssigned ? s.color : colors.borderSubtle,
                                },
                              ]}
                              onPress={() => {
                                saveEntry({
                                  weekday: assignDay,
                                  periodId: p.id,
                                  subjectId: isAssigned ? undefined : s.id,
                                });
                              }}
                            >
                              <Text
                                style={[
                                  styles.assignSubText,
                                  { color: isAssigned ? '#FFF' : colors.text, fontWeight: isAssigned ? '700' : '500' },
                                ]}
                              >
                                {s.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 6: Target, Reminders & Finish */}
          {step === 6 && (
            <View>
              <View style={[styles.iconCircle, { backgroundColor: colors.presentBg }]}>
                <Ionicons name="shield-checkmark" size={38} color={colors.present} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Target & Reminders</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Set your minimum attendance threshold and notification preferences.
              </Text>

              <View style={styles.targetContainer}>
                <Text style={[styles.targetDisplay, { color: colors.primary }]}>{target}%</Text>
                <Text style={[styles.targetHint, { color: colors.textSecondary }]}>Minimum Attendance Goal</Text>
                <View style={styles.stepperRow}>
                  {[65, 70, 75, 80, 85, 90].map(val => {
                    const isSelected = target === val;
                    return (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.stepperBtn,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                            borderColor: isSelected ? colors.primary : colors.borderSubtle,
                          },
                        ]}
                        onPress={() => setTarget(val)}
                      >
                        <Text
                          style={[
                            styles.stepperText,
                            { color: isSelected ? colors.onPrimary : colors.text, fontWeight: isSelected ? '800' : '600' },
                          ]}
                        >
                          {val}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Reminders Toggles */}
              <View style={[styles.toggleCard, { backgroundColor: colors.surfaceVariant }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.toggleTitle, { color: colors.text }]}>🔔 10-Min Pre-Class Alert</Text>
                  <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
                    Receive room & teacher notifications 10 minutes before class starts.
                  </Text>
                </View>
                <Switch
                  value={notifyBeforeClass}
                  onValueChange={setNotifyBeforeClass}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.onPrimary}
                />
              </View>

              {/* Accent Color Swatches */}
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 18 }]}>
                ACCENT COLOR
              </Text>
              <View style={styles.swatchRow}>
                {(Object.keys(ACCENT_PALETTES) as AccentColorKey[]).map(key => {
                  const pal = ACCENT_PALETTES[key];
                  const isSelected = accentColor === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.swatch,
                        { backgroundColor: pal.light.primary },
                        isSelected && { borderColor: colors.text, borderWidth: 2.5 },
                      ]}
                      onPress={() => setAccentColor(key)}
                    />
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Navigation */}
        <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
          {step > 1 ? (
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => setStep(step - 1)}
            >
              <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.skipBtn} onPress={handleFinish}>
              <Text style={[styles.skipText, { color: colors.textTertiary }]}>Skip All</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (step < TOTAL_STEPS) {
                setStep(step + 1);
              } else {
                handleFinish();
              }
            }}
          >
            <Text style={[styles.nextText, { color: colors.onPrimary }]}>
              {step === TOTAL_STEPS ? "Let's Begin 🚀" : 'Continue'}
            </Text>
            {step < TOTAL_STEPS && (
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.onPrimary}
                style={{ marginLeft: 6 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  progressBarRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 6,
    marginBottom: 16,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  formGroup: {
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  dayBox: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayBoxText: {
    fontSize: 13,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  choiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  periodRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  periodOrdText: {
    fontSize: 12,
    fontWeight: '800',
  },
  periodLabelText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  periodTimeText: {
    fontSize: 12,
  },
  breakTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  breakTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  quickAddBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 12,
    marginTop: 10,
    gap: 6,
  },
  addInlineText: {
    fontSize: 13,
    fontWeight: '700',
  },
  presetChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  presetSubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
  },
  presetSubText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subBadgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  addedSubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  addedSubText: {
    fontSize: 12,
    fontWeight: '700',
  },
  daySelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  daySelectorChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  daySelectorText: {
    fontSize: 12,
  },
  assignRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  assignPeriodLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  assignPeriodTime: {
    fontSize: 11,
  },
  assignSubPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 6,
  },
  assignSubText: {
    fontSize: 11,
  },
  targetContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  targetDisplay: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
  },
  targetHint: {
    fontSize: 12,
    marginBottom: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  stepperBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  stepperText: {
    fontSize: 13,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  nextText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
