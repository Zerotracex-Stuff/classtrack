import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { WeekGridView } from '../components/timetable/WeekGridView';
import { DayTimelineView } from '../components/timetable/DayTimelineView';
import { EditCellModal } from '../components/timetable/EditCellModal';
import { SubjectListModal } from '../components/timetable/SubjectListModal';
import { PeriodListModal } from '../components/timetable/PeriodListModal';
import { ShareScheduleModal } from '../components/timetable/ShareScheduleModal';
import { HolidayModal } from '../components/timetable/HolidayModal';
import { DayOfWeek, Period, Subject } from '../types';
import { Ionicons } from '@expo/vector-icons';

type TimetableLayout = 'grid' | 'timeline';

export const TimetableScreen: React.FC = () => {
  const { colors } = useTheme();
  const { subjects, periods } = useApp();

  const [layout, setLayout] = useState<TimetableLayout>('grid');
  const [editingCell, setEditingCell] = useState<{
    weekday: DayOfWeek;
    period: Period;
  } | null>(null);

  const [subjectListVisible, setSubjectListVisible] = useState(false);
  const [periodListVisible, setPeriodListVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [holidayModalVisible, setHolidayModalVisible] = useState(false);

  const handleCellPress = (weekday: DayOfWeek, period: Period) => {
    setEditingCell({ weekday, period });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Timetable"
        subtitle={`${subjects.length} Subjects • ${periods.length} Period Slots`}
      />

      {/* Control Bar: Layout Toggle & Manager Buttons */}
      <View style={styles.controlBar}>
        {/* Toggle Switch */}
        <View style={[styles.toggleContainer, { backgroundColor: colors.surfaceVariant }]}>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              layout === 'grid' && {
                backgroundColor: colors.primary,
                borderRadius: 10,
              },
            ]}
            onPress={() => setLayout('grid')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="grid-outline"
              size={14}
              color={layout === 'grid' ? colors.onPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                { color: layout === 'grid' ? colors.onPrimary : colors.textSecondary },
              ]}
            >
              Week Grid
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleOption,
              layout === 'timeline' && {
                backgroundColor: colors.primary,
                borderRadius: 10,
              },
            ]}
            onPress={() => setLayout('timeline')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="list-outline"
              size={14}
              color={layout === 'timeline' ? colors.onPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                { color: layout === 'timeline' ? colors.onPrimary : colors.textSecondary },
              ]}
            >
              Day Timeline
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: colors.surfaceVariant }]}
            onPress={() => setSubjectListVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="book-outline" size={14} color={colors.text} />
            <Text style={[styles.actionChipText, { color: colors.text }]}>Subjects</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: colors.surfaceVariant, marginLeft: 6 }]}
            onPress={() => setPeriodListVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={14} color={colors.text} />
            <Text style={[styles.actionChipText, { color: colors.text }]}>Periods</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: colors.primaryContainer, marginLeft: 6 }]}
            onPress={() => setShareModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social-outline" size={14} color={colors.primary} />
            <Text style={[styles.actionChipText, { color: colors.primary, fontWeight: '700' }]}>Share & Import</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: colors.surfaceVariant, marginLeft: 6 }]}
            onPress={() => setHolidayModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="sunny-outline" size={14} color={colors.text} />
            <Text style={[styles.actionChipText, { color: colors.text }]}>Holidays</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Timetable View */}
      <View style={styles.viewContainer}>
        {layout === 'grid' ? (
          <WeekGridView onCellPress={handleCellPress} />
        ) : (
          <DayTimelineView onCellPress={handleCellPress} />
        )}
      </View>

      {/* Modals */}
      <EditCellModal
        visible={!!editingCell}
        onClose={() => setEditingCell(null)}
        weekday={editingCell?.weekday ?? 0}
        period={editingCell?.period ?? null}
      />

      <SubjectListModal
        visible={subjectListVisible}
        onClose={() => setSubjectListVisible(false)}
      />

      <PeriodListModal
        visible={periodListVisible}
        onClose={() => setPeriodListVisible(false)}
      />

      <ShareScheduleModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
      />

      <HolidayModal
        visible={holidayModalVisible}
        onClose={() => setHolidayModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  viewContainer: {
    flex: 1,
  },
});
