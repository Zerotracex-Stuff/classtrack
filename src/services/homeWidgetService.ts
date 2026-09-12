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
