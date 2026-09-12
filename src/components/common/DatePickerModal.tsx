import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  parseISO,
  isValid,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addDays,
  differenceInDays,
} from 'date-fns';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  title?: string;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  value,
  onChange,
  title = 'Select Date',
}) => {
  const { colors, isDark } = useTheme();

  // Selected date state
  const selectedDate = useMemo(() => {
    if (!value) return new Date();
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : new Date();
  }, [value]);

  // Current month view state
  const [viewDate, setViewDate] = useState<Date>(selectedDate);

  useEffect(() => {
    if (visible) {
      if (value) {
        const parsed = parseISO(value);
        if (isValid(parsed)) {
          setViewDate(parsed);
        }
      }
    }
  }, [visible, value]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [viewDate]);

  const handlePrevMonth = () => setViewDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setViewDate(prev => addMonths(prev, 1));

  const handleSelectDay = (day: Date) => {
    const formatted = format(day, 'yyyy-MM-dd');
    onChange(formatted);
  };

  const handleQuickPreset = (offsetDays: number) => {
    const target = addDays(new Date(), offsetDays);
    const formatted = format(target, 'yyyy-MM-dd');
    setViewDate(target);
    onChange(formatted);
  };

  // Relative label calculation
  const relativeLabel = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);

    const diff = differenceInDays(sel, today);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 1) return `In ${diff} days`;
    return `${Math.abs(diff)} days ago`;
  }, [selectedDate]);

  const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.headerIconBox, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name="calendar" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Quick Presets Scroll */}
          <View style={styles.presetsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: 'In 3 Days', days: 3 },
                { label: 'Next Week', days: 7 },
                { label: 'In 2 Weeks', days: 14 },
                { label: 'In 1 Month', days: 30 },
              ].map(preset => (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.presetChip, { backgroundColor: colors.surfaceVariant }]}
                  onPress={() => handleQuickPreset(preset.days)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetText, { color: colors.primary }]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Month Navigation */}
          <View style={[styles.monthRow, { borderBottomColor: colors.borderSubtle }]}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={[styles.monthNavBtn, { backgroundColor: colors.surfaceVariant }]}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>

            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {format(viewDate, 'MMMM yyyy')}
            </Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={[styles.monthNavBtn, { backgroundColor: colors.surfaceVariant }]}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Weekday Header */}
          <View style={styles.weekHeader}>
            {WEEK_DAYS.map((wd, i) => (
              <Text
                key={wd}
                style={[
                  styles.weekDayText,
                  { color: i === 0 || i === 6 ? colors.absent : colors.textSecondary },
                ]}
              >
                {wd}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, viewDate);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.primary, borderRadius: 14 },
                    !isSelected && isTodayDay && { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 14 },
                  ]}
                  onPress={() => handleSelectDay(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: isSelected
                          ? colors.onPrimary
                          : isCurrentMonth
                          ? colors.text
                          : colors.textTertiary,
                        fontWeight: isSelected || isTodayDay ? '800' : '500',
                      },
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  {isTodayDay && !isSelected && (
                    <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Date Summary & Footer */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.footerSub, { color: colors.textSecondary }]}>SELECTED DATE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Text style={[styles.footerDate, { color: colors.text }]}>
                  {format(selectedDate, 'EEE, d MMM yyyy')}
                </Text>
                <View style={[styles.relativePill, { backgroundColor: colors.primaryContainer }]}>
                  <Text style={[styles.relativeText, { color: colors.onPrimaryContainer }]}>
                    {relativeLabel}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.confirmText, { color: colors.onPrimary }]}>Set Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface DatePickerFieldProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  modalTitle?: string;
  placeholder?: string;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  modalTitle,
  placeholder = 'Select Date',
}) => {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const formattedDisplay = useMemo(() => {
    if (!value) return placeholder;
    const parsed = parseISO(value);
    return isValid(parsed) ? format(parsed, 'EEE, d MMM yyyy') : value;
  }, [value, placeholder]);

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.fieldBtn,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor: colors.borderSubtle,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text
          style={[
            styles.fieldText,
            { color: value ? colors.text : colors.textTertiary },
          ]}
        >
          {formattedDisplay}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <DatePickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        value={value}
        onChange={onChange}
        title={modalTitle || label}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fieldContainer: {
    marginVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  fieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  fieldText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsWrapper: {
    marginBottom: 14,
  },
  presetsRow: {
    flexDirection: 'row',
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 6,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  monthNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: 14,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  footerSub: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerDate: {
    fontSize: 13,
    fontWeight: '800',
  },
  relativePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  relativeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
