import AsyncStorage from '@react-native-async-storage/async-storage';
import { Subject, Period, TimetableEntry, AttendanceRecord, Exam, Holiday, UserSettings } from '../types';
import {
  DEFAULT_SUBJECTS,
  DEFAULT_PERIODS,
  DEFAULT_ENTRIES,
  DEFAULT_SETTINGS,
  DEFAULT_EXAMS,
  DEFAULT_HOLIDAYS,
  generateSampleAttendance,
} from './sampleData';

const STORAGE_KEYS = {
  SUBJECTS: '@classtrack_subjects',
  PERIODS: '@classtrack_periods',
  ENTRIES: '@classtrack_entries',
  ATTENDANCE: '@classtrack_attendance',
  EXAMS: '@classtrack_exams',
  HOLIDAYS: '@classtrack_holidays',
  SETTINGS: '@classtrack_settings',
  INITIALIZED: '@classtrack_initialized_v3',
};

export interface AppDataPayload {
  subjects: Subject[];
  periods: Period[];
  entries: TimetableEntry[];
  attendance: AttendanceRecord[];
  exams: Exam[];
  holidays: Holiday[];
  settings: UserSettings;
}

export async function initializeOrLoadData(): Promise<AppDataPayload> {
  try {
    const initialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);

    if (!initialized) {
      // First run: populate with clean empty defaults (user creates their own periods)
      const initialAttendance = generateSampleAttendance();
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(DEFAULT_SUBJECTS)),
        AsyncStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(DEFAULT_PERIODS)),
        AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(DEFAULT_ENTRIES)),
        AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(initialAttendance)),
        AsyncStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(DEFAULT_EXAMS)),
        AsyncStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(DEFAULT_HOLIDAYS)),
        AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS)),
        AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true'),
      ]);

      return {
        subjects: DEFAULT_SUBJECTS,
        periods: DEFAULT_PERIODS,
        entries: DEFAULT_ENTRIES,
        attendance: initialAttendance,
        exams: DEFAULT_EXAMS,
        holidays: DEFAULT_HOLIDAYS,
        settings: DEFAULT_SETTINGS,
      };
    }

    // Load from storage
    const [rawSub, rawPer, rawEnt, rawAtt, rawExm, rawHol, rawSet] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS),
      AsyncStorage.getItem(STORAGE_KEYS.PERIODS),
      AsyncStorage.getItem(STORAGE_KEYS.ENTRIES),
      AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE),
      AsyncStorage.getItem(STORAGE_KEYS.EXAMS),
      AsyncStorage.getItem(STORAGE_KEYS.HOLIDAYS),
      AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
    ]);

    const parsedPeriods: Period[] = rawPer ? JSON.parse(rawPer) : DEFAULT_PERIODS;
    const cleanedPeriods = parsedPeriods.filter(
      p => !['p-1', 'p-2', 'p-break', 'p-3', 'p-4', 'p-lunch', 'p-5', 'p-6'].includes(p.id)
    );

    return {
      subjects: rawSub ? JSON.parse(rawSub) : DEFAULT_SUBJECTS,
      periods: cleanedPeriods,
      entries: rawEnt ? JSON.parse(rawEnt) : DEFAULT_ENTRIES,
      attendance: rawAtt ? JSON.parse(rawAtt) : [],
      exams: rawExm ? JSON.parse(rawExm) : DEFAULT_EXAMS,
      holidays: rawHol ? JSON.parse(rawHol) : DEFAULT_HOLIDAYS,
      settings: rawSet ? JSON.parse(rawSet) : DEFAULT_SETTINGS,
    };
  } catch (error) {
    console.error('Error in initializeOrLoadData:', error);
    return {
      subjects: DEFAULT_SUBJECTS,
      periods: DEFAULT_PERIODS,
      entries: DEFAULT_ENTRIES,
      attendance: [],
      exams: DEFAULT_EXAMS,
      holidays: DEFAULT_HOLIDAYS,
      settings: DEFAULT_SETTINGS,
    };
  }
}

export async function persistCollection<T>(key: keyof typeof STORAGE_KEYS, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to persist collection ${key}`, e);
  }
}

export async function exportAllData(): Promise<string> {
  const data = await initializeOrLoadData();
  return JSON.stringify({
    version: '1.0',
    exportDate: new Date().toISOString(),
    ...data,
  }, null, 2);
}

export async function importAllData(jsonString: string): Promise<AppDataPayload> {
  const parsed = JSON.parse(jsonString);
  if (!parsed.subjects || !parsed.periods || !parsed.entries) {
    throw new Error('Invalid ClassTrack backup file format');
  }

  const payload: AppDataPayload = {
    subjects: parsed.subjects || [],
    periods: parsed.periods || [],
    entries: parsed.entries || [],
    attendance: parsed.attendance || [],
    exams: parsed.exams || [],
    holidays: parsed.holidays || [],
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
  };

  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(payload.subjects)),
    AsyncStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(payload.periods)),
    AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(payload.entries)),
    AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(payload.attendance)),
    AsyncStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(payload.exams)),
    AsyncStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(payload.holidays)),
    AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(payload.settings)),
  ]);

  return payload;
}

export async function clearAllData(): Promise<AppDataPayload> {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  return initializeOrLoadData();
}
