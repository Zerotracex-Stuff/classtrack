import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Exam } from '../../types';
import { format, differenceInCalendarDays, parseISO, isPast, isToday } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

interface ExamCardProps {
  exam: Exam;
}

export const ExamCard: React.FC<ExamCardProps> = ({ exam }) => {
  const { colors } = useTheme();
  const { getSubject, deleteExam } = useApp();

  const subject = exam.subjectId ? getSubject(exam.subjectId) : undefined;
  const examDate = parseISO(exam.date);
  const daysDiff = differenceInCalendarDays(examDate, new Date());

  let countdownText = '';
  let countdownVariant: 'primary' | 'danger' | 'warning' | 'neutral' = 'primary';

  if (isToday(examDate)) {
    countdownText = 'TODAY!';
    countdownVariant = 'danger';
  } else if (daysDiff === 1) {
    countdownText = 'TOMORROW';
    countdownVariant = 'danger';
  } else if (daysDiff > 1) {
    countdownText = `IN ${daysDiff} DAYS`;
    countdownVariant = daysDiff <= 3 ? 'warning' : 'primary';
  } else {
    countdownText = 'COMPLETED';
    countdownVariant = 'neutral';
  }

  const handleDelete = () => {
    deleteExam(exam.id);
  };

  return (
    <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.colorBar,
              { backgroundColor: subject ? subject.color : colors.primary },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{exam.title}</Text>
            {subject && (
              <Text style={[styles.subjectName, { color: colors.textSecondary }]}>
                {subject.name}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: colors.surfaceVariant }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.infoCol}>
          <View style={styles.iconLine}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {format(examDate, 'EEE, MMM d, yyyy')}
            </Text>
          </View>

          {exam.time && (
            <View style={[styles.iconLine, { marginTop: 4 }]}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{exam.time}</Text>
            </View>
          )}

          {exam.venue && (
            <View style={[styles.iconLine, { marginTop: 4 }]}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{exam.venue}</Text>
            </View>
          )}
        </View>

        <View style={styles.badgeCol}>
          <Badge label={countdownText} variant={countdownVariant} size="sm" />
          <Badge
            label={exam.type.toUpperCase()}
            variant="neutral"
            size="sm"
            style={{ marginTop: 6 }}
          />
        </View>
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  colorBar: {
    width: 5,
    height: 36,
    borderRadius: 2.5,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subjectName: {
    fontSize: 13,
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  infoCol: {
    flex: 1,
  },
  iconLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
  },
  badgeCol: {
    alignItems: 'flex-end',
  },
});
