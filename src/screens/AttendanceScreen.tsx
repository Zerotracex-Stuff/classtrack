import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { BunkCalculator } from '../components/attendance/BunkCalculator';
import { HeatmapCalendar } from '../components/attendance/HeatmapCalendar';
import { AttendanceAnalyticsChart } from '../components/attendance/AttendanceAnalyticsChart';
import { SubjectAttendanceCard } from '../components/attendance/SubjectAttendanceCard';
import { Subject } from '../types';

export const AttendanceScreen: React.FC = () => {
  const { colors } = useTheme();
  const { subjects, overallStats } = useApp();

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

        {/* Subject-wise Attendance Breakdown */}
        <View style={styles.subjectsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Subject Breakdown
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Tap + buttons to log extra classes or adjustments
          </Text>

          {subjects.map((subject: Subject) => (
            <SubjectAttendanceCard key={subject.id} subject={subject} />
          ))}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
});
