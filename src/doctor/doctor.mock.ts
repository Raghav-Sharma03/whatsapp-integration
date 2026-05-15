import { Doctor, Specialization } from '../appointment/appointment.types';

// ─────────────────────────────────────────────
// Mock Doctor Database
// 5 doctors across 5 specializations
// All schedules are self-contained and realistic
// ─────────────────────────────────────────────

export const MOCK_DOCTORS: Doctor[] = [
  {
    id: 'DOC_001',
    name: 'Dr. Rajesh Mehta',
    specialization: Specialization.DERMATOLOGY,
    schedule: {
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      start_time: '09:00',
      end_time: '13:00',
      slot_duration_minutes: 30,
      daily_limit: 8,
      break_periods: [],
    },
  },
  {
    id: 'DOC_002',
    name: 'Dr. Priya Sharma',
    specialization: Specialization.CARDIOLOGY,
    schedule: {
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start_time: '10:00',
      end_time: '14:00',
      slot_duration_minutes: 30,
      daily_limit: 8,
      break_periods: [],
    },
  },
  {
    id: 'DOC_003',
    name: 'Dr. Anil Verma',
    specialization: Specialization.ORTHOPEDICS,
    schedule: {
      available_days: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      start_time: '11:00',
      end_time: '15:00',
      slot_duration_minutes: 30,
      daily_limit: 8,
      break_periods: [
        { from: '13:00', to: '13:30' },
      ],
    },
  },
  {
    id: 'DOC_004',
    name: 'Dr. Sunita Rao',
    specialization: Specialization.PEDIATRICS,
    schedule: {
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start_time: '09:00',
      end_time: '12:00',
      slot_duration_minutes: 20,
      daily_limit: 9,
      break_periods: [],
    },
  },
  {
    id: 'DOC_005',
    name: 'Dr. Vikram Singh',
    specialization: Specialization.GENERAL_PHYSICIAN,
    schedule: {
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      start_time: '08:00',
      end_time: '17:00',
      slot_duration_minutes: 15,
      daily_limit: 12,
      break_periods: [
        { from: '13:00', to: '14:00' },
      ],
    },
  },
];

// ─────────────────────────────────────────────
// Specialization Aliases
// Maps natural language words to Specialization enum
// Used by IntentService for entity extraction
// ─────────────────────────────────────────────

export const SPECIALIZATION_ALIASES: Record<string, Specialization> = {
  // Dermatology
  skin: Specialization.DERMATOLOGY,
  'skin doctor': Specialization.DERMATOLOGY,
  derma: Specialization.DERMATOLOGY,
  dermatology: Specialization.DERMATOLOGY,
  dermatologist: Specialization.DERMATOLOGY,

  // Cardiology
  heart: Specialization.CARDIOLOGY,
  'heart doctor': Specialization.CARDIOLOGY,
  cardiac: Specialization.CARDIOLOGY,
  cardio: Specialization.CARDIOLOGY,
  cardiology: Specialization.CARDIOLOGY,
  cardiologist: Specialization.CARDIOLOGY,

  // Orthopedics
  bone: Specialization.ORTHOPEDICS,
  'bone doctor': Specialization.ORTHOPEDICS,
  ortho: Specialization.ORTHOPEDICS,
  orthopedic: Specialization.ORTHOPEDICS,
  orthopedics: Specialization.ORTHOPEDICS,
  joint: Specialization.ORTHOPEDICS,
  joints: Specialization.ORTHOPEDICS,

  // Pediatrics
  child: Specialization.PEDIATRICS,
  'child doctor': Specialization.PEDIATRICS,
  kids: Specialization.PEDIATRICS,
  baby: Specialization.PEDIATRICS,
  pediatric: Specialization.PEDIATRICS,
  pediatrics: Specialization.PEDIATRICS,
  pediatrician: Specialization.PEDIATRICS,

  // General Physician
  general: Specialization.GENERAL_PHYSICIAN,
  gp: Specialization.GENERAL_PHYSICIAN,
  fever: Specialization.GENERAL_PHYSICIAN,
  cold: Specialization.GENERAL_PHYSICIAN,
  cough: Specialization.GENERAL_PHYSICIAN,
  normal: Specialization.GENERAL_PHYSICIAN,
  'general physician': Specialization.GENERAL_PHYSICIAN,
  'general doctor': Specialization.GENERAL_PHYSICIAN,
};