import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Subject } from '../../types';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { SubjectHistoryModal } from './SubjectHistoryModal';

interface SubjectAttendanceCardProps {
  subject: Subject;
}

export const SubjectAttendanceCard: React.FC<SubjectAttendanceCardProps> = ({ subject }) => {
  const { colors, isDark } = useTheme();
  const { getSubjectStats, markAttendance, setSubjectBaseline } = useApp();

  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [baselineModalVisible, setBaselineModalVisible] = useState(false);
  const [inputAttended, setInputAttended] = useState(
    subject.initialAttended ? String(subject.initialAttended) : '0'
  );
  const [inputTotal, setInputTotal] = useState(
    subject.initialTotal ? String(subject.initialTotal) : '0'
  );

  const stats = getSubjectStats(subject.id);
  const { percentage, target, safeBunks, neededToTarget, attendedClasses, totalClasses } = stats;

  const isSafe = percentage >= target;
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const handleQuickAdd = (status: 'present' | 'absent') => {
    markAttendance(subject.id, todayStr, status);
  };

  const handleSaveBaseline = async () => {
    const att = parseInt(inputAttended, 10) || 0;
    const tot = parseInt(inputTotal, 10) || 0;
    await setSubjectBaseline(subject.id, att, Math.max(att, tot));
    setBaselineModalVisible(false);
  };

  return (
    <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      {/* Tappable Card Header & Progress Bar opens Subject History */}
      <TouchableOpacity
        onPress={() => setHistoryModalVisible(true)}
        activeOpacity={0.7}
      >
        {/* Top Header */}
        <View style={styles.topRow}>
          <View style={styles.subjectInfo}>
            <View style={[styles.iconBox, { backgroundColor: subject.color + '20' }]}>
              <Ionicons name={(subject.icon as any) || 'book-outline'} size={18} color={subject.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.subjectName, { color: colors.text }]}>{subject.name}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} style={{ marginLeft: 4 }} />
              </View>
              <Text style={[styles.subjectMeta, { color: colors.textSecondary }]}>
                {subject.code ? `${subject.code} • ` : ''}
                {attendedClasses}/{totalClasses} classes
                {subject.initialTotal ? ` (Base: ${subject.initialAttended}/${subject.initialTotal})` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.percentBox}>
            <Text
              style={[
                styles.percentage,
                { color: isSafe ? colors.present : colors.absent },
              ]}
            >
              {percentage}%
            </Text>
            <TouchableOpacity
              style={styles.baselineBtn}
              onPress={() => {
                setInputAttended(subject.initialAttended ? String(subject.initialAttended) : '0');
                setInputTotal(subject.initialTotal ? String(subject.initialTotal) : '0');
                setBaselineModalVisible(true);
              }}
            >
              <Text style={[styles.baselineBtnText, { color: colors.primary }]}>
                {subject.initialTotal ? 'Edit Base' : '+ Set Base'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: isSafe ? colors.present : colors.absent,
              },
            ]}
          />
          <View style={[styles.targetLine, { left: `${target}%`, backgroundColor: colors.textSecondary }]} />
        </View>
      </TouchableOpacity>

      {/* Footer Info & Quick Actions */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.bunkTag}
          onPress={() => setHistoryModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSafe ? 'checkmark-circle' : 'alert-circle'}
            size={14}
            color={isSafe ? colors.present : colors.absent}
          />
          <Text
            style={[
              styles.bunkTagText,
              { color: isSafe ? colors.present : colors.absent },
            ]}
          >
            {isSafe
              ? `${safeBunks} bunks available`
              : `Attend next ${neededToTarget} classes`}
          </Text>
        </TouchableOpacity>

        {/* Quick + Buttons and History Link */}
        <View style={styles.actionPills}>
          <TouchableOpacity
            style={[styles.historyBtn, { backgroundColor: colors.surfaceVariant }]}
            onPress={() => setHistoryModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="list-outline" size={13} color={colors.primary} />
            <Text style={[styles.historyBtnText, { color: colors.primary }]}>Classes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.miniBtn, { backgroundColor: colors.absentBg, marginLeft: 6 }]}
            onPress={() => handleQuickAdd('absent')}
            activeOpacity={0.7}
          >
            <Text style={[styles.miniBtnText, { color: colors.absent }]}>+ Absent</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.miniBtn, { backgroundColor: colors.presentBg, marginLeft: 6 }]}
            onPress={() => handleQuickAdd('present')}
            activeOpacity={0.7}
          >
            <Text style={[styles.miniBtnText, { color: colors.present }]}>+ Present</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Subject Previous Classes History Modal */}
      <SubjectHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        subject={subject}
      />

      {/* Modal to Set Baseline / Previous Attendance */}
      <Modal
        visible={baselineModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBaselineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Previous Attendance Baseline
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {subject.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setBaselineModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Enter how many classes were held and attended before you started tracking in ClassTrack.
              This will be added to your current attendance total.
            </Text>

            <View style={styles.twoCols}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  CLASSES ATTENDED
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                  ]}
                  value={inputAttended}
                  onChangeText={setInputAttended}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  TOTAL CLASSES HELD
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                  ]}
                  value={inputTotal}
                  onChangeText={setInputTotal}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveBaseline}
            >
              <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>
                Save Baseline
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginVertical: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
  },
  subjectMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  percentBox: {
    alignItems: 'flex-end',
  },
  percentage: {
    fontSize: 20,
    fontWeight: '900',
  },
  baselineBtn: {
    marginTop: 2,
  },
  baselineBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  targetLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bunkTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bunkTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionPills: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 3,
  },
  historyBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  miniBtnText: {
    fontSize: 11,
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  twoCols: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalSaveBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
