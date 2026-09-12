import React, { useState } from 'react';
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
import { ExamType } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import { DatePickerField } from '../common/DatePickerModal';

interface AddExamModalProps {
  visible: boolean;
  onClose: () => void;
}

const EXAM_TYPES: { type: ExamType; label: string }[] = [
  { type: 'midterm', label: 'Mid-term' },
  { type: 'final', label: 'Final Exam' },
  { type: 'quiz', label: 'Quiz / Test' },
  { type: 'practical', label: 'Lab / Practical' },
  { type: 'assignment', label: 'Assignment Deadline' },
];

export const AddExamModal: React.FC<AddExamModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { subjects, addExam } = useApp();

  const [title, setTitle] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [time, setTime] = useState('10:00 AM');
  const [venue, setVenue] = useState('');
  const [examType, setExamType] = useState<ExamType>('midterm');

  const handleSave = async () => {
    if (!title.trim() || !date.trim()) return;

    await addExam({
      title: title.trim(),
      subjectId: selectedSubjectId,
      date: date.trim(),
      time: time.trim() || undefined,
      venue: venue.trim() || undefined,
      type: examType,
    });

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Add Exam / Deadline</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>EXAM TITLE *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
              ]}
              placeholder="e.g. Physics Final Exam"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />

            {/* Subject Selector */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>
              RELATED SUBJECT
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectRow}>
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
                    onPress={() => setSelectedSubjectId(isSelected ? undefined : s.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#FFF' : colors.text, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Exam Type */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>
              ASSESSMENT TYPE
            </Text>
            <View style={styles.typesRow}>
              {EXAM_TYPES.map(t => {
                const isSelected = examType === t.type;
                return (
                  <TouchableOpacity
                    key={t.type}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isSelected ? colors.primaryContainer : colors.surfaceVariant,
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => setExamType(t.type)}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        {
                          color: isSelected ? colors.onPrimaryContainer : colors.text,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date & Time */}
            <View style={styles.twoCols}>
              <View style={{ flex: 1, marginRight: 8, marginTop: 10 }}>
                <DatePickerField
                  label="EXAM DATE *"
                  value={date}
                  onChange={setDate}
                  modalTitle="Select Exam Date"
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>
                  TIME
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                  ]}
                  placeholder="10:00 AM"
                  placeholderTextColor={colors.textTertiary}
                  value={time}
                  onChangeText={setTime}
                />
              </View>
            </View>

            {/* Venue */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>
              VENUE / ROOM
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
              ]}
              placeholder="e.g. Auditorium Hall 2"
              placeholderTextColor={colors.textTertiary}
              value={venue}
              onChangeText={setVenue}
            />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary, opacity: title.trim() ? 1 : 0.6 },
              ]}
              onPress={handleSave}
              disabled={!title.trim()}
            >
              <Text style={[styles.saveText, { color: colors.onPrimary }]}>Add to Schedule</Text>
            </TouchableOpacity>
          </View>
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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  subjectRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
  },
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 12,
  },
  twoCols: {
    flexDirection: 'row',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    marginTop: 10,
  },
  saveBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
