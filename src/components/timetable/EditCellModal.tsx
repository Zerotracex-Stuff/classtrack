import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { DayOfWeek, Period, Subject } from '../../types';
import { Ionicons } from '@expo/vector-icons';

import { SubjectModal } from './SubjectModal';

interface EditCellModalProps {
  visible: boolean;
  onClose: () => void;
  weekday: DayOfWeek;
  period: Period | null;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const EditCellModal: React.FC<EditCellModalProps> = ({
  visible,
  onClose,
  weekday,
  period,
}) => {
  const { colors, isDark } = useTheme();
  const { subjects, entries, getEntry, saveEntry, clearEntry, settings } = useApp();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(undefined);
  const [freeText, setFreeText] = useState('');
  const [roomOverride, setRoomOverride] = useState('');
  const [teacher, setTeacher] = useState('');
  const [notes, setNotes] = useState('');
  const [targetCopyDays, setTargetCopyDays] = useState<DayOfWeek[]>([]);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);

  // Collect existing teacher names for quick selection
  const existingTeachers = React.useMemo(() => {
    const set = new Set<string>();
    subjects.forEach(s => {
      if (s.teacher?.trim()) set.add(s.teacher.trim());
    });
    entries.forEach(e => {
      if (e.teacher?.trim()) set.add(e.teacher.trim());
      if (e.teacherOverride?.trim()) set.add(e.teacherOverride.trim());
    });
    return Array.from(set);
  }, [subjects, entries]);

  useEffect(() => {
    if (period) {
      const entry = getEntry(weekday, period.id);
      setSelectedSubjectId(entry?.subjectId);
      setFreeText(entry?.freeText || '');
      setRoomOverride(entry?.roomOverride || '');
      setTeacher(entry?.teacher || entry?.teacherOverride || '');
      setNotes(entry?.notes || '');
      setTargetCopyDays([]);
    }
  }, [period, weekday, getEntry]);

  if (!period) return null;

  const toggleTargetCopyDay = (d: DayOfWeek) => {
    setTargetCopyDays(prev =>
      prev.includes(d) ? prev.filter(day => day !== d) : [...prev, d]
    );
  };

  const otherWorkingDays = settings.workingDays.filter(d => d !== weekday);
  const allSelected =
    otherWorkingDays.length > 0 && otherWorkingDays.every(d => targetCopyDays.includes(d));

  const handleToggleAll = () => {
    if (allSelected) {
      setTargetCopyDays([]);
    } else {
      setTargetCopyDays([...otherWorkingDays]);
    }
  };

  const handleSave = async () => {
    const slotPayload = {
      periodId: period.id,
      subjectId: selectedSubjectId,
      teacher: teacher.trim() || undefined,
      teacherOverride: teacher.trim() || undefined,
      freeText: freeText.trim() || undefined,
      roomOverride: roomOverride.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    // Save current day
    await saveEntry({
      weekday,
      ...slotPayload,
    });

    // Copy to all selected target days
    for (const targetDay of targetCopyDays) {
      if (targetDay !== weekday) {
        await saveEntry({
          weekday: targetDay,
          ...slotPayload,
        });
      }
    }

    onClose();
  };

  const handleClear = async () => {
    await clearEntry(weekday, period.id);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Edit Timetable Slot</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {DAY_NAMES[weekday]} • {period.label} ({period.startTime} - {period.endTime})
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Subject Selection */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>SELECT SUBJECT</Text>
            {subjects.length === 0 ? (
              <View style={[styles.noSubjectCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}>
                <Ionicons name="book-outline" size={22} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.noSubjectTitle, { color: colors.text }]}>No Subjects Created</Text>
                  <Text style={[styles.noSubjectSub, { color: colors.textSecondary }]}>
                    Create your first subject to assign it to this slot.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addSubjectChip, { backgroundColor: colors.primary }]}
                  onPress={() => setSubjectModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={14} color={colors.onPrimary} />
                  <Text style={[styles.addSubjectChipText, { color: colors.onPrimary }]}>+ Add Subject</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.subjectChipsContainer}>
                {subjects.map(s => {
                  const isSelected = selectedSubjectId === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? s.color : colors.surfaceVariant,
                          borderColor: isSelected ? s.color : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedSubjectId(undefined);
                        } else {
                          setSelectedSubjectId(s.id);
                          if (!teacher.trim() && s.teacher) {
                            setTeacher(s.teacher);
                          }
                          if (!roomOverride.trim() && s.room) {
                            setRoomOverride(s.room);
                          }
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.dot, { backgroundColor: isSelected ? '#FFF' : s.color }]} />
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? '#FFFFFF' : colors.text, fontWeight: isSelected ? '700' : '500' },
                        ]}
                      >
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Period-Specific Teacher */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>
                TEACHER (FOR THIS PERIOD)
              </Text>
              <Text style={[styles.subHint, { color: colors.textTertiary, marginTop: 14 }]}>
                Different teachers for each period
              </Text>
            </View>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
              ]}
              placeholder="e.g. Dr. Roberts, Prof. Alan..."
              placeholderTextColor={colors.textTertiary}
              value={teacher}
              onChangeText={setTeacher}
            />

            {/* Quick Pick Teachers */}
            {existingTeachers.length > 0 && (
              <View style={styles.suggestionsWrapper}>
                <Text style={[styles.suggestionLabel, { color: colors.textTertiary }]}>Quick pick teacher:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
                  {existingTeachers.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.teacherPill,
                        {
                          backgroundColor: teacher === t ? colors.primaryContainer : colors.surfaceVariant,
                          borderColor: teacher === t ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => setTeacher(t)}
                    >
                      <Ionicons
                        name="person-outline"
                        size={12}
                        color={teacher === t ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.teacherPillText,
                          {
                            color: teacher === t ? colors.onPrimaryContainer : colors.text,
                            fontWeight: teacher === t ? '700' : '500',
                          },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Room Override & Custom Title */}
            <View style={styles.twoCols}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>ROOM (THIS PERIOD)</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                  ]}
                  placeholder="e.g. Lab 402, Hall A"
                  placeholderTextColor={colors.textTertiary}
                  value={roomOverride}
                  onChangeText={setRoomOverride}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>ACTIVITY / TITLE</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                  ]}
                  placeholder="e.g. Lab Session"
                  placeholderTextColor={colors.textTertiary}
                  value={freeText}
                  onChangeText={setFreeText}
                />
              </View>
            </View>

            {/* Notes */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>SLOT NOTES</Text>
            <TextInput
              style={[
                styles.input,
                styles.notesInput,
                { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
              ]}
              placeholder="Bring lab coat, submit assignment..."
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            {/* Copy to other days (Multi-select) */}
            {otherWorkingDays.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    ALSO COPY TO OTHER DAYS {targetCopyDays.length > 0 ? `(${targetCopyDays.length} selected)` : ''}
                  </Text>
                  <TouchableOpacity onPress={handleToggleAll} activeOpacity={0.7}>
                    <Text style={[styles.subHint, { color: colors.primary, fontWeight: '700' }]}>
                      {allSelected ? 'Clear All' : 'Select All Days'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dayPickerRow}>
                  {otherWorkingDays.map(d => {
                    const isTarget = targetCopyDays.includes(d);
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.dayChip,
                          {
                            backgroundColor: isTarget ? colors.primaryContainer : colors.surfaceVariant,
                            borderColor: isTarget ? colors.primary : colors.borderSubtle,
                          },
                        ]}
                        onPress={() => toggleTargetCopyDay(d)}
                        activeOpacity={0.7}
                      >
                        {isTarget && (
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={colors.onPrimaryContainer}
                            style={{ marginRight: 4 }}
                          />
                        )}
                        <Text
                          style={[
                            styles.dayChipText,
                            {
                              color: isTarget ? colors.onPrimaryContainer : colors.text,
                              fontWeight: isTarget ? '700' : '500',
                            },
                          ]}
                        >
                          {DAY_NAMES[d].substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity style={[styles.clearBtn, { backgroundColor: colors.absentBg }]} onPress={handleClear}>
              <Ionicons name="trash-outline" size={18} color={colors.absent} />
              <Text style={[styles.clearText, { color: colors.absent }]}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={[styles.saveText, { color: colors.onPrimary }]}>Save Slot</Text>
            </TouchableOpacity>
          </View>
          {/* Subject Add Modal */}
          <SubjectModal
            visible={subjectModalVisible}
            onClose={() => setSubjectModalVisible(false)}
            editingSubject={null}
          />
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
    paddingBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  noSubjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  noSubjectTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  noSubjectSub: {
    fontSize: 11,
    marginTop: 1,
  },
  addSubjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  addSubjectChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subjectChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
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
  notesInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  dayPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  saveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  subHint: {
    fontSize: 10,
    fontWeight: '500',
  },
  suggestionsWrapper: {
    marginTop: 8,
    marginBottom: 4,
  },
  suggestionLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
  },
  suggestionsScroll: {
    gap: 6,
    paddingBottom: 2,
  },
  teacherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  teacherPillText: {
    fontSize: 12,
  },
});
