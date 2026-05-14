import { Injectable, Logger } from '@nestjs/common';
import {
  IntentType,
  Specialization,
} from '../appointment/appointment.types';
import { MOCK_DOCTORS } from '../doctor/doctor.mock';

@Injectable()
export class IntentService {
  private readonly logger = new Logger(IntentService.name);

  // ─────────────────────────────────────────────
  // Main detect method
  // ─────────────────────────────────────────────
  detect(message: string) {
    const normalised = message.toLowerCase().trim();

    const intent = this.detectIntent(normalised);
    const entities = {
      doctor_name: this.extractDoctorName(normalised),
      specialization: this.extractSpecialization(normalised),
      date: this.extractDate(normalised),
      time: this.extractTime(normalised),
      booking_id: this.extractBookingId(normalised),
    };

    this.logger.log(
      `[Intent] Detected | message="${message}" | intent=${intent} | entities=${JSON.stringify(entities)}`,
    );

    return { intent, entities };
  }

  // ─────────────────────────────────────────────
  // Intent detection — keyword matching with typo aliases
  // ─────────────────────────────────────────────
private detectIntent(normalised: string): IntentType {
  const cancelKeywords = [
    'cancel', 'cancl', 'cancell', 'cansel',
    'reschedule', 'remove', 'delete booking',
  ];

  const viewKeywords = [
    'show', 'shw', 'shwo',
    'view', 'veiw',
    'my appointments', 'my bookings',
    'upcoming', 'list appointments',
    'what appointments', 'do i have',
  ];
  const declineKeywords = ['no', 'nope', 'nah', 'dont', "don't"];
    if (declineKeywords.some((k) => normalised === k || normalised.startsWith(k))) {
      return IntentType.UNKNOWN; // will show help menu
    }

  const slotKeywords = [
    'slot', 'slots', 'slott',
    'availability', 'available',
    'check', 'chek', 'chck',
    'free slots', 'open slots', 'when is',
  ];

  const bookKeywords = [
    'book', 'buk', 'bok',
    'appointment', 'appointmnt', 'appoinment', 'apointment',
    'schedule', 'shedule',
    'consult', 'consultt',
    'see doctor', 'see a doctor',
    'want to see',
    'need doctor', 'need a doctor',
    'visit doctor',
    'fix appointment', 'make appointment',
    'doctor',        // catches "skin doctor", "heart doctor", "i want to see a doctor"
  ];

  // Order matters: cancel before book
  if (cancelKeywords.some((k) => normalised.includes(k))) {
    return IntentType.CANCEL_APPOINTMENT;
  }

  if (viewKeywords.some((k) => normalised.includes(k))) {
    return IntentType.VIEW_APPOINTMENTS;
  }

  if (slotKeywords.some((k) => normalised.includes(k))) {
    return IntentType.CHECK_SLOTS;
  }

  if (bookKeywords.some((k) => normalised.includes(k))) {
    return IntentType.BOOK_APPOINTMENT;
  }
  const confirmKeywords = ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'confirm', 'yup', 'absolutely'];
    if (confirmKeywords.some((k) => normalised === k || normalised === `${k}.` || normalised === `${k}!`)) {
      return IntentType.BOOK_APPOINTMENT;
  }

  return IntentType.UNKNOWN;
}

  // ─────────────────────────────────────────────
  // Extract doctor name
  // Handles: "dr rajesh", "dr. priya", "doctor anil"
  // Also scans for raw first names from mock data
  // ─────────────────────────────────────────────
  private extractDoctorName(normalised: string): string | undefined {
    // Pattern: "dr rajesh" / "dr. priya" / "doctor anil"
    const prefixMatch = normalised.match(
      /(?:dr\.?\s+|doctor\s+)([a-z]+)/i,
    );
    if (prefixMatch?.[1]) {
      this.logger.log(`[Intent] Doctor name via prefix: "${prefixMatch[1]}"`);
      return prefixMatch[1].toLowerCase().trim();
    }

    // Scan raw first names from mock data (e.g. user types "rajesh" alone)
    const knownFirstNames = MOCK_DOCTORS.map((d) =>
      d.name.toLowerCase().split(' ')[1], // "Dr. Rajesh Mehta" → "rajesh"
    );

    for (const firstName of knownFirstNames) {
      if (normalised.includes(firstName)) {
        this.logger.log(`[Intent] Doctor name via first-name scan: "${firstName}"`);
        return firstName;
      }
    }

    return undefined;
  }

  // ─────────────────────────────────────────────
  // Extract specialization — extended keyword list
  // ─────────────────────────────────────────────
  private extractSpecialization(normalised: string): Specialization | undefined {
    // Dermatology
    if (
      normalised.includes('skin') ||
      normalised.includes('dermat') ||
      normalised.includes('acne') ||
      normalised.includes('rash') ||
      normalised.includes('hair fall') ||
      normalised.includes('eczema')
    ) {
      return Specialization.DERMATOLOGY;
    }

    // Cardiology
    if (
      normalised.includes('heart') ||
      normalised.includes('cardio') ||
      normalised.includes('chest pain') ||
      normalised.includes('blood pressure') ||
      normalised.includes('bp') ||
      normalised.includes('palpitation')
    ) {
      return Specialization.CARDIOLOGY;
    }

    // Orthopedics
    if (
      normalised.includes('bone') ||
      normalised.includes('ortho') ||
      normalised.includes('joint') ||
      normalised.includes('knee') ||
      normalised.includes('back pain') ||
      normalised.includes('fracture') ||
      normalised.includes('spine')
    ) {
      return Specialization.ORTHOPEDICS;
    }

    // Pediatrics
    if (
      normalised.includes('child') ||
      normalised.includes('kids') ||
      normalised.includes('baby') ||
      normalised.includes('infant') ||
      normalised.includes('pediatric') ||
      normalised.includes('paediat')
    ) {
      return Specialization.PEDIATRICS;
    }

    // General Physician
    if (
      normalised.includes('fever') ||
      normalised.includes('cold') ||
      normalised.includes('cough') ||
      normalised.includes('general') ||
      normalised.includes('flu') ||
      normalised.includes('stomach') ||
      normalised.includes('digestion') ||
      normalised.includes('headache') ||
      normalised.includes('vomit') ||
      normalised.includes('weakness')
    ) {
      return Specialization.GENERAL_PHYSICIAN;
    }

    return undefined;
  }

  // ─────────────────────────────────────────────
  // Extract date — handles natural language + ordinals
  // ─────────────────────────────────────────────
  private extractDate(normalised: string): string | undefined {
    const today = new Date();

    if (normalised.includes('today')) {
      return this.toDateString(today);
    }

    if (normalised.includes('tomorrow') || normalised.includes('tmrw') || normalised.includes('tmw')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return this.toDateString(tomorrow);
    }

    if (normalised.includes('day after tomorrow') || normalised.includes('day after tmrw')) {
      const dayAfter = new Date(today);
      dayAfter.setDate(today.getDate() + 2);
      return this.toDateString(dayAfter);
    }

    // Weekday names
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (const day of weekdays) {
      if (normalised.includes(day)) {
        return this.toDateString(this.getNextWeekday(day));
      }
    }

    // "15th may" / "3 june" / "20 jan"
    const dateMatch = normalised.match(
      /(\d{1,2})\s*(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/,
    );
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = this.monthNameToNumber(dateMatch[2]);
      const year = today.getFullYear();
      const parsedDate = new Date(year, month, day);
      // If date already passed this year, use next year
      if (parsedDate < today) parsedDate.setFullYear(year + 1);
      return this.toDateString(parsedDate);
    }

    // "next week" → 7 days from now
    if (normalised.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return this.toDateString(nextWeek);
    }

    return undefined;
  }

  // ─────────────────────────────────────────────
  // Extract time — extended natural language support
  // ─────────────────────────────────────────────
  private extractTime(normalised: string): string | undefined {
    // Natural language periods — check before AM/PM match
    if (normalised.includes('noon') || normalised.includes('midday')) {
      return '12:00';
    }

    if (normalised.includes('morning')) {
      return '09:00';
    }

    if (normalised.includes('afternoon')) {
      return '14:00';
    }

    if (normalised.includes('evening')) {
      return '17:00';
    }

    if (normalised.includes('night')) {
      return '18:00';
    }

    // "10:30 AM" / "5 PM" / "10am"
    const timeMatch = normalised.match(
      /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
    );
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const minute = timeMatch[2] || '00';
      const meridian = timeMatch[3].toLowerCase();

      if (meridian === 'pm' && hour !== 12) hour += 12;
      if (meridian === 'am' && hour === 12) hour = 0;

      return `${hour.toString().padStart(2, '0')}:${minute}`;
    }

    // 24-hour format: "14:30" or "09:00"
    const militaryMatch = normalised.match(/\b(\d{1,2}):(\d{2})\b/);
    if (militaryMatch) {
      const hour = parseInt(militaryMatch[1], 10);
      const minute = militaryMatch[2];
      if (hour >= 0 && hour <= 23) {
        return `${hour.toString().padStart(2, '0')}:${minute}`;
      }
    }

    return undefined;
  }

  // ─────────────────────────────────────────────
  // Extract booking ID — APT_XXXXXX format
  // ─────────────────────────────────────────────
  private extractBookingId(normalised: string): string | undefined {
    const match = normalised.match(/apt_[a-z0-9]+/i);
    if (match) return match[0].toUpperCase();
    return undefined;
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  private toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private getNextWeekday(dayName: string): Date {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const targetDay = weekdays.indexOf(dayName);
    const currentDay = today.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    const result = new Date(today);
    result.setDate(today.getDate() + diff);
    return result;
  }

  private monthNameToNumber(month: string): number {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3,
      may: 4, jun: 5, jul: 6, aug: 7,
      sep: 8, oct: 9, nov: 10, dec: 11,
    };
    return months[month.toLowerCase()];
  }
}