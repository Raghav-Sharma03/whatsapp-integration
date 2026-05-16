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
  // Intent detection
  // Uses regex pattern groups for robust NLP
  // Order: decline → cancel → view → slots → book → confirm → unknown
  // ─────────────────────────────────────────────
private detectIntent(normalised: string): IntentType {

    // ── Decline / negative responses ──
    const declinePatterns = [
      /^(no|nope|nah|nahi|never mind|nevermind|forget it|cancel that)[\.\!]?$/,
    ];
    if (declinePatterns.some((p) => p.test(normalised))) {
      return IntentType.UNKNOWN;
    }

    // ── Cancel intent ──
    const cancelPatterns = [
      /\b(cancel|cancl|cancell|cansel)\b/,
      /\b(reschedule|drop|remove|delete|withdraw)\b.*(appointment|booking|slot|visit)/,
      /\b(call\s*off)\b.*(appointment|booking|visit)/,
      /\bi\s*(won't|wont|cannot|can't|cant)\s*be\s*(coming|there|attending|making it)\b/,
      /\bdon'?t\s*(want|need).*(appointment|booking|slot)\b/,
      /\bremove\s*(my|the)?\s*(appointment|booking|slot)\b/,
    ];
    if (cancelPatterns.some((p) => p.test(normalised))) {
      return IntentType.CANCEL_APPOINTMENT;
    }

    // ── View intent ──
    // Must run before CHECK_SLOTS and BOOK
    const viewPatterns = [
      /\b(show|shw|shwo|display|list)\b.*(appointment|booking|visit|schedule)/,
      /\b(view|veiw)\b.*(appointment|booking|visit)/,
      /\bmy\s*(appointment|booking|visit|schedule|upcoming)\b/,
      /\b(upcoming|scheduled|booked)\s*(appointment|visit|booking)s?\b/,
      /\bwhat\s*(do\s*i\s*have|appointments|visits|bookings)\b/,
      /\bany\s*(upcoming|scheduled|booked)\b/,
      /\bcheck\s*my\s*(appointment|booking|bookings|visit|schedule)\b/,
      /\bdo\s*i\s*have\s*(an?\s*)?(appointment|booking|visit|slot)\b/,
      /\bdo\s*i\s*(have|got)\s*(any\s*)?(appointment|booking|visit|schedule)/,
      /\bmy\s*(schedule|calendar|visits)\b/,
    ];
    if (viewPatterns.some((p) => p.test(normalised))) {
      return IntentType.VIEW_APPOINTMENTS;
    }

    // ── Check slots intent ──
    // Doctor-availability patterns run BEFORE broad book patterns
    // to avoid "is dr X free" being caught by \b(doctor|dr)\b in book
    const slotPatterns = [
      /\b(slot|slots|slott|slotts)\b/,
      /\b(availability|available\s*slots|free\s*slots|open\s*slots)\b/,
      /\b(check|chek|chck)\s*(slot|availability|schedule|timing)/,
      /\bwhen\s*is\s*(dr\.?|doctor)?\s*\w+\s*(free|available|open)\b/,
      /\bis\s*(dr\.?|doctor)\s*\w+\s*(free|available|open)\b/,
      /\bany\s*(opening|openings|slot|slots|availability)\b/,
      /\bwhat\s*(time|slot|slots)\s*(is|are)?\s*(available|free|open)\b/,
      /\bshow\s*(me\s*)?(available|free|open)\s*(slot|slots|time|timing)\b/,
      /\btiming\b/,
    ];
    // "get me a slot" / "give me a slot" → BOOK, not CHECK_SLOTS
    // Must run before slotPatterns since "slot" keyword would otherwise match CHECK_SLOTS
    const getSlotPattern = /\b(get|give)\s*me\s*(a\s*)?(slot|appointment|visit|booking)\b/;
    if (getSlotPattern.test(normalised)) {
      return IntentType.BOOK_APPOINTMENT;
    }

    if (slotPatterns.some((p) => p.test(normalised))) {
      return IntentType.CHECK_SLOTS;
    }

    // ── Book intent ──
    // "get me a slot" → BOOK (slot keyword already checked above, no match → reaches here)
    // Symptom-based booking: "my back hurts", "I feel dizzy", "my child is sick"
    const bookPatterns = [
      /\b(book|buk|bok|boook)\b/,
      /\b(appointment|appointmnt|appoinment|apointment|appt)\b/,
      /\b(schedule|shedule|schedual)\b.*(doctor|dr\.?|visit|appointment|slot)/,
      /\b(consult|consultt|consultation)\b/,
      /\b(see|meet|visit)\s*(a\s*)?(doctor|dr\.?|physician|specialist)\b/,
      /\bi'?d?\s*(like|want|need|wish)\s*to\s*(see|meet|visit|consult)\b/,
      /\b(need|want|require)\s*(a\s*)?(doctor|dr\.?|physician|checkup|check-up|consultation)\b/,
      /\b(fix|make|set\s*up|arrange)\s*(a\s*)?(slot|appointment|visit|consultation)\b/,
      /\b(get|give)\s*me\s*(a\s*)?(slot|appointment|visit|booking)\b/,
      /\bcan\s*i\s*(get|have|book|see)\s*(a\s*)?(doctor|appointment|slot|visit)\b/,
      /\bi\s*(have|got|feel|am\s*having)\s*(a\s*)?(fever|pain|problem|issue|ache|symptoms?)\b/,
      /\b(dizzy|dizziness|hurting|hurts|aching|aches|sick|ill|unwell)\b/,
      /\b(doctor|dr\.?)\b/,
    ];
    if (bookPatterns.some((p) => p.test(normalised))) {
      return IntentType.BOOK_APPOINTMENT;
    }

    // ── Confirmation ──
    const confirmPatterns = [
      /^(yes|yeah|yep|yup|ok|okay|sure|confirm|absolutely|definitely|perfect|great|fine|alright|sounds good|that works|go ahead|proceed)[\.\!]?$/,
      /^(haan|bilkul|theek hai|done)[\.\!]?$/,
    ];
    if (confirmPatterns.some((p) => p.test(normalised))) {
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
    const prefixMatch = normalised.match(
      /(?:dr\.?\s+|doctor\s+)([a-z]+)/i,
    );
    if (prefixMatch?.[1]) {
      this.logger.log(`[Intent] Doctor name via prefix: "${prefixMatch[1]}"`);
      return prefixMatch[1].toLowerCase().trim();
    }

    const knownFirstNames = MOCK_DOCTORS.map((d) =>
      d.name.toLowerCase().split(' ')[1],
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
  // Extract specialization — extended symptom keywords
  // ─────────────────────────────────────────────
  private extractSpecialization(normalised: string): Specialization | undefined {

    // Dermatology
    const dermaPatterns = [
      /\b(skin|dermat|acne|rash|eczema|psoriasis|pimple|pimples|itching|itch|hives|allerg)\b/,
      /\bhair\s*(fall|loss|thinning)\b/,
      /\b(dandruff|fungal|nail\s*infection|sun\s*burn|sunburn)\b/,
    ];
    if (dermaPatterns.some((p) => p.test(normalised))) {
      return Specialization.DERMATOLOGY;
    }

    // Cardiology
    const cardioPatterns = [
      /\b(heart|cardio|cardiac|palpitation|palpitations)\b/,
      /\bchest\s*(pain|tightness|discomfort|pressure)\b/,
      /\b(blood\s*pressure|bp|hypertension|cholesterol)\b/,
      /\b(shortness\s*of\s*breath|breathless|irregular\s*heartbeat|arrhythmia)\b/,
    ];
    if (cardioPatterns.some((p) => p.test(normalised))) {
      return Specialization.CARDIOLOGY;
    }

    // Orthopedics
    const orthoPatterns = [
      /\b(bone|bones|ortho|fracture|fractures|spine|spinal)\b/,
      /\b(joint|joints|knee|knees|shoulder|elbow|wrist|ankle|hip)\b/,
      /\b(back\s*pain|backache|neck\s*pain|muscle\s*pain|sprain|strain)\b/,
      /\b(swollen|swelling|stiffness|arthritis|slip\s*disc|slipped\s*disc)\b/,
      /\bmy\s*(back|neck|knee|shoulder|joint|hip|wrist|ankle)\s*(hurts|aches|is\s*paining|is\s*hurting|pain|hurting|aching)\b/,
      /\b(back|neck|knee|shoulder|hip|wrist|ankle)\s*(is\s*)?(hurting|aching|paining|painful|hurt|sore)\b/,
    ];
    if (orthoPatterns.some((p) => p.test(normalised))) {
      return Specialization.ORTHOPEDICS;
    }

    // Pediatrics
    const pediatricPatterns = [
      /\b(child|children|kid|kids|baby|babies|infant|toddler|newborn)\b/,
      /\b(pediatric|paediat|paediatric)\b/,
      /\b(my\s*(son|daughter|child|kid|baby)\s*(is\s*)?(sick|ill|fever|not\s*well))\b/,
    ];
    if (pediatricPatterns.some((p) => p.test(normalised))) {
      return Specialization.PEDIATRICS;
    }

    // General Physician
    const generalPatterns = [
      /\b(fever|cold|cough|flu|viral|infection|infections)\b/,
      /\b(stomach|digestion|digestive|nausea|vomit|vomiting|diarrhea|diarrhoea)\b/,
      /\b(headache|migraine|dizziness|dizzy|fatigue|weakness|tired|lethargy)\b/,
      /\b(general|physician|checkup|check-up|routine|body\s*ache|bodyache)\b/,
      /\b(sore\s*throat|runny\s*nose|congestion|sinusitis|allergy)\b/,
      /\b(not\s*feeling\s*well|feeling\s*sick|feeling\s*unwell|feeling\s*ill)\b/,
      /\b(breathing\s*problem|breathing\s*difficulty|breathless)\b/,
    ];
    if (generalPatterns.some((p) => p.test(normalised))) {
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

    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (const day of weekdays) {
      if (normalised.includes(day)) {
        return this.toDateString(this.getNextWeekday(day));
      }
    }

    const dateMatch = normalised.match(
      /(\d{1,2})\s*(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/,
    );
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = this.monthNameToNumber(dateMatch[2]);
      const year = today.getFullYear();
      const parsedDate = new Date(year, month, day);
      if (parsedDate < today) parsedDate.setFullYear(year + 1);
      return this.toDateString(parsedDate);
    }

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
    if (normalised.includes('noon') || normalised.includes('midday')) return '12:00';
    if (normalised.includes('morning')) return '09:00';
    if (normalised.includes('afternoon')) return '14:00';
    if (normalised.includes('evening')) return '17:00';
    if (normalised.includes('night')) return '18:00';

    const timeMatch = normalised.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const minute = timeMatch[2] || '00';
      const meridian = timeMatch[3].toLowerCase();
      if (meridian === 'pm' && hour !== 12) hour += 12;
      if (meridian === 'am' && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, '0')}:${minute}`;
    }

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