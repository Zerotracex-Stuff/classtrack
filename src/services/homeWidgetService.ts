import { Platform } from 'react-native';
import HomeWidget from 'react-native-home-widget';
import { Subject, Period, TimetableEntry, AttendanceRecord, Exam, Holiday, UserSettings } from '../types';
import { format, parseISO, isFuture, isToday } from 'date-fns';
import { formatTime, formatTimeRange } from '../utils/timeUtils';

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
  holidays?: Holiday[];
  settings: UserSettings;
}): Promise<boolean> => {
  try {
    const { subjects, periods, entries, attendance, exams, holidays = [], settings } = payload;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayWeekday = ((new Date().getDay() + 6) % 7); // 0 = Mon, ..., 6 = Sun
    const timeFmt = settings.timeFormat || '12h';

    // Check if today is an active holiday
    const activeHoliday = holidays.find(
      h => todayStr >= h.startDate && todayStr <= h.endDate
    );

    // 1. Calculate Today's Next/Active Class
    const todayEntries = activeHoliday
      ? []
      : entries
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

    // Widget detail display customization preferences
    const showTime = settings.launcherWidgetShowTime !== false;
    const showPeriod = settings.launcherWidgetShowPeriod !== false;
    const showRoom = settings.launcherWidgetShowRoom !== false;
    const showTeacher = settings.launcherWidgetShowTeacher !== false;
    const showSubjectCode = settings.launcherWidgetShowSubjectCode === true;
    const showAttendance = settings.launcherWidgetShowAttendanceStatus !== false;

    const getSubDisplayName = (sub?: Subject) => {
      if (!sub) return 'Class';
      if (showSubjectCode && sub.code) return sub.code;
      return sub.name;
    };

    let nextClassName = activeHoliday ? `🌴 ${activeHoliday.name}` : 'No More Classes Today';
    let nextClassTime = activeHoliday ? 'Holiday Break' : 'Rest & Review ☕';
    let nextClassRoom = activeHoliday ? 'No Classes Today' : '';
    let nextClassTeacher = activeHoliday ? 'Enjoy your break!' : '';
    let nextClassPeriod = '';
    let nextClassCountdown = activeHoliday ? 'On Vacation 🎉' : 'Free Time';

    if (!activeHoliday && todayEntries.length > 0) {
      for (const item of todayEntries) {
        if (!item.period) continue;
        const [startH, startM] = item.period.startTime.split(':').map(Number);
        const [endH, endM] = item.period.endTime.split(':').map(Number);
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;

        if (currentMins >= startMins && currentMins <= endMins) {
          nextClassName = getSubDisplayName(item.subject);
          nextClassTime = formatTimeRange(item.period.startTime, item.period.endTime, timeFmt);
          nextClassRoom = item.entry.roomOverride || item.subject?.room || '';
          nextClassTeacher = item.entry.teacher || item.subject?.teacher || '';
          nextClassPeriod = item.period.label || '';
          const minsLeft = endMins - currentMins;
          nextClassCountdown = `In Session (${minsLeft}m left)`;
          break;
        } else if (currentMins < startMins) {
          nextClassName = getSubDisplayName(item.subject);
          nextClassTime = formatTimeRange(item.period.startTime, item.period.endTime, timeFmt);
          nextClassRoom = item.entry.roomOverride || item.subject?.room || '';
          nextClassTeacher = item.entry.teacher || item.subject?.teacher || '';
          nextClassPeriod = item.period.label || '';
          const minsUntil = startMins - currentMins;
          nextClassCountdown = `Starts in ${minsUntil}m`;
          break;
        }
      }

      // If all classes passed for today
      if (nextClassName === 'No More Classes Today' && todayEntries[0]) {
        const first = todayEntries[0];
        nextClassName = getSubDisplayName(first.subject);
        nextClassTime = `${formatTime(first.period?.startTime, timeFmt)} (${getSubDisplayName(first.subject)})`;
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

    // 4. Today's Schedule Deck Math
    const scheduleCount = todayEntries.length;
    let scheduleContent = 'No classes scheduled for today. Take time off! ☕';
    if (scheduleCount > 0) {
      const first = todayEntries[0];
      const timePart = showTime ? ` at ${formatTime(first.period?.startTime, timeFmt)}` : '';
      const roomVal = first.entry.roomOverride || first.subject?.room;
      const roomPart = (showRoom && roomVal) ? ` (${roomVal})` : '';
      const periodVal = first.period?.label;
      const periodPart = (showPeriod && periodVal) ? ` [${periodVal}]` : '';
      const teacherVal = first.entry.teacher || first.subject?.teacher;
      const teacherPart = (showTeacher && teacherVal) ? ` • ${teacherVal}` : '';
      scheduleContent = `1st: ${getSubDisplayName(first.subject)}${periodPart}${timePart}${roomPart}${teacherPart}`;
    }

    // 5. Attendance Analytics & Risk Math
    let lowestSubjectName = 'All Subjects';
    let lowestPct = 100;
    let subjectsBelowTarget = 0;

    subjects.forEach(s => {
      const logs = attendance.filter(a => a.subjectId === s.id && a.status !== 'not_held');
      const sHeld = logs.length;
      const sAttended = logs.filter(a => a.status === 'present').length;
      const pct = sHeld > 0 ? Math.round((sAttended / sHeld) * 100) : 100;
      if (pct < target) subjectsBelowTarget++;
      if (pct < lowestPct) {
        lowestPct = pct;
        lowestSubjectName = getSubDisplayName(s);
      }
    });

    let analyticsContent = subjectsBelowTarget > 0
      ? `Lowest: ${lowestSubjectName} (${lowestPct}%) • Target: ${target}%`
      : `All ${subjects.length || 0} subjects meeting ${target}% target threshold`;

    // 6. Smart Tip Math
    let tipContent = `Maintain overall attendance above ${target}% for hassle-free exam hall tickets!`;
    if (overallPct < target) {
      tipContent = `🚨 Attendance is ${overallPct}% (target ${target}%). Attend upcoming lectures to recover safe margin!`;
    } else if (safeBunks > 0) {
      tipContent = `💡 You have ~${safeBunks} safe bunks remaining across your schedule. Stay consistent!`;
    }

    // 7. Active Holiday Break Math
    const holidayTitle = activeHoliday ? `🌴 ${activeHoliday.name}` : 'No Active Vacation Break';
    const holidayContent = activeHoliday
      ? `Holiday active (${activeHoliday.startDate} to ${activeHoliday.endDate}) • Attendance alerts paused 🎉`
      : 'Regular academic schedule in progress';
    const holidayBadge = activeHoliday ? 'ON VACATION' : 'REGULAR';

    // Serialize full schedule, exams, and attendance JSON for native real-time background calculations
    const schedulePayload = entries.map(e => {
      const p = periods.find(per => per.id === e.periodId);
      const s = subjects.find(sub => sub.id === e.subjectId);

      // Determine today's attendance mark for this entry if applicable
      let markStatus = 'unmarked';
      if (activeHoliday) {
        markStatus = 'holiday';
      } else if (e.weekday === todayWeekday) {
        const record = attendance.find(a =>
          a.date === todayStr &&
          (a.periodId ? a.periodId === e.periodId : a.subjectId === e.subjectId)
        );
        if (record) {
          if (record.status === 'present') markStatus = 'present';
          else if (record.status === 'absent') markStatus = 'absent';
          else if (record.status === 'not_held') markStatus = 'cancelled';
        }
      }

      return {
        weekday: e.weekday,
        periodId: e.periodId,
        startTime: showTime ? (p?.startTime || '') : '',
        endTime: showTime ? (p?.endTime || '') : '',
        subjectName: getSubDisplayName(s),
        room: showRoom ? (e.roomOverride || s?.room || '') : '',
        teacher: showTeacher ? (e.teacher || e.teacherOverride || s?.teacher || '') : '',
        periodLabel: showPeriod ? (p?.label || '') : '',
        attendanceStatus: !showAttendance ? 'hidden' : markStatus, // 'present' | 'absent' | 'cancelled' | 'unmarked' | 'hidden'
      };
    });

    const examsPayload = exams.map(ex => ({
      id: ex.id,
      title: ex.title,
      date: ex.date,
      room: ex.venue || '',
    }));

    const scheduleJsonStr = JSON.stringify(schedulePayload);
    const examsJsonStr = JSON.stringify(examsPayload);
    const attendanceJsonStr = JSON.stringify(attendance);

    // Save items to Native Shared Storage for Launcher Widgets
    if (Platform.OS !== 'web') {
      try {
        const isSupported = await HomeWidget.isSupported();
        if (isSupported) {
          // 1. Next/Active Class Widget
          const classMetaParts = [];
          if (!activeHoliday) {
            if (showPeriod && nextClassPeriod) classMetaParts.push(`🏷️ ${nextClassPeriod}`);
            if (showTime && nextClassTime) classMetaParts.push(`⏰ ${nextClassTime}`);
            if (showRoom && nextClassRoom) classMetaParts.push(`📍 ${nextClassRoom}`);
            if (showTeacher && nextClassTeacher) classMetaParts.push(`👤 ${nextClassTeacher}`);
          } else {
            classMetaParts.push(`🌴 ${nextClassTime}`);
          }

          await (HomeWidget as any).updateWidget('NextClassWidget', {
            id: 'NextClassWidget',
            tag: '⏰ NEXT CLASS',
            badge: nextClassCountdown,
            badgeColor: '#4F46E5',
            title: nextClassName,
            content: classMetaParts.join('  •  ') || 'Tap to view timetable',
            schedule_json: scheduleJsonStr,
            exams_json: examsJsonStr,
            attendance_json: attendanceJsonStr,
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
          });

          // 2. Upcoming Classes Widget
          await (HomeWidget as any).updateWidget('UpcomingClassesWidget', {
            id: 'UpcomingClassesWidget',
            tag: '⏳ UPCOMING CLASSES',
            badge: activeHoliday ? 'HOLIDAY' : 'UPCOMING',
            badgeColor: activeHoliday ? '#10B981' : '#6366F1',
            title: activeHoliday ? `🌴 ${activeHoliday.name}` : 'Upcoming Classes Today',
            content: activeHoliday
              ? 'Holiday break active • No classes scheduled today 🎉'
              : 'Tap to view upcoming classes',
            schedule_json: activeHoliday ? '[]' : scheduleJsonStr,
            attendance_json: attendanceJsonStr,
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
          });

          // 3. Tomorrow's Classes Widget
          await (HomeWidget as any).updateWidget('TomorrowsClassesWidget', {
            id: 'TomorrowsClassesWidget',
            tag: '🌅 TOMORROW\'S CLASSES',
            badge: 'TOMORROW',
            badgeColor: '#8B5CF6',
            title: 'Tomorrow\'s Classes',
            content: 'Tap to view tomorrow\'s schedule',
            schedule_json: scheduleJsonStr,
            attendance_json: attendanceJsonStr,
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
          });

          // 4. Weekly Timetable Grid Widget
          await (HomeWidget as any).updateWidget('WeeklyTimetableWidget', {
            id: 'WeeklyTimetableWidget',
            tag: '📅 WEEKLY TIMETABLE',
            badge: 'WEEKLY',
            badgeColor: '#6366F1',
            title: 'Weekly Timetable Overview',
            content: 'Tap to view full weekly grid',
            schedule_json: scheduleJsonStr,
            attendance_json: attendanceJsonStr,
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
          });

          // 5. Attendance Health Widget
          const attBadge = overallPct >= target ? 'HEALTHY 🛡️' : 'SHORTAGE 🚨';
          await (HomeWidget as any).updateWidget('AttendanceWidget', {
            id: 'AttendanceWidget',
            tag: '🛡️ ATTENDANCE',
            badge: attBadge,
            badgeColor: overallPct >= target ? '#059669' : '#DC2626',
            title: `${overallPct}% Overall Attendance`,
            content: `Attended ${attended}/${held} lectures • ~${safeBunks} safe bunks left`,
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
          });

          // 6. Nearest Exam Widget
          await (HomeWidget as any).updateWidget('ExamsWidget', {
            id: 'ExamsWidget',
            tag: '📝 UPCOMING EXAM',
            badge: nearestExamCountdown,
            badgeColor: '#D97706',
            title: nearestExamTitle,
            content: `📅 ${nearestExamDate} • Tap to view all exams`,
            exams_json: examsJsonStr,
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
          });

          // 7. Today's Deck & Schedule Widget
          await (HomeWidget as any).updateWidget('TodayScheduleWidget', {
            id: 'TodayScheduleWidget',
            tag: '📚 TODAY\'S DECK',
            badge: activeHoliday ? 'VACATION' : `${scheduleCount} LECTURES`,
            badgeColor: activeHoliday ? '#10B981' : '#6366F1',
            title: activeHoliday ? `🌴 ${activeHoliday.name}` : `Today: ${scheduleCount} Scheduled Classes`,
            content: activeHoliday ? 'Holiday break active • Attendance alerts paused 🎉' : scheduleContent,
            schedule_json: activeHoliday ? '[]' : scheduleJsonStr,
            attendance_json: attendanceJsonStr,
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
          });

          // 8. Quick Actions Shortcut Widget
          await (HomeWidget as any).updateWidget('QuickActionsWidget', {
            id: 'QuickActionsWidget',
            tag: '⚡ QUICK ACTIONS',
            badge: '5 SHORTCUTS',
            badgeColor: '#8B5CF6',
            title: 'Quick Shortcuts & Scanner',
            content: '📷 Scan QR  •  📅 Timetable  •  🧮 Bunk Calc  •  🌴 Vacations',
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
          });

          // 9. Attendance Analytics & Risk Widget
          await (HomeWidget as any).updateWidget('AttendanceAnalyticsWidget', {
            id: 'AttendanceAnalyticsWidget',
            tag: '📊 ATTENDANCE RISK',
            badge: subjectsBelowTarget > 0 ? `${subjectsBelowTarget} AT RISK` : 'ALL CLEAR',
            badgeColor: subjectsBelowTarget > 0 ? '#EF4444' : '#10B981',
            title: `Analytics: ${overallPct}% Overall`,
            content: analyticsContent,
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
          });

          // 10. Smart Productivity Tip Widget
          await (HomeWidget as any).updateWidget('SmartTipsWidget', {
            id: 'SmartTipsWidget',
            tag: '💡 SMART TIP',
            badge: 'PRO TIP',
            badgeColor: '#F59E0B',
            title: 'ClassTrack Smart Advice',
            content: tipContent,
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
          });

          // 11. Active Holiday Break Widget
          await (HomeWidget as any).updateWidget('HolidayWidget', {
            id: 'HolidayWidget',
            tag: '🌴 VACATION BREAK',
            badge: holidayBadge,
            badgeColor: activeHoliday ? '#10B981' : '#64748B',
            title: holidayTitle,
            content: holidayContent,
            backgroundColor: '#0F172A',
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
