import { Subject, Period, TimetableEntry, Exam, Holiday, UserSettings, AttendanceRecord } from '../types';

export const DEFAULT_SUBJECTS: Subject[] = [];

export const DEFAULT_PERIODS: Period[] = [];

export const DEFAULT_ENTRIES: TimetableEntry[] = [];

export const DEFAULT_SETTINGS: UserSettings = {
  studentName: '',
  institution: '',
  department: '',
  grade: '',
  rollNumber: '',
  targetAttendance: 75,
  themeMode: 'dark',
  accentColor: 'indigo',
  timeFormat: '12h',
  density: 'cozy',
  workingDays: [0, 1, 2, 3, 4], // Mon to Fri
  onboarded: false, // Shows onboarding wizard on startup!
  notifyBeforeClass: true,
  reminderMinutesBefore: 10,
  notifyUnmarkedAttendance: true,
  launcherWidgetShowTime: true,
  launcherWidgetShowPeriod: true,
  launcherWidgetShowRoom: true,
  launcherWidgetShowTeacher: true,
  launcherWidgetShowSubjectCode: false,
  launcherWidgetShowAttendanceStatus: true,
};

export const DEFAULT_EXAMS: Exam[] = [];

export const DEFAULT_HOLIDAYS: Holiday[] = [];

export const generateSampleAttendance = (): AttendanceRecord[] => [];
