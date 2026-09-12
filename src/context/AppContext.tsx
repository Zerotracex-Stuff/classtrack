import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Subject,
  Period,
  TimetableEntry,
  AttendanceRecord,
  Exam,
  Holiday,
  UserSettings,
  DayOfWeek,
  AttendanceStatus,
} from '../types';
import {
  initializeOrLoadData,
  persistCollection,
  clearAllData,
  importAllData,
  AppDataPayload,
} from '../database/storage';
import { format } from 'date-fns';
import { scheduleAllReminders, sendTestNotification, scheduleDelayedNotification } from '../services/notificationService';
import { syncLauncherHomeWidgets } from '../services/homeWidgetService';

export interface AttendanceStats {
  totalClasses: number;
  attendedClasses: number;
  missedClasses: number;
  cancelledClasses: number;
  percentage: number;
  target: number;
  safeBunks: number;
  neededToTarget: number;
}

export type TabName = 'today' | 'timetable' | 'attendance' | 'exams' | 'settings';

interface AppContextType {
  loading: boolean;
  subjects: Subject[];
  periods: Period[];
  entries: TimetableEntry[];
  attendance: AttendanceRecord[];
  exams: Exam[];
  holidays: Holiday[];
  settings: UserSettings;
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;

  // Timetable
  getSubject: (id?: string) => Subject | undefined;
  getEntry: (weekday: DayOfWeek, periodId: string) => TimetableEntry | undefined;
  getEntriesForDay: (weekday: DayOfWeek) => TimetableEntry[];
  saveEntry: (entry: { weekday: DayOfWeek; periodId: string; subjectId?: string; teacher?: string; freeText?: string; roomOverride?: string; teacherOverride?: string; notes?: string }) => Promise<void>;
  clearEntry: (weekday: DayOfWeek, periodId: string) => Promise<void>;
  copyDaySchedule: (fromDay: DayOfWeek, toDay: DayOfWeek) => Promise<void>;

  // Attendance
  getAttendanceRecord: (date: string, subjectId: string, periodId?: string) => AttendanceRecord | undefined;
  markAttendance: (subjectId: string, date: string, status: AttendanceStatus, note?: string, periodId?: string) => Promise<void>;
  removeAttendance: (subjectId: string, date: string, periodId?: string) => Promise<void>;
  updateAttendanceRecord: (recordId: string, status: AttendanceStatus, note?: string) => Promise<void>;
  deleteAttendanceRecord: (recordId: string) => Promise<void>;
  overallStats: AttendanceStats;
  getSubjectStats: (subjectId: string) => AttendanceStats;
  setSubjectBaseline: (subjectId: string, initialAttended: number, initialTotal: number) => Promise<void>;

  // Subjects CRUD
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<void>;
  updateSubject: (subject: Subject) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;

  // Periods CRUD
  addPeriod: (period: Omit<Period, 'id'>) => Promise<void>;
  updatePeriod: (period: Period) => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;

  // Exams CRUD
  addExam: (exam: Omit<Exam, 'id'>) => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;

  // Holidays CRUD
  addHoliday: (holiday: Omit<Holiday, 'id'>) => Promise<void>;
  deleteHoliday: (holidayId: string) => Promise<void>;

  // Settings & DB
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  resetDatabase: () => Promise<void>;
  importBackup: (jsonString: string) => Promise<void>;
  sendTestAlert: () => Promise<void>;
  scheduleDelayedTestAlert: (seconds?: number) => Promise<string>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
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
    workingDays: [0, 1, 2, 3, 4],
    onboarded: false,
    notifyBeforeClass: true,
    reminderMinutesBefore: 10,
    notifyUnmarkedAttendance: true,
  });
  const [activeTab, setActiveTab] = useState<TabName>('today');

  // Load data on startup
  useEffect(() => {
    (async () => {
      try {
        const data = await initializeOrLoadData();
        setSubjects(data.subjects);
        setPeriods(data.periods);
        setEntries(data.entries);
        setAttendance(data.attendance);
        setExams(data.exams);
        setHolidays(data.holidays);
        setSettings(data.settings);
      } catch (err) {
        console.error('Failed to initialize app data', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Sync scheduled reminders whenever timetable, attendance, holidays or settings change
  useEffect(() => {
    if (!loading) {
      scheduleAllReminders({
        periods,
        entries,
        subjects,
        attendance,
        holidays,
        settings,
      });

      // Sync Native Device Launcher Home Widgets
      syncLauncherHomeWidgets({
        subjects,
        periods,
        entries,
        attendance,
        exams,
        settings,
      });
    }
  }, [loading, periods, entries, subjects, attendance, holidays, settings, exams]);

  const getSubject = useCallback((id?: string) => {
    if (!id) return undefined;
    return subjects.find(s => s.id === id);
  }, [subjects]);

  const getEntry = useCallback((weekday: DayOfWeek, periodId: string) => {
    return entries.find(e => e.weekday === weekday && e.periodId === periodId);
  }, [entries]);

  const getEntriesForDay = useCallback((weekday: DayOfWeek) => {
    return entries.filter(e => e.weekday === weekday);
  }, [entries]);

  const saveEntry = async (data: { weekday: DayOfWeek; periodId: string; subjectId?: string; teacher?: string; freeText?: string; roomOverride?: string; teacherOverride?: string; notes?: string }) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.weekday === data.weekday && e.periodId === data.periodId);
      let updated: TimetableEntry[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = { ...prev[idx], ...data };
      } else {
        const newEntry: TimetableEntry = {
          id: `ent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          ...data,
        };
        updated = [...prev, newEntry];
      }
      persistCollection('ENTRIES', updated);
      return updated;
    });
  };

  const clearEntry = async (weekday: DayOfWeek, periodId: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => !(e.weekday === weekday && e.periodId === periodId));
      persistCollection('ENTRIES', updated);
      return updated;
    });
  };

  const copyDaySchedule = async (fromDay: DayOfWeek, toDay: DayOfWeek) => {
    setEntries(prev => {
      // Remove all existing entries on target day
      const filtered = prev.filter(e => e.weekday !== toDay);
      // Copy from source day
      const fromEntries = prev.filter(e => e.weekday === fromDay);
      const copied = fromEntries.map(e => ({
        ...e,
        id: `ent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        weekday: toDay,
      }));
      const updated = [...filtered, ...copied];
      persistCollection('ENTRIES', updated);
      return updated;
    });
  };

  // Attendance
  const getAttendanceRecord = useCallback((date: string, subjectId: string, periodId?: string) => {
    return attendance.find(a =>
      a.date === date &&
      a.subjectId === subjectId &&
      (periodId ? a.periodId === periodId : true)
    );
  }, [attendance]);

  const markAttendance = async (
    subjectId: string,
    date: string,
    status: AttendanceStatus,
    note?: string,
    periodId?: string
  ) => {
    setAttendance(prev => {
      const existingIdx = prev.findIndex(a =>
        a.date === date &&
        a.subjectId === subjectId &&
        (periodId ? a.periodId === periodId : (!a.periodId || true))
      );
      let updated: AttendanceRecord[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = {
          ...prev[existingIdx],
          status,
          periodId: periodId || prev[existingIdx].periodId,
          note: note !== undefined ? note : prev[existingIdx].note,
          markedAt: Date.now(),
        };
      } else {
        const record: AttendanceRecord = {
          id: `att_${date}_${subjectId}_${periodId || ''}_${Date.now()}`,
          date,
          subjectId,
          periodId,
          status,
          note,
          markedAt: Date.now(),
        };
        updated = [...prev, record];
      }
      persistCollection('ATTENDANCE', updated);
      return updated;
    });
  };

  const removeAttendance = async (subjectId: string, date: string, periodId?: string) => {
    setAttendance(prev => {
      const updated = prev.filter(a =>
        !(a.date === date && a.subjectId === subjectId && (periodId ? a.periodId === periodId : true))
      );
      persistCollection('ATTENDANCE', updated);
      return updated;
    });
  };

  const updateAttendanceRecord = async (recordId: string, status: AttendanceStatus, note?: string) => {
    setAttendance(prev => {
      const idx = prev.findIndex(a => a.id === recordId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        status,
        note: note !== undefined ? note : updated[idx].note,
        markedAt: Date.now(),
      };
      persistCollection('ATTENDANCE', updated);
      return updated;
    });
  };

  const deleteAttendanceRecord = async (recordId: string) => {
    setAttendance(prev => {
      const updated = prev.filter(a => a.id !== recordId);
      persistCollection('ATTENDANCE', updated);
      return updated;
    });
  };

  // Bunk & Attendance Calculation helper with baseline support
  const calculateStats = useCallback(
    (records: AttendanceRecord[], target: number, baselineAttended = 0, baselineTotal = 0): AttendanceStats => {
      const loggedPresent = records.filter(r => r.status === 'present').length;
      const loggedAbsent = records.filter(r => r.status === 'absent').length;
      const loggedCancelled = records.filter(r => r.status === 'not_held').length;

      const baselineMissed = Math.max(0, baselineTotal - baselineAttended);
      const totalCount = baselineTotal + loggedPresent + loggedAbsent;
      const present = baselineAttended + loggedPresent;
      const absent = baselineMissed + loggedAbsent;
      const cancelled = loggedCancelled;

      const percentage = totalCount > 0 ? Math.round((present / totalCount) * 100) : 100;
      const targetFraction = target / 100;

      let safeBunks = 0;
      let neededToTarget = 0;

      if (totalCount === 0) {
        safeBunks = 0;
        neededToTarget = 0;
      } else if (percentage >= target) {
        // Safe bunks formula: floor((Present - Target * Total) / Target)
        safeBunks = Math.floor((present - targetFraction * totalCount) / targetFraction);
        if (safeBunks < 0) safeBunks = 0;
      } else {
        // Needed classes formula: ceil((Target * Total - Present) / (1 - Target))
        neededToTarget = Math.ceil((targetFraction * totalCount - present) / (1 - targetFraction));
        if (neededToTarget < 0) neededToTarget = 0;
      }

      return {
        totalClasses: totalCount,
        attendedClasses: present,
        missedClasses: absent,
        cancelledClasses: cancelled,
        percentage,
        target,
        safeBunks,
        neededToTarget,
      };
    },
    []
  );

  const overallStats = useMemo(() => {
    const totalBaselineAttended = subjects.reduce((sum, s) => sum + (s.initialAttended || 0), 0);
    const totalBaselineTotal = subjects.reduce((sum, s) => sum + (s.initialTotal || 0), 0);
    return calculateStats(attendance, settings.targetAttendance || 75, totalBaselineAttended, totalBaselineTotal);
  }, [attendance, settings.targetAttendance, subjects, calculateStats]);

  const getSubjectStats = useCallback(
    (subjectId: string) => {
      const sub = subjects.find(s => s.id === subjectId);
      const subRecords = attendance.filter(a => a.subjectId === subjectId);
      return calculateStats(
        subRecords,
        settings.targetAttendance || 75,
        sub?.initialAttended || 0,
        sub?.initialTotal || 0
      );
    },
    [attendance, settings.targetAttendance, subjects, calculateStats]
  );

  const setSubjectBaseline = async (subjectId: string, initialAttended: number, initialTotal: number) => {
    setSubjects(prev => {
      const updated = prev.map(s => {
        if (s.id === subjectId) {
          return {
            ...s,
            initialAttended: Math.max(0, initialAttended),
            initialTotal: Math.max(0, initialTotal),
          };
        }
        return s;
      });
      persistCollection('SUBJECTS', updated);
      return updated;
    });
  };

  // Subject CRUD
  const addSubject = async (data: Omit<Subject, 'id'>) => {
    const newSubject: Subject = {
      id: `sub_${Date.now()}`,
      ...data,
    };
    setSubjects(prev => {
      const updated = [...prev, newSubject];
      persistCollection('SUBJECTS', updated);
      return updated;
    });
  };

  const updateSubject = async (data: Subject) => {
    setSubjects(prev => {
      const updated = prev.map(s => (s.id === data.id ? data : s));
      persistCollection('SUBJECTS', updated);
      return updated;
    });
  };

  const deleteSubject = async (subjectId: string) => {
    setSubjects(prev => {
      const updated = prev.filter(s => s.id !== subjectId);
      persistCollection('SUBJECTS', updated);
      return updated;
    });
    // Also remove from entries
    setEntries(prev => {
      const updated = prev.filter(e => e.subjectId !== subjectId);
      persistCollection('ENTRIES', updated);
      return updated;
    });
  };

  // Period CRUD
  const addPeriod = async (data: Omit<Period, 'id'>) => {
    const newPeriod: Period = {
      id: `per_${Date.now()}`,
      ...data,
    };
    setPeriods(prev => {
      const updated = [...prev, newPeriod].sort((a, b) => a.ord - b.ord);
      persistCollection('PERIODS', updated);
      return updated;
    });
  };

  const updatePeriod = async (data: Period) => {
    setPeriods(prev => {
      const updated = prev.map(p => (p.id === data.id ? data : p)).sort((a, b) => a.ord - b.ord);
      persistCollection('PERIODS', updated);
      return updated;
    });
  };

  const deletePeriod = async (periodId: string) => {
    setPeriods(prev => {
      const updated = prev.filter(p => p.id !== periodId);
      persistCollection('PERIODS', updated);
      return updated;
    });
    setEntries(prev => {
      const updated = prev.filter(e => e.periodId !== periodId);
      persistCollection('ENTRIES', updated);
      return updated;
    });
  };

  // Exam CRUD
  const addExam = async (data: Omit<Exam, 'id'>) => {
    const newExam: Exam = {
      id: `exam_${Date.now()}`,
      ...data,
    };
    setExams(prev => {
      const updated = [...prev, newExam];
      persistCollection('EXAMS', updated);
      return updated;
    });
  };

  const deleteExam = async (examId: string) => {
    setExams(prev => {
      const updated = prev.filter(e => e.id !== examId);
      persistCollection('EXAMS', updated);
      return updated;
    });
  };

  // Holiday CRUD
  const addHoliday = async (data: Omit<Holiday, 'id'>) => {
    const newHol: Holiday = {
      id: `hol_${Date.now()}`,
      ...data,
    };
    setHolidays(prev => {
      const updated = [...prev, newHol];
      persistCollection('HOLIDAYS', updated);
      return updated;
    });
  };

  const deleteHoliday = async (holidayId: string) => {
    setHolidays(prev => {
      const updated = prev.filter(h => h.id !== holidayId);
      persistCollection('HOLIDAYS', updated);
      return updated;
    });
  };

  // Settings
  const updateSettings = async (partial: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      persistCollection('SETTINGS', updated);
      return updated;
    });
  };

  const resetDatabase = async () => {
    const fresh = await clearAllData();
    setSubjects(fresh.subjects);
    setPeriods(fresh.periods);
    setEntries(fresh.entries);
    setAttendance(fresh.attendance);
    setExams(fresh.exams);
    setHolidays(fresh.holidays);
    setSettings(fresh.settings);
  };

  const importBackup = async (jsonString: string) => {
    const loaded = await importAllData(jsonString);
    setSubjects(loaded.subjects);
    setPeriods(loaded.periods);
    setEntries(loaded.entries);
    setAttendance(loaded.attendance);
    setExams(loaded.exams);
    setHolidays(loaded.holidays);
    setSettings(loaded.settings);
  };

  return (
    <AppContext.Provider
      value={{
        loading,
        subjects,
        periods,
        entries,
        attendance,
        exams,
        holidays,
        settings,
        activeTab,
        setActiveTab,

        getSubject,
        getEntry,
        getEntriesForDay,
        saveEntry,
        clearEntry,
        copyDaySchedule,

        getAttendanceRecord,
        markAttendance,
        removeAttendance,
        updateAttendanceRecord,
        deleteAttendanceRecord,
        overallStats,
        getSubjectStats,
        setSubjectBaseline,

        addSubject,
        updateSubject,
        deleteSubject,

        addPeriod,
        updatePeriod,
        deletePeriod,

        addExam,
        deleteExam,

        addHoliday,
        deleteHoliday,

        updateSettings,
        resetDatabase,
        importBackup,
        sendTestAlert: sendTestNotification,
        scheduleDelayedTestAlert: scheduleDelayedNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
