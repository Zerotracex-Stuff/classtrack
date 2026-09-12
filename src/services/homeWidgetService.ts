import { Platform } from 'react-native';
import HomeWidget from 'react-native-home-widget';
import { Subject, Period, TimetableEntry, AttendanceRecord, Exam, UserSettings } from '../types';
import { format, parseISO, isFuture, isToday } from 'date-fns';

export interface WidgetSyncPayload {
  nextClassName: string;
  nextClassTime: string;
  nextClassRoom: string;
  nextClassTeacher: string;
  nextClassCountdown: string;
  overallAttendancePct: number;
  totalAttended: number;
  totalHeld: number;
  safeBunks: number;
  attendanceStatus: string;
  nearestExamTitle: string;
  nearestExamDate: string;
  nearestExamCountdown: string;
}

export const syncLauncherHomeWidgets = async (payload: {
  subjects: Subject[];
  periods: Period[];
  entries: TimetableEntry[];
  attendance: AttendanceRecord[];
  exams: Exam[];
  settings: UserSettings;
}): Promise<boolean> => {
  try {
    const { subjects, periods, entries, attendance, exams, settings } = payload;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayWeekday = ((new Date().getDay() + 6) % 7); // 0 = Mon, ..., 6 = Sun

    // 1. Calculate Today's Next/Active Class
    const todayEntries = entries
      .filter(e => e.weekday === todayWeekday)
      .map(entry => {
        const period = periods.find(p => p.id === entry.periodId);
        const subject = subjects.find(s => s.id === entry.subjectId);
        return { entry, period, subject };
      })
      .filter(item => item.period && item.subject)
      .sort((a, b) => (a.period?.startTime || '').localeCompare(b.period?.startTime || ''));

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let nextClassName = 'No More Classes Today';
    let nextClassTime = 'Rest & Review ☕';
    let nextClassRoom = '';
    let nextClassTeacher = '';
    let nextClassCountdown = 'Free Time';

    if (todayEntries.length > 0) {
      for (const item of todayEntries) {
        if (!item.period) continue;
        const [startH, startM] = item.period.startTime.split(':').map(Number);
        const [endH, endM] = item.period.endTime.split(':').map(Number);
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;

        if (currentMins >= startMins && currentMins <= endMins) {
          nextClassName = item.subject?.name || 'Class in Progress';
          nextClassTime = `${item.period.startTime} - ${item.period.endTime}`;
          nextClassRoom = item.entry.roomOverride || item.subject?.room || '';
          nextClassTeacher = item.entry.teacher || item.subject?.teacher || '';
          const minsLeft = endMins - currentMins;
          nextClassCountdown = `In Session (${minsLeft}m left)`;
          break;
        } else if (currentMins < startMins) {
          nextClassName = item.subject?.name || 'Upcoming Class';
          nextClassTime = `${item.period.startTime} - ${item.period.endTime}`;
          nextClassRoom = item.entry.roomOverride || item.subject?.room || '';
          nextClassTeacher = item.entry.teacher || item.subject?.teacher || '';
          const minsUntil = startMins - currentMins;
          nextClassCountdown = `Starts in ${minsUntil}m`;
          break;
        }
      }

      // If all classes passed for today
      if (nextClassName === 'No More Classes Today' && todayEntries[0]) {
        const first = todayEntries[0];
        nextClassName = first.subject?.name || 'First Class Tomorrow';
        nextClassTime = `${first.period?.startTime} (${first.subject?.name})`;
        nextClassCountdown = 'Done for Today 🎉';
      }
    }

    // 2. Overall Attendance Math
    let held = 0;
    let attended = 0;
    subjects.forEach(s => {
      const logs = attendance.filter(a => a.subjectId === s.id && a.status !== 'not_held');
      held += logs.length;
      attended += logs.filter(a => a.status === 'present').length;
    });

    const target = settings.targetAttendance || 75;
    const overallPct = held > 0 ? Math.round((attended / held) * 100) : 100;
    let safeBunks = 0;
    if (held > 0) {
      safeBunks = Math.max(0, Math.floor((attended - (target / 100) * held) / (target / 100)));
    }

    const attendanceStatus =
      overallPct >= target
        ? safeBunks <= 1
          ? 'Borderline Warning ⚠️'
          : 'Safe Zone Shield 🛡️'
        : 'Attendance Shortage 🚨';

    // 3. Nearest Exam Math
    const nearestExam = [...exams]
      .filter((e: Exam) => {
        const d = parseISO(e.date);
        return isFuture(d) || isToday(d);
      })
      .sort((a: Exam, b: Exam) => a.date.localeCompare(b.date))[0];

    let nearestExamTitle = 'No Exams Scheduled';
    let nearestExamDate = 'All Clear 🎯';
    let nearestExamCountdown = 'No Deadlines';

    if (nearestExam) {
      nearestExamTitle = nearestExam.title;
      nearestExamDate = nearestExam.date;
      const examD = parseISO(nearestExam.date);
      const diffDays = Math.ceil((examD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        nearestExamCountdown = 'TODAY! 📝';
      } else if (diffDays === 1) {
        nearestExamCountdown = 'TOMORROW! ⏳';
      } else {
        nearestExamCountdown = `In ${diffDays} days`;
      }
    }

    // 4. Day Schedule Horizontal Math
    const horizontalItems = todayEntries.map(item => {
      const room = item.entry.roomOverride || item.subject?.room;
      return `[${item.period?.startTime}] ${item.subject?.name}${room ? ` (${room})` : ''}`;
    });
    const dayScheduleHorizontalStr = horizontalItems.length > 0 ? horizontalItems.join('  ➔  ') : 'No classes scheduled for today ☕';

    // 5. Day Schedule Vertical Math
    const verticalItems = todayEntries.map(item => {
      const teacher = item.entry.teacher || item.subject?.teacher;
      const room = item.entry.roomOverride || item.subject?.room;
      const meta = [teacher ? `👨‍🏫 ${teacher}` : '', room ? `📍 ${room}` : ''].filter(Boolean).join(' • ');
      return `• ${item.period?.startTime}-${item.period?.endTime}: ${item.subject?.name}${meta ? ` (${meta})` : ''}`;
    });
    const dayScheduleVerticalStr = verticalItems.length > 0 ? verticalItems.join('\n') : 'No classes scheduled for today ☕';

    // 6. Weekly Schedule Summary Math (All periods with subject names & customizable fields)
    const showRooms = settings.weeklyWidgetShowRooms ?? false;
    const showTeachers = settings.weeklyWidgetShowTeachers ?? false;
    const showTimes = settings.weeklyWidgetShowTimes ?? true;
    const includeWeekends = settings.weeklyWidgetIncludeWeekends ?? false;

    const daysToInclude = includeWeekends ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
    const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const weeklyLines = daysToInclude.map(dayIdx => {
      const dayName = weekdayNames[dayIdx];
      const dayEntries = entries
        .filter(e => e.weekday === dayIdx)
        .map(entry => {
          const period = periods.find(p => p.id === entry.periodId);
          const subject = subjects.find(s => s.id === entry.subjectId);
          return { entry, period, subject };
        })
        .filter(item => item.subject)
        .sort((a, b) => (a.period?.startTime || '').localeCompare(b.period?.startTime || ''));

      if (dayEntries.length === 0) {
        return `${dayName}: Off`;
      }

      const periodStrs = dayEntries.map(item => {
        let str = item.subject?.name || 'Class';
        if (showTimes && item.period) {
          str = `[${item.period.startTime}] ${str}`;
        }
        if (showRooms) {
          const room = item.entry.roomOverride || item.subject?.room;
          if (room) str += ` (${room})`;
        }
        if (showTeachers) {
          const teacher = item.entry.teacher || item.subject?.teacher;
          if (teacher) str += ` 👨‍🏫${teacher}`;
        }
        return str;
      });

      return `${dayName}: ${periodStrs.join(', ')}`;
    });

    const weeklyScheduleStr = weeklyLines.join('\n');

    // Save items to Native Shared Storage for Launcher Widgets
    if (Platform.OS !== 'web') {
      try {
        const isSupported = await HomeWidget.isSupported();
        if (isSupported) {
          // 1. Next/Active Class Widget
          await HomeWidget.updateWidget('NextClassWidget', {
            id: 'NextClassWidget',
            title: `${nextClassName} (${nextClassCountdown})`,
            content: `⏰ ${nextClassTime} ${nextClassRoom ? '📍 ' + nextClassRoom : ''} ${nextClassTeacher ? '👨‍🏫 ' + nextClassTeacher : ''}`.trim(),
            backgroundColor: '#4F46E5',
            textColor: '#FFFFFF',
          });

          // 2. Day Schedule Horizontal Widget
          await HomeWidget.updateWidget('DayScheduleHorizontalWidget', {
            id: 'DayScheduleHorizontalWidget',
            title: `Today's Classes (${todayEntries.length}) ➔`,
            content: dayScheduleHorizontalStr,
            backgroundColor: '#2563EB',
            textColor: '#FFFFFF',
          });

          // 3. Day Schedule Vertical Widget
          await HomeWidget.updateWidget('DayScheduleVerticalWidget', {
            id: 'DayScheduleVerticalWidget',
            title: `Timeline • ${format(new Date(), 'EEEE, MMM d')}`,
            content: dayScheduleVerticalStr,
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
          });

          // 4. Weekly Schedule Timetable Widget
          await HomeWidget.updateWidget('WeeklyScheduleWidget', {
            id: 'WeeklyScheduleWidget',
            title: `Weekly Schedule Overview`,
            content: weeklyScheduleStr,
            backgroundColor: '#7C3AED',
            textColor: '#FFFFFF',
          });

          // 5. Attendance Health Widget
          await HomeWidget.updateWidget('AttendanceWidget', {
            id: 'AttendanceWidget',
            title: `Attendance: ${overallPct}% (${attendanceStatus})`,
            content: `Attended ${attended}/${held} lectures • ${safeBunks} safe bunks remaining`,
            backgroundColor: overallPct >= target ? '#059669' : '#DC2626',
            textColor: '#FFFFFF',
          });

          // 6. Nearest Exam Widget
          await HomeWidget.updateWidget('ExamsWidget', {
            id: 'ExamsWidget',
            title: `Next Exam: ${nearestExamTitle}`,
            content: `${nearestExamDate} • ${nearestExamCountdown}`,
            backgroundColor: '#D97706',
            textColor: '#FFFFFF',
          });
        }
      } catch (e) {
        console.log('Native home widget update skipped or not supported:', e);
      }
    }

    return true;
  } catch (err) {
    console.log('Launcher Widget Sync:', err);
    return false;
  }
};
