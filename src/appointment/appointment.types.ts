// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export enum IntentType {
  BOOK_APPOINTMENT = 'BOOK_APPOINTMENT',
  CANCEL_APPOINTMENT = 'CANCEL_APPOINTMENT',
  VIEW_APPOINTMENTS = 'VIEW_APPOINTMENTS',
  CHECK_SLOTS = 'CHECK_SLOTS',
  UNKNOWN = 'UNKNOWN',
}

export enum AppointmentStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum Specialization {
  DERMATOLOGY = 'Dermatology',
  CARDIOLOGY = 'Cardiology',
  ORTHOPEDICS = 'Orthopedics',
  PEDIATRICS = 'Pediatrics',
  GENERAL_PHYSICIAN = 'General Physician',
}

// ─────────────────────────────────────────────
// Doctor Interfaces
// ─────────────────────────────────────────────

export interface BreakPeriod {
  from: string; // "13:00"
  to: string;   // "14:00"
}

export interface DoctorSchedule {
  available_days: string[];        // ["Monday", "Tuesday", ...]
  start_time: string;              // "09:00"
  end_time: string;                // "17:00"
  slot_duration_minutes: number;   // 30
  daily_limit: number;             // max bookings per day
  break_periods: BreakPeriod[];
}

export interface Doctor {
  id: string;
  name: string;
  specialization: Specialization;
  schedule: DoctorSchedule;
}

// ─────────────────────────────────────────────
// Appointment Interfaces
// ─────────────────────────────────────────────

export interface Appointment {
  booking_id: string;
  user_phone: string;
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  date: string;        // "2026-05-14"
  time: string;        // "09:00"
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// Session / Conversation State Interfaces
// ─────────────────────────────────────────────

export interface SessionContext {
  doctor_id?: string;
  specialization?: string;
  date?: string;        // "2026-05-14"
  time?: string;        // "09:00"
  booking_id?: string;
  suggested_slot?: { date: string; time: string }; // ← ADD THIS
}

export interface Session {
  user_phone: string;
  last_intent: IntentType;
  context: SessionContext;
  updated_at: string;
}

// ─────────────────────────────────────────────
// Intent Detection Interfaces
// ─────────────────────────────────────────────

export interface ExtractedEntities {
  doctor_name?: string;
  specialization?: Specialization;
  date?: string;        // "2026-05-14"
  time?: string;        // "09:00"
  booking_id?: string;
}

export interface IntentResult {
  intent: IntentType;
  entities: ExtractedEntities;
}

// ─────────────────────────────────────────────
// Bot Response Interface
// ─────────────────────────────────────────────

export interface BotResponse {
  reply: string;
  intent: IntentType;
  entities: ExtractedEntities;
  session_context: SessionContext;
  data?: any;
}

// ─────────────────────────────────────────────
// Slot Interface
// ─────────────────────────────────────────────

export interface TimeSlot {
  time: string;          // "09:00"
  available: boolean;
}