import { Injectable, Logger } from '@nestjs/common';
import { MOCK_DOCTORS, SPECIALIZATION_ALIASES } from './doctor.mock';
import {
  Doctor,
  Specialization,
  TimeSlot,
} from '../appointment/appointment.types';

@Injectable()
export class DoctorService {
  private readonly logger = new Logger(DoctorService.name);

  // ─────────────────────────────────────────────
  // Get all doctors
  // ─────────────────────────────────────────────
  getAllDoctors(): Doctor[] {
    return MOCK_DOCTORS;
  }

  // ─────────────────────────────────────────────
  // Get doctor by ID
  // ─────────────────────────────────────────────
  getDoctorById(doctorId: string): Doctor | null {
    const doctor = MOCK_DOCTORS.find((d) => d.id === doctorId);
    if (!doctor) {
      this.logger.warn(`[Doctor] Doctor not found: ${doctorId}`);
      return null;
    }
    return doctor;
  }

  // ─────────────────────────────────────────────
  // Get doctors by specialization
  // ─────────────────────────────────────────────
  getDoctorsBySpecialization(specialization: Specialization): Doctor[] {
    return MOCK_DOCTORS.filter((d) => d.specialization === specialization);
  }

  // ─────────────────────────────────────────────
  // Find doctor by name (fuzzy match — case insensitive)
  // Handles partial names and typos like "rajesh" or "dr rajesh"
  // ─────────────────────────────────────────────
  findDoctorByName(name: string): Doctor | null {
    const normalised = name.toLowerCase().replace(/^dr\.?\s*/i, '').trim();

    this.logger.log(`[Doctor] Searching for doctor by name: "${normalised}"`);

    // Exact match first
    const exact = MOCK_DOCTORS.find((d) =>
      d.name.toLowerCase().includes(normalised),
    );
    if (exact) return exact;

    // Fuzzy — check if any word in the query matches any word in doctor name
    const queryWords = normalised.split(' ');
    const fuzzy = MOCK_DOCTORS.find((d) => {
      const doctorWords = d.name.toLowerCase().split(' ');
      return queryWords.some((qw) =>
        doctorWords.some((dw) => dw.includes(qw) || qw.includes(dw)),
      );
    });

    if (fuzzy) {
      this.logger.log(
        `[Doctor] Fuzzy match found: "${fuzzy.name}" for query "${name}"`,
      );
      return fuzzy;
    }

    this.logger.warn(`[Doctor] No doctor found for name: "${name}"`);
    return null;
  }

  // ─────────────────────────────────────────────
  // Resolve specialization from natural language alias
  // "skin doctor" → Specialization.DERMATOLOGY
  // ─────────────────────────────────────────────
  resolveSpecialization(input: string): Specialization | null {
    const normalised = input.toLowerCase().trim();

    // Direct alias lookup
    if (SPECIALIZATION_ALIASES[normalised]) {
      return SPECIALIZATION_ALIASES[normalised];
    }

    // Partial match — check if input contains any alias key
    for (const [alias, spec] of Object.entries(SPECIALIZATION_ALIASES)) {
      if (normalised.includes(alias) || alias.includes(normalised)) {
        return spec;
      }
    }

    return null;
  }

  // ─────────────────────────────────────────────
  // Check if doctor is available on a given date
  // date format: "2026-05-14"
  // ─────────────────────────────────────────────
  isDoctorAvailableOnDate(doctor: Doctor, date: string): boolean {
      const [year, month, day] = date.split('-').map(Number);
      const dayName = new Date(year, month - 1, day).toLocaleDateString('en-US', {
          weekday: 'long',
      });
    const available = doctor.schedule.available_days.includes(dayName);
    this.logger.log(
      `[Doctor] ${doctor.name} on ${date} (${dayName}): ${available ? 'available' : 'not available'}`,
    );
    return available;
  }

  // ─────────────────────────────────────────────
  // Generate all possible time slots for a doctor on a date
  // Respects: start_time, end_time, slot_duration, break_periods
  // ─────────────────────────────────────────────
  generateSlots(doctor: Doctor): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [startHour, startMin] = doctor.schedule.start_time
      .split(':')
      .map(Number);
    const [endHour, endMin] = doctor.schedule.end_time.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const duration = doctor.schedule.slot_duration_minutes;

    for (
      let current = startMinutes;
      current + duration <= endMinutes;
      current += duration
    ) {
      const slotTime = this.minutesToTime(current);
      const isDuringBreak = this.isDuringBreak(
        current,
        doctor.schedule.break_periods,
      );

      slots.push({
        time: slotTime,
        available: !isDuringBreak,
      });
    }

    this.logger.log(
      `[Doctor] Generated ${slots.length} slots for ${doctor.name}`,
    );
    return slots;
  }

  // ─────────────────────────────────────────────
  // Get available slots for a doctor on a specific date
  // Filters out: break periods + already booked slots
  // bookedTimes: array of "HH:MM" strings already booked
  // ─────────────────────────────────────────────
  getAvailableSlots(
    doctor: Doctor,
    date: string,
    bookedTimes: string[],
  ): TimeSlot[] {
    this.logger.log(
      `[Doctor] Getting available slots for ${doctor.name} on ${date}`,
    );

    if (!this.isDoctorAvailableOnDate(doctor, date)) {
      this.logger.warn(
        `[Doctor] ${doctor.name} is not available on ${date}`,
      );
      return [];
    }

    const allSlots = this.generateSlots(doctor);

    // Filter out booked slots
    const available = allSlots.map((slot) => ({
      ...slot,
      available: slot.available && !bookedTimes.includes(slot.time),
    }));

    const availableCount = available.filter((s) => s.available).length;
    this.logger.log(
      `[Doctor] ${availableCount} slots available for ${doctor.name} on ${date}`,
    );

    return available;
  }

  // ─────────────────────────────────────────────
  // Check if a specific slot is available
  // ─────────────────────────────────────────────
  isSlotAvailable(
    doctor: Doctor,
    date: string,
    time: string,
    bookedTimes: string[],
  ): boolean {
    if (!this.isDoctorAvailableOnDate(doctor, date)) return false;

    const [slotHour, slotMin] = time.split(':').map(Number);
    const slotMinutes = slotHour * 60 + slotMin;

    // Check within schedule bounds
    const [startHour, startMin] = doctor.schedule.start_time
      .split(':')
      .map(Number);
    const [endHour, endMin] = doctor.schedule.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (
      slotMinutes < startMinutes ||
      slotMinutes + doctor.schedule.slot_duration_minutes > endMinutes
    ) {
      this.logger.warn(
        `[Doctor] Slot ${time} is outside ${doctor.name}'s working hours`,
      );
      return false;
    }

    // Check break periods
    if (this.isDuringBreak(slotMinutes, doctor.schedule.break_periods)) {
      this.logger.warn(`[Doctor] Slot ${time} falls during a break period`);
      return false;
    }

    // Check already booked
    if (bookedTimes.includes(time)) {
      this.logger.warn(`[Doctor] Slot ${time} is already booked`);
      return false;
    }

    return true;
  }
  private isPastDate(dateStr: string): boolean {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

  // ─────────────────────────────────────────────
  // Find next available slot for a doctor
  // Searches from requested date forward up to 7 days
  // ─────────────────────────────────────────────
  findNextAvailableSlot(
    doctor: Doctor,
    fromDate: string,
    bookedTimes: Map<string, string[]>,
  ): { date: string; time: string } | null {
    this.logger.log(
      `[Doctor] Finding next available slot for ${doctor.name} from ${fromDate}`,
    );

    for (let i = 0; i <= 7; i++) {
      const checkDate = new Date(fromDate);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const booked = bookedTimes.get(dateStr) || [];
      const slots = this.getAvailableSlots(doctor, dateStr, booked);
      const firstAvailable = slots.find((s) => s.available);

      if (firstAvailable) {
        this.logger.log(
          `[Doctor] Next available slot: ${doctor.name} on ${dateStr} at ${firstAvailable.time}`,
        );
        return { date: dateStr, time: firstAvailable.time };
      }
    }

    this.logger.warn(
      `[Doctor] No available slot found for ${doctor.name} in next 7 days`,
    );
    return null;
  }

  // ─────────────────────────────────────────────
  // Find alternative doctor for same specialization
  // ─────────────────────────────────────────────
  findAlternativeDoctor(
    specialization: Specialization,
    excludeDoctorId: string,
  ): Doctor | null {
    const doctors = this.getDoctorsBySpecialization(specialization);
    const alternative = doctors.find((d) => d.id !== excludeDoctorId);
    if (alternative) {
      this.logger.log(
        `[Doctor] Alternative doctor found: ${alternative.name}`,
      );
    }
    return alternative || null;
  }

  // ─────────────────────────────────────────────
  // Helper: convert minutes to HH:MM string
  // ─────────────────────────────────────────────
  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // ─────────────────────────────────────────────
  // Helper: check if a time (in minutes) falls in any break period
  // ─────────────────────────────────────────────
  private isDuringBreak(
    timeMinutes: number,
    breakPeriods: { from: string; to: string }[],
  ): boolean {
    return breakPeriods.some((bp) => {
      const [bfH, bfM] = bp.from.split(':').map(Number);
      const [btH, btM] = bp.to.split(':').map(Number);
      const breakStart = bfH * 60 + bfM;
      const breakEnd = btH * 60 + btM;
      return timeMinutes >= breakStart && timeMinutes < breakEnd;
    });
  }
}