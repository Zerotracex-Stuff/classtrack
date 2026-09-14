import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceStatus, Subject, Period } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { formatTime, formatTimeRange } from '../../utils/timeUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 110;

interface DeckItem {
  id: string;
  subject: Subject;
  period: Period;
  room?: string;
  teacher?: string;
  status?: AttendanceStatus;
}

export const SwipeDeck: React.FC = () => {
  const { colors, isDark } = useTheme();
  const {
    periods,
    entries,
    getSubject,
    attendance,
    markAttendance,
    removeAttendance,
    settings,
    holidays,
  } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock tick every minute to update past/present/future states
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const today = currentTime;
  const rawDay = today.getDay();
  const todayWeekday = ((rawDay + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const todayStr = format(today, 'yyyy-MM-dd');

  // Check if today is a holiday
  const isTodayHoliday = holidays.some(
    h => todayStr >= h.startDate && todayStr <= h.endDate
  );

  const getMinutes = (t: string) => {
    const parts = (t || '00:00').split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Build list of today's academic periods (excluding breaks), sorted by time
  const todayClasses: DeckItem[] = React.useMemo(() => {
    if (isTodayHoliday || !settings.workingDays.includes(todayWeekday)) return [];

    const sortedPeriods = [...periods]
      .filter(p => !p.isBreak)
      .sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime));

    const items: DeckItem[] = [];
    for (const p of sortedPeriods) {
      const entry = entries.find(e => e.weekday === todayWeekday && e.periodId === p.id);
      if (entry?.subjectId) {
        const sub = getSubject(entry.subjectId);
        if (sub) {
          const rec = attendance.find(
            a => a.date === todayStr && a.subjectId === sub.id && a.periodId === p.id
          );
          items.push({
            id: `${todayStr}_${sub.id}_${p.id}`,
            subject: sub,
            period: p,
            room: entry.roomOverride || sub.room,
            teacher: entry.teacher || entry.teacherOverride || sub.teacher,
            status: rec?.status,
          });
        }
      }
    }
    return items;
  }, [periods, entries, getSubject, attendance, settings.workingDays, todayWeekday, todayStr]);

  // Track the history of marked items for Undo functionality
  const [history, setHistory] = useState<DeckItem[]>([]);

  // Split into Past/Present (eligible to be marked) vs Future (coming soon)
  const pastOrPresentClasses = todayClasses.filter(
    c => getMinutes(c.period.startTime) <= currentMinutes
  );
  const futureClasses = todayClasses.filter(
    c => getMinutes(c.period.startTime) > currentMinutes
  );

  // Filter only unmarked past/present classes for the swipe deck
  const unmarkedClasses = pastOrPresentClasses.filter(c => !c.status);
  const currentItem = unmarkedClasses[0];
  const nextItem = unmarkedClasses[1];

  // Animated values for the card
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else if (gesture.dy < -SWIPE_THRESHOLD) {
          forceSwipe('up');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const forceSwipe = (direction: 'right' | 'left' | 'up') => {
    const x =
      direction === 'right' ? SCREEN_WIDTH + 100 : direction === 'left' ? -SCREEN_WIDTH - 100 : 0;
    const y = direction === 'up' ? -500 : 0;

    Animated.timing(position, {
      toValue: { x, y },
      duration: 250,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onSwipeComplete(direction);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const onSwipeComplete = (direction: 'right' | 'left' | 'up') => {
    if (!currentItem) return;

    let status: AttendanceStatus = 'present';
    if (direction === 'left') status = 'absent';
    if (direction === 'up') status = 'not_held';

    markAttendance(currentItem.subject.id, todayStr, status, undefined, currentItem.period.id);
    setHistory(prev => [currentItem, ...prev]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastItem = history[0];
    removeAttendance(lastItem.subject.id, todayStr, lastItem.period.id);
    setHistory(prev => prev.slice(1));
  };

  // Interpolations for drag gestures
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
    outputRange: ['-25deg', '0deg', '25deg'],
  });

  const cardStyle = {
    transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
  };

  const presentOpacity = position.x.interpolate({
    inputRange: [15, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const absentOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -15],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const cancelledOpacity = position.y.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -15],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (isTodayHoliday || todayClasses.length === 0) {
    return null;
  }

  const presentCount = todayClasses.filter(c => c.status === 'present').length;
  const absentCount = todayClasses.filter(c => c.status === 'absent').length;
  const cancelledCount = todayClasses.filter(c => c.status === 'not_held').length;
  const pendingCount = todayClasses.filter(c => !c.status).length;

  return (
    <View style={styles.deckContainer}>
      {/* 1. When there are past or ongoing classes to mark */}
      {currentItem ? (
        <View>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Mark Attendance</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Swipe Right: Present • Swipe Left: Absent • Up: Cancelled
              </Text>
            </View>
            <Badge
              label={`${pastOrPresentClasses.length - unmarkedClasses.length + 1}/${pastOrPresentClasses.length}`}
              variant="primary"
              size="sm"
            />
          </View>

          {/* Card Deck Area */}
          <View style={styles.cardArea}>
            {/* Next Card underneath */}
            {nextItem && (
              <View
                style={[
                  styles.card,
                  styles.cardUnderneath,
                  { backgroundColor: colors.card, borderColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Badge label={nextItem.period.label} variant="neutral" size="sm" />
                    <Text style={[styles.cardTime, { color: colors.textSecondary }]}>
                      {formatTimeRange(nextItem.period.startTime, nextItem.period.endTime, settings.timeFormat || '12h')}
                    </Text>
                  </View>

                  <View style={styles.cardMain}>
                    <View style={[styles.subjectCircle, { backgroundColor: nextItem.subject.color }]}>
                      <Text style={styles.subjectInitials}>
                        {nextItem.subject.code || nextItem.subject.name.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.cardSubjectTitle, { color: colors.text }]}>
                      {nextItem.subject.name}
                    </Text>
                    {nextItem.teacher && (
                      <Text style={[styles.cardTeacher, { color: colors.textSecondary }]}>
                        {nextItem.teacher}
                      </Text>
                    )}
                    {nextItem.room && (
                      <Text style={[styles.cardRoom, { color: colors.textTertiary }]}>
                        📍 {nextItem.room}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Active Draggable Card */}
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.card,
                cardStyle,
                { backgroundColor: colors.card, borderColor: isDark ? colors.borderSubtle : '#E5E7EB' },
              ]}
            >
              {/* Stamps */}
              <Animated.View
                style={[
                  styles.stamp,
                  styles.presentStamp,
                  { opacity: presentOpacity, borderColor: colors.present },
                ]}
              >
                <Text style={[styles.stampText, { color: colors.present }]}>PRESENT</Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.stamp,
                  styles.absentStamp,
                  { opacity: absentOpacity, borderColor: colors.absent },
                ]}
              >
                <Text style={[styles.stampText, { color: colors.absent }]}>ABSENT</Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.stamp,
                  styles.cancelledStamp,
                  { opacity: cancelledOpacity, borderColor: colors.cancelled },
                ]}
              >
                <Text style={[styles.stampText, { color: colors.cancelled }]}>CANCELLED</Text>
              </Animated.View>

              {/* Card Content */}
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Badge
                    label={
                      getMinutes(currentItem.period.endTime) < currentMinutes
                        ? `${currentItem.period.label} (COMPLETED)`
                        : `${currentItem.period.label} (IN PROGRESS)`
                    }
                    variant={
                      getMinutes(currentItem.period.endTime) < currentMinutes
                        ? 'neutral'
                        : 'primary'
                    }
                    size="sm"
                  />
                  <Text style={[styles.cardTime, { color: colors.textSecondary }]}>
                    {formatTimeRange(currentItem.period.startTime, currentItem.period.endTime, settings.timeFormat || '12h')}
                  </Text>
                </View>

                <View style={styles.cardMain}>
                  <View
                    style={[
                      styles.subjectCircle,
                      { backgroundColor: currentItem.subject.color },
                    ]}
                  >
                    <Text style={styles.subjectInitials}>
                      {currentItem.subject.code ||
                        currentItem.subject.name.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <Text style={[styles.cardSubjectTitle, { color: colors.text }]}>
                    {currentItem.subject.name}
                  </Text>

                  {currentItem.teacher && (
                    <Text style={[styles.cardTeacher, { color: colors.textSecondary }]}>
                      {currentItem.teacher}
                    </Text>
                  )}

                  {currentItem.room && (
                    <Text style={[styles.cardRoom, { color: colors.textTertiary }]}>
                      📍 {currentItem.room}
                    </Text>
                  )}
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Action Buttons Below Cards */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.roundButton,
                styles.undoBtn,
                { backgroundColor: colors.surfaceVariant, opacity: history.length > 0 ? 1 : 0.4 },
              ]}
              onPress={handleUndo}
              disabled={history.length === 0}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-undo" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roundButton, styles.absentBtn, { backgroundColor: colors.absentBg }]}
              onPress={() => forceSwipe('left')}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color={colors.absent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roundButton, styles.cancelledBtn, { backgroundColor: colors.cancelledBg }]}
              onPress={() => forceSwipe('up')}
              activeOpacity={0.7}
            >
              <Ionicons name="remove-outline" size={24} color={colors.cancelled} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roundButton, styles.presentBtn, { backgroundColor: colors.presentBg }]}
              onPress={() => forceSwipe('right')}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={30} color={colors.present} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* 2. When all past/ongoing classes are already marked */
        <Card
          style={[
            styles.completedCard,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.completedContainer}>
            <View style={[styles.completedIconCircle, { backgroundColor: colors.presentBg }]}>
              <Ionicons
                name={futureClasses.length > 0 ? 'time' : 'checkmark-done'}
                size={34}
                color={colors.present}
              />
            </View>
            <Text style={[styles.completedTitle, { color: colors.text }]}>
              {futureClasses.length > 0
                ? 'All Caught Up for Now! 👍'
                : 'All Classes Marked! 🎉'}
            </Text>
            <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
              {futureClasses.length > 0
                ? `You've marked all previous classes. Next class begins at ${formatTime(futureClasses[0].period.startTime, settings.timeFormat || '12h')}.`
                : "Today's attendance tally is fully logged."}
            </Text>

            <View style={styles.tallyRow}>
              <View style={[styles.tallyPill, { backgroundColor: colors.presentBg }]}>
                <Text style={[styles.tallyNumber, { color: colors.present }]}>
                  {presentCount}
                </Text>
                <Text style={[styles.tallyLabel, { color: colors.present }]}>Present</Text>
              </View>
              <View style={[styles.tallyPill, { backgroundColor: colors.absentBg }]}>
                <Text style={[styles.tallyNumber, { color: colors.absent }]}>{absentCount}</Text>
                <Text style={[styles.tallyLabel, { color: colors.absent }]}>Absent</Text>
              </View>
              <View style={[styles.tallyPill, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.tallyNumber, { color: colors.textSecondary }]}>
                  {pendingCount}
                </Text>
                <Text style={[styles.tallyLabel, { color: colors.textTertiary }]}>Pending</Text>
              </View>
              {cancelledCount > 0 && (
                <View style={[styles.tallyPill, { backgroundColor: colors.cancelledBg }]}>
                  <Text style={[styles.tallyNumber, { color: colors.cancelled }]}>
                    {cancelledCount}
                  </Text>
                  <Text style={[styles.tallyLabel, { color: colors.cancelled }]}>Cancelled</Text>
                </View>
              )}
            </View>

            {history.length > 0 && (
              <TouchableOpacity
                style={[styles.undoButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={handleUndo}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-undo-outline" size={16} color={colors.text} />
                <Text style={[styles.undoText, { color: colors.text }]}>Undo Last Mark</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      )}

      {/* 3. FUTURE CLASSES: "Coming Soon" section */}
      {futureClasses.length > 0 && (
        <View style={styles.futureSection}>
          <View style={styles.futureHeader}>
            <Text style={[styles.futureTitle, { color: colors.text }]}>
              Coming Up Later Today
            </Text>
            <Badge label={`${futureClasses.length} upcoming`} variant="neutral" size="sm" />
          </View>

          {futureClasses.map(item => {
            const minutesUntil = getMinutes(item.period.startTime) - currentMinutes;
            const hoursUntil = Math.floor(minutesUntil / 60);
            const remainingMins = minutesUntil % 60;
            const timeUntilStr =
              hoursUntil > 0
                ? `in ${hoursUntil}h ${remainingMins}m`
                : `in ${remainingMins}m`;

            return (
              <Card
                key={item.id}
                style={[
                  styles.futureCard,
                  { backgroundColor: colors.card, borderColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.futureRow}>
                  <View
                    style={[styles.futureColorPill, { backgroundColor: item.subject.color }]}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.futureSubjectName, { color: colors.text }]}>
                      {item.subject.name}
                    </Text>
                    <Text style={[styles.futureMeta, { color: colors.textSecondary }]}>
                      {item.period.label} • {item.period.startTime} - {item.period.endTime}
                      {item.room ? ` • 📍 ${item.room}` : ''}
                    </Text>
                  </View>

                  <Badge
                    label={`Coming soon (${timeUntilStr})`}
                    variant="neutral"
                    size="sm"
                    icon={<Ionicons name="hourglass-outline" size={12} color={colors.textSecondary} />}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  deckContainer: {
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  cardArea: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: 240,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    justifyContent: 'center',
  },
  cardUnderneath: {
    transform: [{ scale: 0.94 }, { translateY: 10 }],
    opacity: 0.75,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardMain: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  subjectCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  subjectInitials: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  cardSubjectTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  cardTeacher: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  cardRoom: {
    fontSize: 13,
    marginTop: 4,
  },
  stamp: {
    position: 'absolute',
    top: 20,
    borderWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    zIndex: 99,
  },
  presentStamp: {
    left: 20,
    transform: [{ rotate: '-15deg' }],
  },
  absentStamp: {
    right: 20,
    transform: [{ rotate: '15deg' }],
  },
  cancelledStamp: {
    alignSelf: 'center',
    top: '40%',
    transform: [{ rotate: '0deg' }],
  },
  stampText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 16,
  },
  roundButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  undoBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  absentBtn: {},
  cancelledBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  presentBtn: {},
  completedCard: {
    padding: 0,
    borderRadius: 24,
    borderWidth: 1,
  },
  completedContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  completedIconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  completedSubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  tallyRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 12,
  },
  tallyPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 76,
  },
  tallyNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  tallyLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  undoText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  futureSection: {
    marginTop: 20,
  },
  futureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  futureTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  futureCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 4,
  },
  futureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  futureColorPill: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  futureSubjectName: {
    fontSize: 14,
    fontWeight: '700',
  },
  futureMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
