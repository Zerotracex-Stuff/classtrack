export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Mon, 6 = Sun

export interface Subject {
  id: string;
  name: string;
  code?: string;
  teacher?: string;
  room?: string;
  color: string;
  category?: string;
  initialAttended?: number; // baseline classes attended before using app
  initialTotal?: number;    // baseline total classes held before using app
  icon?: string;            // icon name e.g. 'flask-outline'
}

export interface Period {
  id: string;
  ord: number;
  label: string;
  startTime: string; // "09:00"
  endTime: string;   // "09:45"
  isBreak?: boolean;
}

export interface TimetableEntry {
  id: string;
  weekday: DayOfWeek; // 0 = Mon ... 6 = Sun
  periodId: string;
  subjectId?: string;
  teacher?: string; // period-specific teacher
  freeText?: string;
  roomOverride?: string;
  teacherOverride?: string;
  notes?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'not_held';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  subjectId: string;
  periodId?: string;
  status: AttendanceStatus;
  note?: string;
  markedAt: number; // timestamp
}

export type ExamType = 'midterm' | 'final' | 'quiz' | 'practical' | 'assignment';

export interface Exam {
  id: string;
  title: string;
  subjectId?: string;
  date: string; // YYYY-MM-DD
  time?: string; // "10:00 AM"
  venue?: string;
  type: ExamType;
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export type ThemeMode = 'system' | 'light' | 'dark';
export type AccentColorKey = 'indigo' | 'emerald' | 'violet' | 'amber' | 'crimson' | 'sky' | 'teal' | 'coral';

export interface UserSettings {
  studentName: string;
  institution: string;
  grade: string;
  department?: string; // e.g. Computer Science, Mechanical
  rollNumber?: string; // e.g. CS2024-042
  targetAttendance: number; // e.g. 75
  themeMode: ThemeMode;
  accentColor: AccentColorKey;
  timeFormat: '12h' | '24h';
  density: 'compact' | 'cozy';
  workingDays: DayOfWeek[]; // default [0, 1, 2, 3, 4] (Mon-Fri)
  onboarded: boolean;
  notifyBeforeClass?: boolean; // reminder before class starts
  reminderMinutesBefore?: number; // e.g. 10 mins
  notifyUnmarkedAttendance?: boolean; // reminder if attendance not marked after class
  widgetOrder?: string[]; // ordered array of enabled widget IDs
  weeklyWidgetShowRooms?: boolean; // show room numbers in weekly widget
  weeklyWidgetShowTeachers?: boolean; // show teacher names in weekly widget
  weeklyWidgetShowTimes?: boolean; // show period times in weekly widget
  weeklyWidgetIncludeWeekends?: boolean; // include Sat/Sun in weekly widget
  // Launcher widget detail display customization preferences
  launcherWidgetShowTime?: boolean; // toggle showing class times / countdowns (default: true)
  launcherWidgetShowPeriod?: boolean; // toggle showing period number / label (default: true)
  launcherWidgetShowRoom?: boolean; // toggle showing room numbers (default: true)
  launcherWidgetShowTeacher?: boolean; // toggle showing teacher names (default: true)
  launcherWidgetShowSubjectCode?: boolean; // toggle showing subject code instead of name (default: false)
  launcherWidgetShowAttendanceStatus?: boolean; // toggle showing attendance badge on cards (default: true)
}

