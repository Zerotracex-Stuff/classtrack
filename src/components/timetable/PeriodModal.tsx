import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Period } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { formatTime } from '../../utils/timeUtils';

interface PeriodModalProps {
  visible: boolean;
  onClose: () => void;
  editingPeriod?: Period | null;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export const PeriodModal: React.FC<PeriodModalProps> = ({
  visible,
  onClose,
  editingPeriod,
}) => {
  const { colors } = useTheme();
  const { periods, addPeriod, updatePeriod, deletePeriod, settings } = useApp();

  const [label, setLabel] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:50');
  const [isBreak, setIsBreak] = useState(false);

  // Time picker active selector: 'start' or 'end'
  const [activeTimeTarget, setActiveTimeTarget] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (editingPeriod) {
      setLabel(editingPeriod.label);
      setStartTime(editingPeriod.startTime);
      setEndTime(editingPeriod.endTime);
      setIsBreak(!!editingPeriod.isBreak);
    } else {
      setLabel(`Period ${periods.filter(p => !p.isBreak).length + 1}`);
      setStartTime('09:00');
      setEndTime('09:50');
      setIsBreak(false);
    }
    setActiveTimeTarget('start');
  }, [editingPeriod, visible, periods]);

  // Helper to parse "HH:MM" (24h) to 12h format { hour: 1-12, min: '00', isPM: boolean }
  const parseTo12h = (timeStr: string) => {
    const parts = (timeStr || '09:00').split(':');
    let h = parseInt(parts[0] || '9', 10);
    const m = parts[1] || '00';
    const isPM = h >= 12;
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return { hour: h, min: m, isPM };
  };

  // Helper to format 12h { hour, min, isPM } back to "HH:MM" 24h
  const formatTo24h = (h: number, m: string, isPM: boolean) => {
    let hour24 = h;
    if (isPM && h < 12) hour24 += 12;
    if (!isPM && h === 12) hour24 = 0;
    const hStr = hour24.toString().padStart(2, '0');
    return `${hStr}:${m}`;
  };

  const currentTime = activeTimeTarget === 'start' ? startTime : endTime;
  const parsed = parseTo12h(currentTime);

  const handleSelectHour = (h: number) => {
    const new24h = formatTo24h(h, parsed.min, parsed.isPM);
    if (activeTimeTarget === 'start') {
      setStartTime(new24h);
    } else {
      setEndTime(new24h);
    }
  };

  const handleSelectMinute = (m: string) => {
    const new24h = formatTo24h(parsed.hour, m, parsed.isPM);
    if (activeTimeTarget === 'start') {
      setStartTime(new24h);
    } else {
      setEndTime(new24h);
    }
  };

  const handleToggleAmPm = (isPM: boolean) => {
    const new24h = formatTo24h(parsed.hour, parsed.min, isPM);
    if (activeTimeTarget === 'start') {
      setStartTime(new24h);
    } else {
      setEndTime(new24h);
    }
  };

  // Quick duration add helper
  const addDurationToEnd = (minsToAdd: number) => {
    const [h, m] = startTime.split(':').map(Number);
    const totalMins = (h || 0) * 60 + (m || 0) + minsToAdd;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    setEndTime(`${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`);
  };

  const handleSave = async () => {
    if (!label.trim() || !startTime.trim() || !endTime.trim()) return;

    if (editingPeriod) {
      await updatePeriod({
        ...editingPeriod,
        label: label.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        isBreak,
      });
    } else {
      await addPeriod({
        ord: periods.length + 1,
        label: label.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        isBreak,
      });
    }

    onClose();
  };

  const handleDelete = async () => {
    if (editingPeriod) {
      await deletePeriod(editingPeriod.id);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {editingPeriod ? 'Edit Period Slot' : 'Add Period Slot'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>PERIOD LABEL *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
              ]}
              placeholder="e.g. Period 1, Physics Lab, Tea Break..."
              placeholderTextColor={colors.textTertiary}
              value={label}
              onChangeText={setLabel}
            />

            {/* Time Target Selectors (Start Time vs End Time) */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
              SCHEDULE TIMINGS (TAP TO PICK)
            </Text>
            <View style={styles.timeTargetRow}>
              <TouchableOpacity
                style={[
                  styles.timeTargetCard,
                  activeTimeTarget === 'start'
                    ? { backgroundColor: colors.primaryContainer, borderColor: colors.primary }
                    : { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                ]}
                onPress={() => setActiveTimeTarget('start')}
                activeOpacity={0.8}
              >
                <Text style={[styles.timeTargetLabel, { color: colors.textSecondary }]}>
                  START TIME
                </Text>
                <Text
                  style={[
                    styles.timeTargetValue,
                    {
                      color:
                        activeTimeTarget === 'start' ? colors.primary : colors.text,
                    },
                  ]}
                >
                  {formatTime(startTime, settings.timeFormat || '12h')}
                </Text>
              </TouchableOpacity>

              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.textTertiary}
                style={{ alignSelf: 'center', marginHorizontal: 4 }}
              />

              <TouchableOpacity
                style={[
                  styles.timeTargetCard,
                  activeTimeTarget === 'end'
                    ? { backgroundColor: colors.primaryContainer, borderColor: colors.primary }
                    : { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
                ]}
                onPress={() => setActiveTimeTarget('end')}
                activeOpacity={0.8}
              >
                <Text style={[styles.timeTargetLabel, { color: colors.textSecondary }]}>
                  END TIME
                </Text>
                <Text
                  style={[
                    styles.timeTargetValue,
                    {
                      color:
                        activeTimeTarget === 'end' ? colors.primary : colors.text,
                    },
                  ]}
                >
                  {formatTime(endTime, settings.timeFormat || '12h')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Interactive Time Picker Sheet */}
            <View style={[styles.pickerBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}>
              <View style={styles.pickerHeaderRow}>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>
                  Picking {activeTimeTarget === 'start' ? 'Start Time' : 'End Time'}
                </Text>

                {/* AM / PM Toggle */}
                <View style={styles.ampmToggle}>
                  <TouchableOpacity
                    style={[
                      styles.ampmBtn,
                      !parsed.isPM && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleToggleAmPm(false)}
                  >
                    <Text
                      style={[
                        styles.ampmText,
                        { color: !parsed.isPM ? colors.onPrimary : colors.textSecondary },
                      ]}
                    >
                      AM
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.ampmBtn,
                      parsed.isPM && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleToggleAmPm(true)}
                  >
                    <Text
                      style={[
                        styles.ampmText,
                        { color: parsed.isPM ? colors.onPrimary : colors.textSecondary },
                      ]}
                    >
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Hour Chips */}
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>HOUR</Text>
              <View style={styles.chipsGrid}>
                {HOURS.map(h => {
                  const isSelected = parsed.hour === h;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.timeChip,
                        isSelected
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.surface },
                      ]}
                      onPress={() => handleSelectHour(h)}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          {
                            color: isSelected ? colors.onPrimary : colors.text,
                            fontWeight: isSelected ? '800' : '500',
                          },
                        ]}
                      >
                        {h}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Minute Chips */}
              <Text style={[styles.subLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                MINUTE
              </Text>
              <View style={styles.chipsGrid}>
                {MINUTES.map(m => {
                  const isSelected = parsed.min === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.timeChip,
                        isSelected
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.surface },
                      ]}
                      onPress={() => handleSelectMinute(m)}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          {
                            color: isSelected ? colors.onPrimary : colors.text,
                            fontWeight: isSelected ? '800' : '500',
                          },
                        ]}
                      >
                        :{m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quick duration presets for End Time */}
              {activeTimeTarget === 'end' && (
                <View style={styles.presetsRow}>
                  <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                    QUICK DURATION:
                  </Text>
                  <View style={styles.presetChips}>
                    {[
                      { label: '+40m', val: 40 },
                      { label: '+45m', val: 45 },
                      { label: '+50m', val: 50 },
                      { label: '+1h', val: 60 },
                    ].map(p => (
                      <TouchableOpacity
                        key={p.label}
                        style={[styles.presetBtn, { backgroundColor: colors.surface }]}
                        onPress={() => addDurationToEnd(p.val)}
                      >
                        <Text style={[styles.presetText, { color: colors.primary }]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Break Toggle */}
            <View
              style={[
                styles.switchRow,
                { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>Break / Interval</Text>
                <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>
                  Mark this slot as a tea/lunch break (no class attendance)
                </Text>
              </View>
              <Switch
                value={isBreak}
                onValueChange={setIsBreak}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            {editingPeriod && (
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: colors.absentBg }]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={18} color={colors.absent} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.saveText, { color: colors.onPrimary }]}>
                {editingPeriod ? 'Update Period' : 'Add Period'}
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
    maxHeight: '90%',
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
  timeTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  timeTargetCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  timeTargetLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeTargetValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  pickerBox: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  ampmToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 10,
    padding: 2,
  },
  ampmBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ampmText: {
    fontSize: 11,
    fontWeight: '800',
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeChip: {
    width: 44,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipText: {
    fontSize: 13,
  },
  presetsRow: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  presetChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
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
