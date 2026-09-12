import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Holiday } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { DatePickerField } from '../common/DatePickerModal';

interface HolidayModalProps {
  visible: boolean;
  onClose: () => void;
  editingHoliday?: Holiday | null;
}

export const HolidayModal: React.FC<HolidayModalProps> = ({
  visible,
  onClose,
  editingHoliday,
}) => {
  const { colors } = useTheme();
  const { addHoliday, deleteHoliday } = useApp();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editingHoliday) {
      setName(editingHoliday.name || '');
      setStartDate(editingHoliday.startDate || todayStr);
      setEndDate(editingHoliday.endDate || todayStr);
    } else {
      setName('');
      setStartDate(todayStr);
      setEndDate(todayStr);
    }
  }, [editingHoliday, visible, todayStr]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Holiday Name Required', 'Please enter a name for the holiday.');
      return;
    }

    if (!startDate.trim() || !endDate.trim()) {
      Alert.alert('Dates Required', 'Please enter valid start and end dates (YYYY-MM-DD).');
      return;
    }

    if (startDate > endDate) {
      Alert.alert('Invalid Date Range', 'Start date cannot be after end date.');
      return;
    }

    if (editingHoliday?.id) {
      await deleteHoliday(editingHoliday.id);
    }

    await addHoliday({
      name: name.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
    });

    onClose();
  };

  const handleDelete = async () => {
    if (!editingHoliday?.id) return;

    if (Platform.OS === 'web') {
      if (confirm(`Are you sure you want to delete "${editingHoliday.name}"?`)) {
        await deleteHoliday(editingHoliday.id);
        onClose();
      }
    } else {
      Alert.alert(
        'Delete Holiday',
        `Are you sure you want to delete "${editingHoliday.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteHoliday(editingHoliday.id);
              onClose();
            },
          },
        ]
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Set up holidays to pause class alerts and skip attendance
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Holiday Name */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>HOLIDAY NAME</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
              ]}
              placeholder="e.g. Spring Break, National Holiday, Diwali..."
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
            />

            {/* Quick Pick Holiday Names */}
            <View style={styles.quickPicksRow}>
              {['Spring Break', 'Winter Vacation', 'National Day', 'Semester Break'].map(suggestion => (
                <TouchableOpacity
                  key={suggestion}
                  style={[styles.quickPickChip, { backgroundColor: colors.surfaceVariant }]}
                  onPress={() => setName(suggestion)}
                >
                  <Text style={[styles.quickPickText, { color: colors.textSecondary }]}>
                    + {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Start & End Dates */}
            <View style={styles.twoCols}>
              <View style={{ flex: 1, marginRight: 8, marginTop: 10 }}>
                <DatePickerField
                  label="START DATE *"
                  value={startDate}
                  onChange={(d) => {
                    setStartDate(d);
                    if (d > endDate) setEndDate(d);
                  }}
                  modalTitle="Holiday Start Date"
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8, marginTop: 10 }}>
                <DatePickerField
                  label="END DATE *"
                  value={endDate}
                  onChange={(d) => {
                    setEndDate(d);
                    if (d < startDate) setStartDate(d);
                  }}
                  modalTitle="Holiday End Date"
                />
              </View>
            </View>

            {/* Info Callout */}
            <View style={[styles.infoCard, { backgroundColor: colors.primaryContainer }]}>
              <Ionicons name="sunny" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.onPrimaryContainer }]}>
                During holidays, ClassTrack will pause daily reminders and automatically exclude these dates from missing attendance targets.
              </Text>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            {editingHoliday && (
              <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.absentBg }]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color={colors.absent} />
                <Text style={[styles.deleteText, { color: colors.absent }]}>Delete</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={[styles.saveText, { color: colors.onPrimary }]}>
                {editingHoliday ? 'Save Changes' : 'Add Holiday'}
              </Text>
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
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  quickPicksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickPickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  quickPickText: {
    fontSize: 11,
    fontWeight: '600',
  },
  twoCols: {
    flexDirection: 'row',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginTop: 18,
    marginBottom: 10,
    gap: 10,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  deleteText: {
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
});
