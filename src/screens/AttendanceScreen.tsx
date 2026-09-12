import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { BunkCalculator } from '../components/attendance/BunkCalculator';
import { HeatmapCalendar } from '../components/attendance/HeatmapCalendar';
import { AttendanceAnalyticsChart } from '../components/attendance/AttendanceAnalyticsChart';
import { SubjectAttendanceCard } from '../components/attendance/SubjectAttendanceCard';
import { Subject } from '../types';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CategoryGroup {
  name: string;
  subjects: Subject[];
  totalClasses: number;
  attendedClasses: number;
  missedClasses: number;
  percentage: number;
  safeBunks: number;
  neededToTarget: number;
  isSafe: boolean;
}

export const AttendanceScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { subjects, overallStats, getSubjectStats, settings } = useApp();

  const targetAttendance = settings.targetAttendance || 75;

  // Check if any subject has a category assigned
  const hasAnyCategories = useMemo(() => {
    return subjects.some(s => s.category && s.category.trim().length > 0);
  }, [subjects]);

  const [viewMode, setViewMode] = useState<'category' | 'all'>(
    hasAnyCategories ? 'category' : 'all'
  );

  // Track expanded state of each category; default to all expanded initially
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Group subjects by category and calculate aggregate metrics
  const categoryGroups: CategoryGroup[] = useMemo(() => {
    const map = new Map<string, Subject[]>();

    subjects.forEach(s => {
      const cat = s.category?.trim() ? s.category.trim() : 'General / Other';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(s);
    });

    const groups: CategoryGroup[] = [];

    map.forEach((subList, catName) => {
      let catAttended = 0;
      let catTotal = 0;
      let catMissed = 0;

      subList.forEach(s => {
        const stats = getSubjectStats(s.id);
        catAttended += stats.attendedClasses;
        catTotal += stats.totalClasses;
        catMissed += stats.missedClasses;
      });

      const pct = catTotal > 0 ? Math.round((catAttended / catTotal) * 100) : 100;
      const targetFrac = targetAttendance / 100;
      let safeBunks = 0;
      let neededToTarget = 0;

      if (catTotal > 0) {
        if (pct >= targetAttendance) {
          safeBunks = Math.max(
            0,
            Math.floor((catAttended - targetFrac * catTotal) / targetFrac)
          );
        } else {
          neededToTarget = Math.max(
            0,
            Math.ceil((targetFrac * catTotal - catAttended) / (1 - targetFrac))
          );
        }
      }

      groups.push({
        name: catName,
        subjects: subList,
        totalClasses: catTotal,
        attendedClasses: catAttended,
        missedClasses: catMissed,
        percentage: pct,
        safeBunks,
        neededToTarget,
        isSafe: pct >= targetAttendance,
      });
    });

    // Sort: categories with more subjects first, 'General / Other' last
    return groups.sort((a, b) => {
      if (a.name === 'General / Other') return 1;
      if (b.name === 'General / Other') return -1;
      return b.subjects.length - a.subjects.length;
    });
  }, [subjects, getSubjectStats, targetAttendance]);

  const toggleCategory = (catName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategories(prev => ({
      ...prev,
      // If undefined, default was expanded (true), so toggle to false
      [catName]: prev[catName] === false ? true : false,
    }));
  };

  const isCategoryExpanded = (catName: string) => {
    return expandedCategories[catName] !== false; // default expanded
  };

  const expandAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const allState: Record<string, boolean> = {};
    categoryGroups.forEach(g => {
      allState[g.name] = true;
    });
    setExpandedCategories(allState);
  };

  const collapseAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const allState: Record<string, boolean> = {};
    categoryGroups.forEach(g => {
      allState[g.name] = false;
    });
    setExpandedCategories(allState);
  };

  const getCategoryIcon = (catName: string) => {
    const lower = catName.toLowerCase();
    if (lower.includes('lab') || lower.includes('practical')) return 'flask-outline';
    if (lower.includes('theory') || lower.includes('lecture')) return 'book-outline';
    if (lower.includes('elective')) return 'color-wand-outline';
    if (lower.includes('core') || lower.includes('major')) return 'ribbon-outline';
    if (lower.includes('math') || lower.includes('stat')) return 'calculator-outline';
    if (lower.includes('code') || lower.includes('tech') || lower.includes('cs')) return 'code-slash-outline';
    return 'folder-outline';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Attendance Tracker"
        subtitle={`Overall: ${overallStats.percentage}% • Target: ${overallStats.target}%`}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Smart Bunk Calculator Widget */}
        <BunkCalculator />

        {/* Visual Weekly & Monthly Attendance Analytics Chart */}
        <AttendanceAnalyticsChart />

        {/* Monthly Heatmap Calendar */}
        <HeatmapCalendar />

        {/* Subject-wise / Category Attendance Breakdown */}
        <View style={styles.subjectsSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Attendance Breakdown
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                {viewMode === 'category'
                  ? 'Showing category totals and individual subjects'
                  : 'Showing all individual subjects'}
              </Text>
            </View>

            {/* View Mode Segmented Controls */}
            {hasAnyCategories && (
              <View style={[styles.segmentedPill, { backgroundColor: colors.surfaceVariant }]}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    viewMode === 'category' && [
                      styles.segmentButtonActive,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                  onPress={() => setViewMode('category')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="folder-outline"
                    size={14}
                    color={viewMode === 'category' ? colors.onPrimary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: viewMode === 'category' ? colors.onPrimary : colors.textSecondary,
                        fontWeight: viewMode === 'category' ? '700' : '500',
                      },
                    ]}
                  >
                    By Category
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    viewMode === 'all' && [
                      styles.segmentButtonActive,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                  onPress={() => setViewMode('all')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="list-outline"
                    size={14}
                    color={viewMode === 'all' ? colors.onPrimary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: viewMode === 'all' ? colors.onPrimary : colors.textSecondary,
                        fontWeight: viewMode === 'all' ? '700' : '500',
                      },
                    ]}
                  >
                    All Subjects
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Expand/Collapse All buttons in Category Mode */}
          {viewMode === 'category' && categoryGroups.length > 1 && (
            <View style={styles.bulkActionsRow}>
              <TouchableOpacity
                style={[styles.bulkBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={expandAll}
                activeOpacity={0.7}
              >
                <Ionicons name="expand-outline" size={13} color={colors.primary} />
                <Text style={[styles.bulkBtnText, { color: colors.primary }]}>Expand All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkBtn, { backgroundColor: colors.surfaceVariant, marginLeft: 8 }]}
                onPress={collapseAll}
                activeOpacity={0.7}
              >
                <Ionicons name="contract-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.bulkBtnText, { color: colors.textSecondary }]}>Collapse All</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* VIEW MODE 1: CATEGORY GROUPED VIEW */}
          {viewMode === 'category' ? (
            categoryGroups.map(group => {
              const expanded = isCategoryExpanded(group.name);
              return (
                <View key={group.name} style={styles.categorySectionWrapper}>
                  {/* Category Summary Card */}
                  <Card
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => toggleCategory(group.name)}
                      activeOpacity={0.7}
                    >
                      {/* Category Header Row */}
                      <View style={styles.categoryHeader}>
                        <View style={styles.categoryLeft}>
                          <View
                            style={[
                              styles.categoryIconCircle,
                              { backgroundColor: colors.primaryContainer },
                            ]}
                          >
                            <Ionicons
                              name={getCategoryIcon(group.name) as any}
                              size={20}
                              color={colors.primary}
                            />
                          </View>
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <View style={styles.catTitleRow}>
                              <Text style={[styles.categoryTitle, { color: colors.text }]}>
                                {group.name}
                              </Text>
                              <View
                                style={[
                                  styles.subjectCountPill,
                                  { backgroundColor: colors.surfaceVariant },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.subjectCountText,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  {group.subjects.length} {group.subjects.length === 1 ? 'subject' : 'subjects'}
                                </Text>
                              </View>
                            </View>
                            <Text
                              style={[styles.categorySubtitle, { color: colors.textSecondary }]}
                            >
                              {group.attendedClasses}/{group.totalClasses} classes attended
                            </Text>
                          </View>
                        </View>

                        {/* Category Percentage & Status Pill */}
                        <View style={styles.categoryRight}>
                          <Text
                            style={[
                              styles.categoryPercentage,
                              { color: group.isSafe ? colors.present : colors.absent },
                            ]}
                          >
                            {group.percentage}%
                          </Text>
                          <Badge
                            label={group.isSafe ? 'SAFE 🛡️' : 'SHORTAGE 🚨'}
                            variant={group.isSafe ? 'success' : 'danger'}
                            size="sm"
                          />
                        </View>
                      </View>

                      {/* Category Progress Bar */}
                      <View
                        style={[
                          styles.progressTrack,
                          { backgroundColor: colors.surfaceVariant },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${Math.min(group.percentage, 100)}%`,
                              backgroundColor: group.isSafe ? colors.present : colors.absent,
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.targetLine,
                            { left: `${targetAttendance}%`, backgroundColor: colors.textSecondary },
                          ]}
                        />
                      </View>

                      {/* Category Footer: Safe Bunks & Expand/Collapse Prompt */}
                      <View style={styles.categoryFooter}>
                        <View style={styles.bunkMarginRow}>
                          <Ionicons
                            name={group.isSafe ? 'checkmark-circle' : 'alert-circle'}
                            size={14}
                            color={group.isSafe ? colors.present : colors.absent}
                          />
                          <Text
                            style={[
                              styles.bunkMarginText,
                              { color: group.isSafe ? colors.present : colors.absent },
                            ]}
                          >
                            {group.isSafe
                              ? `~${group.safeBunks} safe bunks left`
                              : `Attend next ${group.neededToTarget} to reach ${targetAttendance}%`}
                          </Text>
                        </View>

                        <View style={styles.expandTrigger}>
                          <Text
                            style={[styles.expandTriggerText, { color: colors.primary }]}
                          >
                            {expanded ? 'Hide Subjects' : `Show ${group.subjects.length} Subjects`}
                          </Text>
                          <Ionicons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={15}
                            color={colors.primary}
                            style={{ marginLeft: 3 }}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Card>

                  {/* Nested Individual Subject Cards */}
                  {expanded && (
                    <View style={styles.nestedSubjectsContainer}>
                      {group.subjects.map((subject: Subject) => (
                        <SubjectAttendanceCard key={subject.id} subject={subject} />
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            /* VIEW MODE 2: ALL SUBJECTS SEPARATE LIST */
            <View style={styles.allSubjectsContainer}>
              {subjects.map((subject: Subject) => (
                <SubjectAttendanceCard key={subject.id} subject={subject} />
              ))}
            </View>
          )}

          {subjects.length === 0 && (
            <Card style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="book-outline" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Subjects Added</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Add subjects with categories in the Timetable tab to start tracking your attendance.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  subjectsSection: {
    marginTop: 14,
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  segmentedPill: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  segmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  segmentButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
  },
  bulkActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  bulkBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categorySectionWrapper: {
    marginBottom: 14,
  },
  categoryCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  categoryIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subjectCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subjectCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categorySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryPercentage: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 10,
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
  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bunkMarginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  bunkMarginText: {
    fontSize: 11,
    fontWeight: '700',
  },
  expandTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  expandTriggerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  nestedSubjectsContainer: {
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#4F46E533',
    marginTop: 8,
  },
  allSubjectsContainer: {
    marginTop: 4,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderRadius: 20,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
