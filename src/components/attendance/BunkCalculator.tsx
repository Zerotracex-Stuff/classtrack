import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Ionicons } from '@expo/vector-icons';
import { Subject } from '../../types';

export const BunkCalculator: React.FC = () => {
  const { colors } = useTheme();
  const { overallStats, subjects, getSubjectStats } = useApp();

  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | 'overall'>('overall');
  const [showSimulator, setShowSimulator] = useState(false);

  const {
    percentage,
    target,
    safeBunks,
    neededToTarget,
    attendedClasses,
    totalClasses,
  } = overallStats;

  const isSafe = percentage >= target;
  const isBorderline = percentage >= target && safeBunks <= 1;

  // Selected subject stats or overall stats
  const activeStats = useMemo(() => {
    if (selectedSubjectId === 'overall' || !selectedSubjectId) {
      return {
        name: 'Overall Schedule',
        attended: attendedClasses,
        total: totalClasses,
        pct: percentage,
        target,
        bunks: safeBunks,
        needed: neededToTarget,
      };
    }
    const s = subjects.find(sub => sub.id === selectedSubjectId);
    const st = getSubjectStats(selectedSubjectId);
    return {
      name: s?.name || 'Subject',
      attended: st.attendedClasses,
      total: st.totalClasses,
      pct: st.percentage,
      target: st.target,
      bunks: st.safeBunks,
      needed: st.neededToTarget,
    };
  }, [selectedSubjectId, subjects, getSubjectStats, overallStats]);

  // Calculate Scenarios for Active Selection
  const scenarios = useMemo(() => {
    const A = activeStats.attended;
    const T = activeStats.total;

    const calcPct = (a: number, t: number) => (t > 0 ? Math.round((a / t) * 1000) / 10 : 100);

    return [
      { label: 'Attend next 5 classes', attendDelta: 5, missDelta: 0, pct: calcPct(A + 5, T + 5), type: 'attend' },
      { label: 'Attend next 3 classes', attendDelta: 3, missDelta: 0, pct: calcPct(A + 3, T + 3), type: 'attend' },
      { label: 'Attend next 1 class', attendDelta: 1, missDelta: 0, pct: calcPct(A + 1, T + 1), type: 'attend' },
      { label: 'Miss 1 class (Tomorrow)', attendDelta: 0, missDelta: 1, pct: calcPct(A, T + 1), type: 'miss' },
      { label: 'Miss next 2 classes', attendDelta: 0, missDelta: 2, pct: calcPct(A, T + 2), type: 'miss' },
      { label: 'Miss next 3 classes', attendDelta: 0, missDelta: 3, pct: calcPct(A, T + 3), type: 'miss' },
    ];
  }, [activeStats]);

  return (
    <Card
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: isSafe ? (isBorderline ? colors.cancelled : colors.present) : colors.absent,
          borderWidth: 1.5,
        },
      ]}
    >
      {/* Top Header: Badge & Target Goal */}
      <View style={styles.topRow}>
        <Badge
          label={
            isSafe
              ? isBorderline
                ? safeBunks === 1
                  ? 'ONLY 1 BUNK LEFT'
                  : 'ON THE EDGE'
                : 'SAFE ZONE'
              : 'ATTENDANCE SHORTAGE'
          }
          variant={isSafe ? (isBorderline ? 'warning' : 'success') : 'danger'}
          icon={
            <Ionicons
              name={isSafe ? (isBorderline ? 'alert-circle' : 'shield-checkmark') : 'warning'}
              size={13}
              color={isSafe ? (isBorderline ? colors.cancelled : colors.present) : colors.absent}
            />
          }
        />
        <View style={styles.topRightControls}>
          <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>
            Target: {target}%
          </Text>
          <TouchableOpacity
            style={[styles.inspectBadge, { backgroundColor: colors.surfaceVariant }]}
            onPress={() => setDetailsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calculator-outline" size={13} color={colors.primary} />
            <Text style={[styles.inspectBadgeText, { color: colors.primary }]}>Subject Inspector</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Percentage & Safe Bunk Pill Row */}
      <View style={styles.statsRow}>
        <View>
          <Text style={[styles.percentageNumber, { color: colors.text }]}>{percentage}%</Text>
          <Text style={[styles.classesFraction, { color: colors.textSecondary }]}>
            {attendedClasses} / {totalClasses} total sessions attended
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.bunkMetricBox,
            {
              backgroundColor: isSafe ? colors.presentBg : colors.absentBg,
              borderColor: isSafe ? colors.present : colors.absent,
            },
          ]}
          onPress={() => setDetailsModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.bunkMetricCount,
              { color: isSafe ? colors.present : colors.absent },
            ]}
          >
            {isSafe ? safeBunks : neededToTarget}
          </Text>
          <Text
            style={[
              styles.bunkMetricLabel,
              { color: isSafe ? colors.present : colors.absent },
            ]}
          >
            {isSafe ? 'Safe Bunks' : 'Classes Needed'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Warning Callout Card */}
      {isSafe ? (
        safeBunks === 1 ? (
          <View style={[styles.warningBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Ionicons name="warning" size={18} color="#D97706" />
            <Text style={[styles.warningText, { color: '#92400E' }]}>
              ⚠️ <Text style={{ fontWeight: '800' }}>Warning:</Text> You have only 1 safe absence remaining. Missing a second class will drop you below your {target}% target!
            </Text>
          </View>
        ) : safeBunks === 0 ? (
          <View style={[styles.warningBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={[styles.warningText, { color: '#991B1B' }]}>
              🚨 <Text style={{ fontWeight: '800' }}>Critical Borderline:</Text> You have 0 safe absences left! Any missed class will result in an attendance shortage.
            </Text>
          </View>
        ) : null
      ) : (
        <View style={[styles.warningBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
          <Ionicons name="warning" size={18} color="#DC2626" />
          <Text style={[styles.warningText, { color: '#991B1B' }]}>
            🚨 <Text style={{ fontWeight: '800' }}>Shortage Alert:</Text> You need to attend the next <Text style={{ fontWeight: '900' }}>{neededToTarget}</Text> consecutive classes to reach {target}%.
          </Text>
        </View>
      )}

      {/* Progress Bar Track */}
      <View style={[styles.barBackground, { backgroundColor: colors.surfaceVariant, marginBottom: 12 }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: isSafe ? colors.present : colors.absent,
            },
          ]}
        />
        <View
          style={[
            styles.targetMarker,
            { left: `${target}%`, backgroundColor: colors.textSecondary },
          ]}
        />
      </View>

      {/* Expand / Collapse Simulator Action Toggle */}
      <TouchableOpacity
        style={[styles.simToggleBtn, { backgroundColor: colors.surfaceVariant }]}
        onPress={() => setShowSimulator(prev => !prev)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={showSimulator ? 'chevron-up-circle' : 'calculator-outline'}
          size={16}
          color={colors.primary}
        />
        <Text style={[styles.simToggleText, { color: colors.primary }]}>
          {showSimulator ? 'Hide Scenario Simulator ▲' : 'Show Bunk Simulator & Predictions ▼'}
        </Text>
      </TouchableOpacity>

      {/* Collapsible What Happens If I Miss Tomorrow? Simulator Section */}
      {showSimulator && (
        <View style={styles.simulatorSection}>
          <View style={styles.simHeaderRow}>
            <Text style={[styles.simSectionTitle, { color: colors.text }]}>
              "What Happens If I Miss Tomorrow?"
            </Text>
            <Text style={[styles.simSubText, { color: colors.textSecondary }]}>
              Select subject to simulate
            </Text>
          </View>

          {/* Subject Chips Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectChipRow}>
            <TouchableOpacity
              style={[
                styles.subChip,
                {
                  backgroundColor: selectedSubjectId === 'overall' ? colors.primary : colors.surfaceVariant,
                  borderColor: selectedSubjectId === 'overall' ? colors.primary : colors.borderSubtle,
                },
              ]}
              onPress={() => setSelectedSubjectId('overall')}
            >
              <Text
                style={[
                  styles.subChipText,
                  { color: selectedSubjectId === 'overall' ? colors.onPrimary : colors.text },
                ]}
              >
                Overall All
              </Text>
            </TouchableOpacity>

            {subjects.map(sub => {
              const isSel = selectedSubjectId === sub.id;
              return (
                <TouchableOpacity
                  key={sub.id}
                  style={[
                    styles.subChip,
                    {
                      backgroundColor: isSel ? sub.color : colors.surfaceVariant,
                      borderColor: isSel ? sub.color : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => setSelectedSubjectId(sub.id)}
                >
                  <Text
                    style={[
                      styles.subChipText,
                      { color: isSel ? '#FFF' : colors.text, fontWeight: isSel ? '700' : '500' },
                    ]}
                  >
                    {sub.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Projected Attendance Scenario Table */}
          <View style={[styles.tableCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableColHeader, { color: colors.textSecondary }]}>SCENARIO</Text>
              <Text style={[styles.tableColHeader, { color: colors.textSecondary, textAlign: 'right' }]}>PROJECTED %</Text>
            </View>

            {scenarios.map((sc, i) => {
              const isShortage = sc.pct < activeStats.target;
              const isImprovement = sc.type === 'attend';

              return (
                <View
                  key={i}
                  style={[
                    styles.tableRow,
                    { borderBottomColor: colors.borderSubtle },
                    i === scenarios.length - 1 && { borderBottomWidth: 0 },
                    sc.missDelta === 1 && { backgroundColor: colors.card }, // highlight miss tomorrow
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name={isImprovement ? 'trending-up' : 'trending-down'}
                      size={14}
                      color={isImprovement ? colors.present : isShortage ? colors.absent : colors.cancelled}
                    />
                    <Text
                      style={[
                        styles.scenarioLabel,
                        { color: colors.text },
                        sc.missDelta === 1 && { fontWeight: '800' },
                      ]}
                    >
                      {sc.label}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={[
                        styles.scenarioPct,
                        { color: isShortage ? colors.absent : isImprovement ? colors.present : colors.text },
                      ]}
                    >
                      {sc.pct}%
                    </Text>
                    {isShortage ? (
                      <Badge label="SHORTAGE" variant="danger" size="sm" />
                    ) : (
                      <Badge label="SAFE" variant="success" size="sm" />
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Link to Full Subject-by-Subject Inspector Modal */}
          <TouchableOpacity
            style={[styles.detailsLinkBtn, { borderTopColor: colors.borderSubtle }]}
            onPress={() => setDetailsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.detailsLinkText, { color: colors.primary }]}>
              Open Subject-by-Subject Inspector Sheet
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Subject-by-Subject Bunk Inspector Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Safe Zone & Scenario Inspector
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Subject-by-subject projected attendance breakdown
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailsModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {subjects.map((sub: Subject) => {
                const sStats = getSubjectStats(sub.id);
                const subSafe = sStats.percentage >= sStats.target;
                const subBorderline = subSafe && sStats.safeBunks <= 1;

                // What-if math:
                const simAttendP = sStats.attendedClasses + 1;
                const simAttendT = sStats.totalClasses + 1;
                const simAttendPct = Math.round((simAttendP / simAttendT) * 1000) / 10;

                const simBunkP = sStats.attendedClasses;
                const simBunkT = sStats.totalClasses + 1;
                const simBunkPct = Math.round((simBunkP / simBunkT) * 1000) / 10;

                return (
                  <View
                    key={sub.id}
                    style={[
                      styles.subCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderSubtle,
                        borderLeftWidth: 4,
                        borderLeftColor: sub.color,
                      },
                    ]}
                  >
                    <View style={styles.subCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.subCardName, { color: colors.text }]}>
                          {sub.name}
                        </Text>
                        <Text style={[styles.subCardCode, { color: colors.textSecondary }]}>
                          {sub.code ? `${sub.code} • ` : ''}
                          {sStats.attendedClasses}/{sStats.totalClasses} classes attended
                        </Text>
                      </View>

                      <View style={styles.subCardBadgeBox}>
                        <Text
                          style={[
                            styles.subCardPct,
                            { color: subSafe ? colors.present : colors.absent },
                          ]}
                        >
                          {sStats.percentage}%
                        </Text>
                        <Badge
                          label={subSafe ? (subBorderline ? 'WARNING' : 'SAFE') : 'SHORTAGE'}
                          variant={subSafe ? (subBorderline ? 'warning' : 'success') : 'danger'}
                          size="sm"
                        />
                      </View>
                    </View>

                    {/* Progress Track */}
                    <View style={[styles.subProgressTrack, { backgroundColor: colors.surfaceVariant }]}>
                      <View
                        style={[
                          styles.subProgressBar,
                          {
                            width: `${Math.min(sStats.percentage, 100)}%`,
                            backgroundColor: subSafe ? colors.present : colors.absent,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.subTargetLine,
                          { left: `${sStats.target}%`, backgroundColor: colors.textSecondary },
                        ]}
                      />
                    </View>

                    {/* Safe Bunk Rule Card */}
                    <View
                      style={[
                        styles.subRuleBox,
                        { backgroundColor: subSafe ? colors.presentBg : colors.absentBg },
                      ]}
                    >
                      <Ionicons
                        name={subSafe ? 'shield-checkmark' : 'alert-circle'}
                        size={16}
                        color={subSafe ? colors.present : colors.absent}
                      />
                      <Text
                        style={[
                          styles.subRuleText,
                          { color: subSafe ? colors.present : colors.absent },
                        ]}
                      >
                        {subSafe
                          ? sStats.safeBunks > 0
                            ? `Safe to miss ${sStats.safeBunks} more ${sStats.safeBunks === 1 ? 'class' : 'classes'} without falling below ${sStats.target}%.`
                            : `At threshold (${sStats.target}%). Bunking next class will result in shortage!`
                          : `Attendance shortage! You must attend next ${sStats.neededToTarget} consecutive ${sStats.neededToTarget === 1 ? 'class' : 'classes'} to reach ${sStats.target}%.`}
                      </Text>
                    </View>

                    {/* Simulator Row */}
                    <View style={styles.simRow}>
                      <View style={[styles.simPill, { backgroundColor: colors.surfaceVariant }]}>
                        <Text style={[styles.simLabel, { color: colors.textSecondary }]}>
                          If Attend Next:
                        </Text>
                        <Text style={[styles.simVal, { color: colors.present }]}>
                          {simAttendPct}%
                        </Text>
                      </View>

                      <View style={[styles.simPill, { backgroundColor: colors.surfaceVariant }]}>
                        <Text style={[styles.simLabel, { color: colors.textSecondary }]}>
                          If Miss Tomorrow:
                        </Text>
                        <Text
                          style={[
                            styles.simVal,
                            { color: simBunkPct < sStats.target ? colors.absent : colors.text },
                          ]}
                        >
                          {simBunkPct}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 18,
    borderRadius: 20,
    marginVertical: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inspectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  inspectBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  percentageNumber: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  classesFraction: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  bunkMetricBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  bunkMetricCount: {
    fontSize: 26,
    fontWeight: '900',
  },
  bunkMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  barBackground: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  targetMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 3,
  },
  simToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
    marginBottom: 6,
  },
  simToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  simulatorSection: {
    marginTop: 10,
    marginBottom: 12,
  },
  simHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  simSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  simSubText: {
    fontSize: 11,
  },
  subjectChipRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  subChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
  },
  subChipText: {
    fontSize: 12,
  },
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tableColHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scenarioLabel: {
    fontSize: 12,
  },
  scenarioPct: {
    fontSize: 13,
    fontWeight: '800',
  },
  detailsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  detailsLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
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
  modalBody: {
    marginBottom: 10,
  },
  subCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  subCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  subCardName: {
    fontSize: 16,
    fontWeight: '800',
  },
  subCardCode: {
    fontSize: 12,
    marginTop: 2,
  },
  subCardBadgeBox: {
    alignItems: 'flex-end',
  },
  subCardPct: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  subProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
  },
  subProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  subTargetLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
  },
  subRuleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 6,
    marginBottom: 8,
  },
  subRuleText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  simRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simPill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  simLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  simVal: {
    fontSize: 12,
    fontWeight: '800',
  },
});
