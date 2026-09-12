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
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Subject, AttendanceRecord, AttendanceStatus } from '../../types';
import { Badge } from '../common/Badge';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

interface SubjectHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  subject: Subject;
}

export const SubjectHistoryModal: React.FC<SubjectHistoryModalProps> = ({
  visible,
  onClose,
  subject,
}) => {
  const { colors, isDark } = useTheme();
  const {
    attendance,
    periods,
    entries,
    getSubjectStats,
    markAttendance,
    updateAttendanceRecord,
    deleteAttendanceRecord,
  } = useApp();

  const [showAddClass, setShowAddClass] = useState(false);
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('present');
  const [newNote, setNewNote] = useState('');

  const stats = getSubjectStats(subject.id);
  const isSafe = stats.percentage >= stats.target;

  // Filter all records for this subject and sort descending (latest first)
  const subjectRecords = attendance
    .filter(a => a.subjectId === subject.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const presentCount = subjectRecords.filter(r => r.status === 'present').length;
  const absentCount = subjectRecords.filter(r => r.status === 'absent').length;
  const cancelledCount = subjectRecords.filter(r => r.status === 'not_held').length;

  const handleStatusChange = async (recordId: string, status: AttendanceStatus) => {
    await updateAttendanceRecord(recordId, status);
  };

  const handleDeleteRecord = async (recordId: string) => {
    await deleteAttendanceRecord(recordId);
  };

  const handleAddCustomClass = async () => {
    if (!newDate.trim()) return;
    await markAttendance(subject.id, newDate.trim(), newStatus, newNote.trim() || undefined);
    setShowAddClass(false);
    setNewNote('');
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const parsed = parseISO(dateStr);
      return format(parsed, 'EEE, dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  // Helper to find period & teacher info if periodId is attached
  const getPeriodMeta = (record: AttendanceRecord) => {
    if (!record.periodId) return null;
    const period = periods.find(p => p.id === record.periodId);
    if (!period) return null;

    // Find timetable entry on that day
    try {
      const parsedDate = parseISO(record.date);
      const rawDay = parsedDate.getDay();
      const weekday = ((rawDay + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      const entry = entries.find(e => e.weekday === weekday && e.periodId === period.id);
      const teacher = entry?.teacher || entry?.teacherOverride || subject.teacher;
      const room = entry?.roomOverride || subject.room;
      return { period, teacher, room };
    } catch {
      return { period, teacher: subject.teacher, room: subject.room };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.colorBar, { backgroundColor: subject.color }]} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {subject.name}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {subject.code ? `${subject.code} • ` : ''}All Previous Classes
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Quick Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <View style={styles.summaryTop}>
              <View>
                <Text
                  style={[
                    styles.summaryPercentage,
                    { color: isSafe ? colors.present : colors.absent },
                  ]}
                >
                  {stats.percentage}%
                </Text>
                <Text style={[styles.summaryRatio, { color: colors.textSecondary }]}>
                  {stats.attendedClasses} attended of {stats.totalClasses} classes
                </Text>
              </View>

              <Badge
                label={isSafe ? 'SAFE ZONE' : 'SHORTAGE'}
                variant={isSafe ? 'success' : 'danger'}
                icon={
                  <Ionicons
                    name={isSafe ? 'shield-checkmark' : 'alert-circle'}
                    size={12}
                    color={isSafe ? colors.present : colors.absent}
                  />
                }
              />
            </View>

            {/* Tally Breakdown Chips */}
            <View style={styles.tallyChipsRow}>
              <View style={[styles.tallyChip, { backgroundColor: colors.presentBg }]}>
                <Ionicons name="checkmark-circle" size={13} color={colors.present} />
                <Text style={[styles.tallyChipText, { color: colors.present }]}>
                  {presentCount} Present
                </Text>
              </View>

              <View style={[styles.tallyChip, { backgroundColor: colors.absentBg }]}>
                <Ionicons name="close-circle" size={13} color={colors.absent} />
                <Text style={[styles.tallyChipText, { color: colors.absent }]}>
                  {absentCount} Absent
                </Text>
              </View>

              {cancelledCount > 0 && (
                <View style={[styles.tallyChip, { backgroundColor: colors.cancelledBg }]}>
                  <Ionicons name="remove-circle" size={13} color={colors.cancelled} />
                  <Text style={[styles.tallyChipText, { color: colors.cancelled }]}>
                    {cancelledCount} Cancelled
                  </Text>
                </View>
              )}
            </View>

            {subject.initialTotal ? (
              <Text style={[styles.baselineNotice, { color: colors.textTertiary }]}>
                Includes pre-app baseline: {subject.initialAttended}/{subject.initialTotal} classes attended.
              </Text>
            ) : null}
          </View>

          {/* Action Bar: Add Class Button */}
          <View style={styles.actionBar}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              Class Records ({subjectRecords.length})
            </Text>
            <TouchableOpacity
              style={[
                styles.addPastBtn,
                {
                  backgroundColor: showAddClass ? colors.surfaceVariant : colors.primaryContainer,
                },
              ]}
              onPress={() => setShowAddClass(!showAddClass)}
            >
              <Ionicons
                name={showAddClass ? 'chevron-up' : 'add'}
                size={16}
                color={showAddClass ? colors.text : colors.primary}
              />
              <Text
                style={[
                  styles.addPastBtnText,
                  { color: showAddClass ? colors.text : colors.primary },
                ]}
              >
                {showAddClass ? 'Cancel' : '+ Log Class'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Collapsible Manual Class Form */}
          {showAddClass && (
            <View
              style={[
                styles.addClassForm,
                { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
              ]}
            >
              <Text style={[styles.formTitle, { color: colors.text }]}>Log Past / Extra Class</Text>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DATE (YYYY-MM-DD)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderSubtle },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                value={newDate}
                onChangeText={setNewDate}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                ATTENDANCE STATUS
              </Text>
              <View style={styles.statusToggleRow}>
                {(['present', 'absent', 'not_held'] as AttendanceStatus[]).map(st => {
                  const isChosen = newStatus === st;
                  const label = st === 'present' ? 'Present' : st === 'absent' ? 'Absent' : 'Cancelled';
                  const activeBg =
                    st === 'present' ? colors.presentBg : st === 'absent' ? colors.absentBg : colors.cancelledBg;
                  const activeColor =
                    st === 'present' ? colors.present : st === 'absent' ? colors.absent : colors.cancelled;

                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.toggleOption,
                        {
                          backgroundColor: isChosen ? activeBg : colors.surface,
                          borderColor: isChosen ? activeColor : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => setNewStatus(st)}
                    >
                      <Text
                        style={[
                          styles.toggleOptionText,
                          {
                            color: isChosen ? activeColor : colors.textSecondary,
                            fontWeight: isChosen ? '700' : '500',
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.saveCustomBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddCustomClass}
              >
                <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
                <Text style={[styles.saveCustomBtnText, { color: colors.onPrimary }]}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* List of Previous Classes */}
          <ScrollView style={styles.recordsList} showsVerticalScrollIndicator={false}>
            {subjectRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={42} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                  No previous sessions logged yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                  Classes marked from the Today screen or logged with "+ Log Class" will appear here.
                </Text>
              </View>
            ) : (
              subjectRecords.map(record => {
                const meta = getPeriodMeta(record);
                return (
                  <View
                    key={record.id}
                    style={[
                      styles.recordCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    {/* Record Top Info */}
                    <View style={styles.recordTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recordDate, { color: colors.text }]}>
                          {formatDateDisplay(record.date)}
                        </Text>
                        {meta?.period ? (
                          <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                            {meta.period.label} ({meta.period.startTime} - {meta.period.endTime})
                            {meta.room ? ` • 📍 ${meta.room}` : ''}
                            {meta.teacher ? ` • 👤 ${meta.teacher}` : ''}
                          </Text>
                        ) : (
                          <Text style={[styles.recordMeta, { color: colors.textTertiary }]}>
                            Manual class session
                          </Text>
                        )}
                      </View>

                      {/* Delete button */}
                      <TouchableOpacity
                        style={[styles.trashBtn, { backgroundColor: colors.surfaceVariant }]}
                        onPress={() => handleDeleteRecord(record.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.absent} />
                      </TouchableOpacity>
                    </View>

                    {/* Segmented Status Selector to modify status with one tap */}
                    <View style={styles.recordActionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.statusBtn,
                          {
                            backgroundColor:
                              record.status === 'present' ? colors.presentBg : colors.surfaceVariant,
                            borderColor:
                              record.status === 'present' ? colors.present : 'transparent',
                          },
                        ]}
                        onPress={() => handleStatusChange(record.id, 'present')}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={record.status === 'present' ? colors.present : colors.textTertiary}
                        />
                        <Text
                          style={[
                            styles.statusBtnText,
                            {
                              color:
                                record.status === 'present' ? colors.present : colors.textSecondary,
                              fontWeight: record.status === 'present' ? '700' : '500',
                            },
                          ]}
                        >
                          Present
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.statusBtn,
                          {
                            backgroundColor:
                              record.status === 'absent' ? colors.absentBg : colors.surfaceVariant,
                            borderColor: record.status === 'absent' ? colors.absent : 'transparent',
                          },
                        ]}
                        onPress={() => handleStatusChange(record.id, 'absent')}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="close"
                          size={14}
                          color={record.status === 'absent' ? colors.absent : colors.textTertiary}
                        />
                        <Text
                          style={[
                            styles.statusBtnText,
                            {
                              color:
                                record.status === 'absent' ? colors.absent : colors.textSecondary,
                              fontWeight: record.status === 'absent' ? '700' : '500',
                            },
                          ]}
                        >
                          Absent
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.statusBtn,
                          {
                            backgroundColor:
                              record.status === 'not_held' ? colors.cancelledBg : colors.surfaceVariant,
                            borderColor:
                              record.status === 'not_held' ? colors.cancelled : 'transparent',
                          },
                        ]}
                        onPress={() => handleStatusChange(record.id, 'not_held')}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="remove"
                          size={14}
                          color={
                            record.status === 'not_held' ? colors.cancelled : colors.textTertiary
                          }
                        />
                        <Text
                          style={[
                            styles.statusBtnText,
                            {
                              color:
                                record.status === 'not_held'
                                  ? colors.cancelled
                                  : colors.textSecondary,
                              fontWeight: record.status === 'not_held' ? '700' : '500',
                            },
                          ]}
                        >
                          Cancelled
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
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
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  colorBar: {
    width: 6,
    height: 38,
    borderRadius: 3,
  },
  title: {
    fontSize: 19,
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
  summaryCard: {
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryPercentage: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  summaryRatio: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  tallyChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  tallyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  tallyChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  baselineNotice: {
    fontSize: 11,
    marginTop: 8,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
  },
  addPastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  addPastBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addClassForm: {
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  statusToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  toggleOptionText: {
    fontSize: 12,
  },
  saveCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  saveCustomBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  recordsList: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  recordCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  recordTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  recordMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  trashBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 4,
  },
  statusBtnText: {
    fontSize: 12,
  },
});
