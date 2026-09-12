import React, { useState } from 'react';
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
import { useApp } from '../../context/AppContext';
import { Period } from '../../types';
import { PeriodModal } from './PeriodModal';
import { Badge } from '../common/Badge';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeRange } from '../../utils/timeUtils';

interface PeriodListModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PeriodListModal: React.FC<PeriodListModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { periods, settings } = useApp();

  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);

  // Time helper in minutes
  const getMinutes = (timeStr: string) => {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const sortedPeriods = [...periods].sort(
    (a, b) => getMinutes(a.startTime) - getMinutes(b.startTime)
  );

  const handleEditPeriod = (period: Period) => {
    setEditingPeriod(period);
    setPeriodModalVisible(true);
  };

  const handleAddNew = () => {
    setEditingPeriod(null);
    setPeriodModalVisible(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Manage Period Slots</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {periods.length} slots • Tap any period to edit times or toggle break
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Periods List */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {sortedPeriods.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="time-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No periods created yet.
                </Text>
              </View>
            ) : (
              sortedPeriods.map(period => {
                const startM = getMinutes(period.startTime);
                const endM = getMinutes(period.endTime);
                const duration = Math.max(0, endM - startM);

                return (
                  <TouchableOpacity
                    key={period.id}
                    style={[
                      styles.periodCard,
                      {
                        backgroundColor: period.isBreak ? colors.surfaceVariant : colors.card,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                    onPress={() => handleEditPeriod(period)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardLeft}>
                      <View
                        style={[
                          styles.timeCircle,
                          {
                            backgroundColor: period.isBreak
                              ? colors.cancelledBg
                              : colors.primaryContainer,
                          },
                        ]}
                      >
                        <Ionicons
                          name={period.isBreak ? 'cafe' : 'time'}
                          size={16}
                          color={period.isBreak ? colors.cancelled : colors.primary}
                        />
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.periodLabel, { color: colors.text }]}>
                            {period.label}
                          </Text>
                          {period.isBreak ? (
                            <Badge label="BREAK" variant="warning" size="sm" />
                          ) : null}
                        </View>
                        <Text style={[styles.periodTimes, { color: colors.textSecondary }]}>
                          {formatTimeRange(period.startTime, period.endTime, settings.timeFormat || '12h')} ({duration} mins)
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.editIconCircle, { backgroundColor: colors.surfaceVariant }]}>
                      <Ionicons name="pencil" size={13} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Footer Action */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddNew}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={colors.onPrimary} />
              <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>Add New Period</Text>
            </TouchableOpacity>
          </View>

          {/* Period Add/Edit Modal */}
          <PeriodModal
            visible={periodModalVisible}
            onClose={() => setPeriodModalVisible(false)}
            editingPeriod={editingPeriod}
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
    marginBottom: 8,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  periodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  timeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  periodTimes: {
    fontSize: 12,
    marginTop: 2,
  },
  editIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 6,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
