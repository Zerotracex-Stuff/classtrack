import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DayOfWeek, Period, Subject, TimetableEntry, AttendanceRecord, UserSettings, Holiday } from '../types';
import { format, addDays, startOfDay, isBefore } from 'date-fns';

// Configure foreground & background notification handler
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (err) {
  console.warn('Failed to set notification handler:', err);
}

export const CHANNEL_CLASSES = 'classes-reminder';
export const CHANNEL_ATTENDANCE = 'attendance-reminder';

/**
 * Initialize notification channels (Android) and verify permissions
 */
export async function initNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_CLASSES, {
        name: 'Upcoming Class Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync(CHANNEL_ATTENDANCE, {
        name: 'Unmarked Attendance Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#F59E0B',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Failed to initialize notifications:', error);
    return false;
  }
}

/**
 * Parse time string ("09:00", "09:00 AM", "01:30 PM", "14:15") into 24h hours and minutes
 */
export function parseTime(timeStr: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 9, minutes: 0 };

  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');

  const numOnly = clean.replace(/(AM|PM)/g, '').trim();
  const parts = numOnly.split(':').map(str => parseInt(str.trim(), 10));

  let hours = isNaN(parts[0]) ? 9 : parts[0];
  let minutes = isNaN(parts[1]) ? 0 : parts[1];

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

interface ScheduleParams {
  periods: Period[];
  entries: TimetableEntry[];
  subjects: Subject[];
  attendance: AttendanceRecord[];
  holidays?: Holiday[];
  settings: UserSettings;
}

/**
 * Schedules 10-minute pre-class reminders and post-class unmarked attendance reminders
 * for all scheduled classes in the next 14 days.
 * Works even when app is killed / removed from recents.
 */
export async function scheduleAllReminders({
  periods,
  entries,
  subjects,
  attendance,
  holidays = [],
  settings,
}: ScheduleParams): Promise<number> {
  try {
    const hasPermission = await initNotifications();
    if (!hasPermission) {
      return 0;
    }

    // Cancel previously scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    const notifyBeforeClass = settings.notifyBeforeClass ?? true;
    const notifyUnmarked = settings.notifyUnmarkedAttendance ?? true;
    const minutesBefore = settings.reminderMinutesBefore ?? 10;

    if (!notifyBeforeClass && !notifyUnmarked) {
      return 0;
    }

    const workingDays = settings.workingDays || [0, 1, 2, 3, 4];
    const now = new Date();
    const periodMap = new Map(periods.map(p => [p.id, p]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    let scheduledCount = 0;

    // Helper: check if date is a holiday
    const isHoliday = (dateStr: string) => {
      return holidays.some(h => dateStr >= h.startDate && dateStr <= h.endDate);
    };

    // Schedule for the next 14 calendar days
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const targetDate = addDays(startOfDay(now), dayOffset);
      const targetDateStr = format(targetDate, 'yyyy-MM-dd');

      if (isHoliday(targetDateStr)) {
        continue; // Skip holiday dates
      }

      // Date.getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
      // App weekday: 0 = Mon ... 6 = Sun
      const rawDay = targetDate.getDay();
      const currentWeekday = ((rawDay + 6) % 7) as DayOfWeek;

      if (!workingDays.includes(currentWeekday)) {
        continue;
      }

      // Find all entries for this weekday
      const dayEntries = entries.filter(e => e.weekday === currentWeekday);

      for (const entry of dayEntries) {
        const period = periodMap.get(entry.periodId);
        if (!period || period.isBreak) continue;

        const subject = entry.subjectId ? subjectMap.get(entry.subjectId) : undefined;
        const subjectName = subject ? subject.name : entry.freeText;
        if (!subjectName) continue;

        const room = entry.roomOverride || subject?.room;
        const teacher = entry.teacher || entry.teacherOverride || subject?.teacher;

        // Correctly parse 12h/24h start and end time
        const start = parseTime(period.startTime);
        const end = parseTime(period.endTime);

        const classStartDateTime = new Date(targetDate);
        classStartDateTime.setHours(start.hours, start.minutes, 0, 0);

        const classEndDateTime = new Date(targetDate);
        classEndDateTime.setHours(end.hours, end.minutes, 0, 0);

        // 1. 10-minute Pre-Class Reminder
        if (notifyBeforeClass) {
          const reminderTime = new Date(classStartDateTime.getTime() - minutesBefore * 60 * 1000);

          // Only schedule if reminder time is in the future
          if (isBefore(now, reminderTime)) {
            const bodyDetails = [
              room ? `📍 ${room}` : null,
              teacher ? `👨‍🏫 ${teacher}` : null,
              `🕒 ${period.startTime} - ${period.endTime}`,
            ].filter(Boolean).join(' • ');

            await Notifications.scheduleNotificationAsync({
              content: {
                title: `🔔 ${subjectName} in ${minutesBefore} mins`,
                body: bodyDetails || `Starts at ${period.startTime}`,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: {
                  type: 'class_reminder',
                  subjectId: subject?.id,
                  periodId: period.id,
                  weekday: currentWeekday,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderTime,
                channelId: CHANNEL_CLASSES,
              },
            });
            scheduledCount++;
          }
        }

        // 2. Post-Class Unmarked Attendance Reminder
        if (notifyUnmarked) {
          // Remind 5 minutes after class ends
          const unmarkedReminderTime = new Date(classEndDateTime.getTime() + 5 * 60 * 1000);

          // Check if already marked for this date and subject/period
          const isAlreadyMarked = attendance.some(
            a => a.date === targetDateStr &&
                 (a.periodId ? a.periodId === period.id : true) &&
                 (subject ? a.subjectId === subject.id : true)
          );

          if (!isAlreadyMarked && isBefore(now, unmarkedReminderTime)) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `⚠️ Mark Attendance: ${subjectName}`,
                body: `Did you attend ${period.label} today? Tap to record attendance now.`,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: {
                  type: 'attendance_unmarked',
                  date: targetDateStr,
                  subjectId: subject?.id,
                  periodId: period.id,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: unmarkedReminderTime,
                channelId: CHANNEL_ATTENDANCE,
              },
            });
            scheduledCount++;
          }
        }
      }
    }

    return scheduledCount;
  } catch (err) {
    console.warn('Error scheduling reminders:', err);
    return 0;
  }
}

/**
 * Get count of active scheduled notifications registered in OS daemon
 */
export async function getScheduledNotificationCount(): Promise<number> {
  try {
    const list = await Notifications.getAllScheduledNotificationsAsync();
    return list.length;
  } catch {
    return 0;
  }
}

/**
 * Fires an instant test notification in 1 second to verify setup on phone
 */
export async function sendTestNotification(): Promise<string> {
  const granted = await initNotifications();
  if (!granted) {
    throw new Error('Notification permission not granted. Please allow notifications in Android Settings > Apps > ClassTrack.');
  }

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 ClassTrack Notification Active',
      body: 'Notifications are working! Pre-class & unmarked attendance reminders will arrive automatically.',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: CHANNEL_CLASSES,
    },
  });
  console.log('[NotificationService] Scheduled instant test alert ID:', notifId);
  return notifId;
}

/**
 * Schedules a test notification after specified seconds (default 60s)
 * to verify notifications work when the app is removed from recent apps / killed.
 */
export async function scheduleDelayedNotification(seconds: number = 60): Promise<string> {
  const granted = await initNotifications();
  if (!granted) {
    throw new Error('Notification permission not granted. Please allow notifications in Android Settings > Apps > ClassTrack.');
  }

  // Verify channel exists
  if (Platform.OS === 'android') {
    const channel = await Notifications.getNotificationChannelAsync(CHANNEL_CLASSES);
    if (!channel) {
      await Notifications.setNotificationChannelAsync(CHANNEL_CLASSES, {
        name: 'Upcoming Class Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }
  }

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ 1-Minute Background Alert Delivered!',
      body: 'Success! ClassTrack successfully delivered this reminder while the app was closed.',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: { type: 'background_kill_test' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: seconds,
      channelId: CHANNEL_CLASSES,
    },
  });

  console.log(`[NotificationService] Scheduled delayed test alert ID: ${notifId} for +${seconds}s`);
  return notifId;
}

