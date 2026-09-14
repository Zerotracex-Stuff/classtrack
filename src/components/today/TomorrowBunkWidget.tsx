import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Ionicons } from '@expo/vector-icons';
import { DayOfWeek } from '../../types';
import { formatTimeRange } from '../../utils/timeUtils';
import { format } from 'date-fns';

export type TomorrowBunkScope = 'full_day' | 'morning' | 'afternoon' | 'custom';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const TomorrowBunkWidget: React.FC = () => {
  const { colors } = useTheme();
  const { overallStats, subjects, periods, entries, getSubjectStats, settings, holidays } = useApp();

  const [tomorrowScope, setTomorrowScope] = useState<TomorrowBunkScope>('full_day');
  const [customSelectedEntryIds, setCustomSelectedEntryIds] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const { percentage, target, safeBunks, neededToTarget, attendedClasses, totalClasses } = overallStats;
  const isSafe = percentage >= target;

  const tomorrowDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }, []);
  const tomorrowStr = useMemo(() => format(tomorrowDate, 'yyyy-MM-dd'), [tomorrowDate]);
  const tomorrowHoliday = useMemo(() => {
    return holidays.find(h => tomorrowStr >= h.startDate && tomorrowStr <= h.endDate);
  }, [holidays, tomorrowStr]);

  // Compute Tomorrow's Schedule Items
  const tomorrowInfo = useMemo(() => {
    if (tomorrowHoliday) {
      return {
        tomorrowWeekday: 0 as DayOfWeek,
        dayName: '',
        items: [],
        morningCount: 0,
        afternoonCount: 0,
      };
    }
    const tomorrowJsDay = tomorrowDate.getDay(); // 0 = Sun, 1 = Mon...
    const tomorrowWeekday: DayOfWeek = ((tomorrowJsDay + 6) % 7) as DayOfWeek;
    const dayName = DAY_NAMES[tomorrowWeekday];

    const dayEntries = entries.filter(e => e.weekday === tomorrowWeekday && e.subjectId);

    const items = dayEntries.map(entry => {
      const period = periods.find(p => p.id === entry.periodId);
      const subject = subjects.find(s => s.id === entry.subjectId);

      let startMins = 0;
      if (period?.startTime) {
        const parts = period.startTime.split(':').map(Number);
        startMins = (parts[0] || 0) * 60 + (parts[1] || 0);
      }

      const isMorning = startMins < 780; // 1:00 PM cutoff
      const room = entry.roomOverride || subject?.room || '';
      const teacher = entry.teacherOverride || entry.teacher || subject?.teacher || '';

      return {
        entry,
        period,
        subject,
        startMins,
        isMorning,
        isAfternoon: !isMorning,
        room,
        teacher,
      };
    }).sort((a, b) => (a.period?.ord ?? 0) - (b.period?.ord ?? 0) || a.startMins - b.startMins);

    const morningCount = items.filter(i => i.isMorning).length;
    const afternoonCount = items.filter(i => i.isAfternoon).length;

    return {
      tomorrowWeekday,
      dayName,
      items,
      morningCount,
      afternoonCount,
    };
  }, [entries, periods, subjects]);

  // Sync custom selection
  useEffect(() => {
    setCustomSelectedEntryIds(tomorrowInfo.items.map(item => item.entry.id));
  }, [tomorrowInfo.items]);

  const toggleCustomEntry = (entryId: string) => {
    setCustomSelectedEntryIds(prev =>
      prev.includes(entryId) ? prev.filter(id => id !== entryId) : [...prev, entryId]
    );
  };

  // Selected bunk items
  const selectedBunkItems = useMemo(() => {
    if (tomorrowScope === 'full_day') return tomorrowInfo.items;
    if (tomorrowScope === 'morning') return tomorrowInfo.items.filter(item => item.isMorning);
    if (tomorrowScope === 'afternoon') return tomorrowInfo.items.filter(item => item.isAfternoon);
    return tomorrowInfo.items.filter(item => customSelectedEntryIds.includes(item.entry.id));
  }, [tomorrowScope, tomorrowInfo.items, customSelectedEntryIds]);

  // Impact Math
  const impact = useMemo(() => {
    const missedCount = selectedBunkItems.length;
    const A = attendedClasses;
    const T = totalClasses;

    const newTotal = T + missedCount;
    const newAttended = A;
    const newPct = newTotal > 0 ? Math.round((newAttended / newTotal) * 1000) / 10 : 100;
    const pctDrop = Math.max(0, Math.round((percentage - newPct) * 10) / 10);

    const targetFrac = target / 100;
    const newSafeBunks = newPct >= target ? Math.max(0, Math.floor((newAttended - targetFrac * newTotal) / targetFrac)) : 0;
    const newNeededToTarget = newPct < target ? Math.max(0, Math.ceil((targetFrac * newTotal - newAttended) / (1 - targetFrac))) : 0;
    const safeBunksDelta = newSafeBunks - safeBunks;

    // Subject breakdown
    const subjectMissMap: Record<string, number> = {};
    selectedBunkItems.forEach(item => {
      if (item.subject?.id) {
        subjectMissMap[item.subject.id] = (subjectMissMap[item.subject.id] || 0) + 1;
      }
    });

    const subjectImpacts = Object.keys(subjectMissMap).map(subId => {
      const subject = subjects.find(s => s.id === subId);
      const sStats = getSubjectStats(subId);
      const missedSubCount = subjectMissMap[subId];

      const sNewTotal = sStats.totalClasses + missedSubCount;
      const sNewAttended = sStats.attendedClasses;
      const sNewPct = sNewTotal > 0 ? Math.round((sNewAttended / sNewTotal) * 1000) / 10 : 100;
      const sPctDrop = Math.max(0, Math.round((sStats.percentage - sNewPct) * 10) / 10);

      return {
        subId,
        subjectName: subject?.name || 'Subject',
        missedCount: missedSubCount,
        curPct: sStats.percentage,
        newPct: sNewPct,
        pctDrop: sPctDrop,
        willBeShortage: sNewPct < sStats.target,
      };
    });

    return {
      missedCount,
      curPct: percentage,
      newPct,
      pctDrop,
      curSafe: safeBunks,
      newSafeBunks,
      safeBunksDelta,
      curNeeded: neededToTarget,
      newNeededToTarget,
      willBeShortage: newPct < target,
      subjectImpacts,
    };
  }, [selectedBunkItems, overallStats, subjects, getSubjectStats, percentage, target, safeBunks, neededToTarget, attendedClasses, totalClasses]);

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: impact.willBeShortage ? colors.absent : colors.borderSubtle,
        },
      ]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Ionicons name="calculator-outline" size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Tomorrow Bunk Impact
          </Text>
          <Text style={[styles.dayBadge, { color: colors.textSecondary }]}>
            ({tomorrowInfo.dayName})
          </Text>
        </View>

        <Badge
          label={
            impact.willBeShortage
              ? 'SHORTAGE'
              : impact.newSafeBunks <= 1
              ? 'BORDERLINE'
              : 'SAFE'
          }
          variant={
            impact.willBeShortage
              ? 'danger'
              : impact.newSafeBunks <= 1
              ? 'warning'
              : 'success'
          }
          size="sm"
        />
      </View>

      {tomorrowInfo.items.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {tomorrowHoliday
            ? `🌴 Tomorrow is a Holiday (${tomorrowHoliday.name}) — Attendance paused, no classes! 🎉`
            : `No classes tomorrow (${tomorrowInfo.dayName}) 🎉`}
        </Text>
      ) : (
        <>
          {/* Segmented Scope Bar */}
          <View style={[styles.segmentedBar, { backgroundColor: colors.surfaceVariant }]}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                tomorrowScope === 'full_day' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setTomorrowScope('full_day')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: tomorrowScope === 'full_day' ? colors.onPrimary : colors.textSecondary },
                ]}
              >
                Full Day ({tomorrowInfo.items.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                tomorrowScope === 'morning' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setTomorrowScope('morning')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: tomorrowScope === 'morning' ? colors.onPrimary : colors.textSecondary },
                ]}
              >
                Morning ({tomorrowInfo.morningCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                tomorrowScope === 'afternoon' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setTomorrowScope('afternoon')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: tomorrowScope === 'afternoon' ? colors.onPrimary : colors.textSecondary },
                ]}
              >
                Afternoon ({tomorrowInfo.afternoonCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                tomorrowScope === 'custom' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setTomorrowScope('custom')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: tomorrowScope === 'custom' ? colors.onPrimary : colors.textSecondary },
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {/* Custom Toggles */}
          {tomorrowScope === 'custom' && (
            <View style={styles.customWrap}>
              {tomorrowInfo.items.map(item => {
                const isSel = customSelectedEntryIds.includes(item.entry.id);
                return (
                  <TouchableOpacity
                    key={item.entry.id}
                    style={[
                      styles.customChip,
                      {
                        backgroundColor: isSel ? colors.absentBg : colors.surfaceVariant,
                        borderColor: isSel ? colors.absent : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => toggleCustomEntry(item.entry.id)}
                  >
                    <Ionicons
                      name={isSel ? 'close' : 'add'}
                      size={12}
                      color={isSel ? colors.absent : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.customChipText,
                        { color: isSel ? colors.absent : colors.text },
                      ]}
                    >
                      {item.subject?.name || 'Class'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Minimal Impact Summary Grid */}
          <View style={[styles.impactGrid, { backgroundColor: colors.surfaceVariant }]}>
            <View style={styles.metricCol}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Attendance Drop
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={[styles.metricVal, { color: colors.text }]}>{impact.curPct}%</Text>
                <Ionicons name="arrow-forward" size={11} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.metricVal,
                    { color: impact.willBeShortage ? colors.absent : colors.primary },
                  ]}
                >
                  {impact.newPct}%
                </Text>
                {impact.pctDrop > 0 && (
                  <Text style={[styles.dropPill, { color: colors.absent }]}>
                    (-{impact.pctDrop}%)
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            <View style={styles.metricCol}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                {impact.willBeShortage ? 'Classes Needed' : 'Safe Bunks'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={[styles.metricVal, { color: colors.text }]}>
                  {isSafe ? impact.curSafe : impact.curNeeded}
                </Text>
                <Ionicons name="arrow-forward" size={11} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.metricVal,
                    { color: impact.willBeShortage ? colors.absent : colors.present },
                  ]}
                >
                  {impact.willBeShortage ? impact.newNeededToTarget : impact.newSafeBunks}
                </Text>
              </View>
            </View>
          </View>

          {/* Expandable Details Accordion Toggle */}
          <TouchableOpacity
            style={styles.detailsToggle}
            onPress={() => setShowDetails(prev => !prev)}
            activeOpacity={0.7}
          >
            <Text style={[styles.detailsToggleText, { color: colors.primary }]}>
              {showDetails ? 'Hide Missed Classes ▲' : `View ${selectedBunkItems.length} Missed Subjects ▼`}
            </Text>
          </TouchableOpacity>

          {/* Collapsible Details */}
          {showDetails && (
            <View style={styles.detailsContainer}>
              {selectedBunkItems.map((item, idx) => {
                const timeStr = formatTimeRange(
                  item.period?.startTime,
                  item.period?.endTime,
                  settings.timeFormat || '12h'
                );
                return (
                  <View key={`${item.entry.id}-${idx}`} style={styles.miniItemRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <View style={[styles.colorDot, { backgroundColor: item.subject?.color || colors.primary }]} />
                      <Text style={[styles.miniSubjectName, { color: colors.text }]} numberOfLines={1}>
                        {item.subject?.name || 'Subject'}
                      </Text>
                      {item.room ? (
                        <Text style={[styles.miniMeta, { color: colors.textSecondary }]}>
                          ({item.room})
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.miniTime, { color: colors.textSecondary }]}>
                      {timeStr}
                    </Text>
                  </View>
                );
              })}

              {impact.subjectImpacts.length > 0 && (
                <View style={styles.subjectDropsWrap}>
                  {impact.subjectImpacts.map(sImp => (
                    <Text key={sImp.subId} style={[styles.subjectDropChip, { color: colors.textSecondary }]}>
                      • <Text style={{ fontWeight: '700', color: colors.text }}>{sImp.subjectName}</Text>: {sImp.curPct}% ➔ {sImp.newPct}% (-{sImp.pctDrop}%)
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
  },
  dayBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 12,
    paddingVertical: 4,
  },
  segmentedBar: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 10,
    fontWeight: '700',
  },
  customWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  customChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  customChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  impactGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '900',
  },
  dropPill: {
    fontSize: 10,
    fontWeight: '800',
  },
  divider: {
    width: 1,
    height: '70%',
  },
  detailsToggle: {
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 2,
  },
  detailsToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  miniItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniSubjectName: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniMeta: {
    fontSize: 10,
  },
  miniTime: {
    fontSize: 10,
    fontWeight: '500',
  },
  subjectDropsWrap: {
    marginTop: 4,
  },
  subjectDropChip: {
    fontSize: 10,
    lineHeight: 15,
  },
});
