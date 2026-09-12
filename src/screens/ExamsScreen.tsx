import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { ExamCard } from '../components/exams/ExamCard';
import { AddExamModal } from '../components/exams/AddExamModal';
import { HolidayModal } from '../components/timetable/HolidayModal';
import { Card } from '../components/common/Card';
import { Exam, Holiday } from '../types';
import { parseISO, isFuture, isPast, isToday, format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

export const ExamsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { exams, holidays, addHoliday, deleteHoliday } = useApp();

  const [activeTab, setActiveTabState] = useState<'upcoming' | 'past' | 'holidays'>('upcoming');
  const [addExamModalVisible, setAddExamModalVisible] = useState(false);
  const [addHolidayModalVisible, setAddHolidayModalVisible] = useState(false);

  // Holiday Form State
  const [holName, setHolName] = useState('');
  const [holStart, setHolStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [holEnd, setHolEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  const upcomingExams = exams.filter((e: Exam) => {
    const d = parseISO(e.date);
    return isFuture(d) || isToday(d);
  }).sort((a: Exam, b: Exam) => a.date.localeCompare(b.date));

  const pastExams = exams.filter((e: Exam) => {
    const d = parseISO(e.date);
    return isPast(d) && !isToday(d);
  }).sort((a: Exam, b: Exam) => b.date.localeCompare(a.date));

  const handleSaveHoliday = async () => {
    if (!holName.trim() || !holStart.trim() || !holEnd.trim()) return;
    await addHoliday({
      name: holName.trim(),
      startDate: holStart.trim(),
      endDate: holEnd.trim(),
    });
    setHolName('');
    setAddHolidayModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Exams & Schedule"
        subtitle={`${upcomingExams.length} Upcoming Exams • ${holidays.length} Holidays`}
        rightAction={{
          icon: 'add-circle-outline',
          onPress: () => {
            if (activeTab === 'holidays') {
              setAddHolidayModalVisible(true);
            } else {
              setAddExamModalVisible(true);
            }
          },
        }}
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'upcoming' && {
              backgroundColor: colors.primary,
              borderRadius: 12,
            },
          ]}
          onPress={() => setActiveTabState('upcoming')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'upcoming' ? colors.onPrimary : colors.textSecondary },
            ]}
          >
            Upcoming ({upcomingExams.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'past' && {
              backgroundColor: colors.primary,
              borderRadius: 12,
            },
          ]}
          onPress={() => setActiveTabState('past')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'past' ? colors.onPrimary : colors.textSecondary },
            ]}
          >
            Past Exams ({pastExams.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'holidays' && {
              backgroundColor: colors.primary,
              borderRadius: 12,
            },
          ]}
          onPress={() => setActiveTabState('holidays')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'holidays' ? colors.onPrimary : colors.textSecondary },
            ]}
          >
            Holidays ({holidays.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'upcoming' && (
          <View>
            {upcomingExams.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="school-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Upcoming Exams</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  All caught up! Tap the + icon on the top right to schedule an exam.
                </Text>
              </View>
            ) : (
              upcomingExams.map((exam: Exam) => <ExamCard key={exam.id} exam={exam} />)
            )}
          </View>
        )}

        {activeTab === 'past' && (
          <View>
            {pastExams.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Past Exams</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Past exam history will appear here once dates pass.
                </Text>
              </View>
            ) : (
              pastExams.map((exam: Exam) => <ExamCard key={exam.id} exam={exam} />)
            )}
          </View>
        )}

        {activeTab === 'holidays' && (
          <View>
            {holidays.map((hol: Holiday) => (
              <Card
                key={hol.id}
                style={[styles.holidayCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
              >
                <View style={styles.holidayHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.holidayName, { color: colors.text }]}>{hol.name}</Text>
                    <Text style={[styles.holidayDates, { color: colors.textSecondary }]}>
                      📅 {hol.startDate} to {hol.endDate}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => deleteHoliday(hol.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}

            <TouchableOpacity
              style={[styles.addHolidayBanner, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}
              onPress={() => setAddHolidayModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.addHolidayText, { color: colors.primary }]}>
                Add Vacation / Holiday Break
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Exam Modal */}
      <AddExamModal
        visible={addExamModalVisible}
        onClose={() => setAddExamModalVisible(false)}
      />

      {/* Add Holiday Modal */}
      <HolidayModal
        visible={addHolidayModalVisible}
        onClose={() => setAddHolidayModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  emptyState: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  holidayCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginVertical: 6,
  },
  holidayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holidayName: {
    fontSize: 16,
    fontWeight: '700',
  },
  holidayDates: {
    fontSize: 13,
    marginTop: 3,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHolidayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 10,
    gap: 8,
  },
  addHolidayText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
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
  twoCols: {
    flexDirection: 'row',
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
