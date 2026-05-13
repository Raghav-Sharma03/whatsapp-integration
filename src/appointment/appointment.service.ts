import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  Appointment,
  AppointmentStatus,
  Specialization,
} from './appointment.types';
import { DoctorService } from '../doctor/doctor.service';

@Injectable()
export class AppointmentService implements OnModuleInit {
  private readonly logger = new Logger(AppointmentService.name);

  private appointments = new Map<string, Appointment>();

  private readonly STORE_FILE = path.join(
    process.cwd(),
    'data',
    'appointments.json',
  );

  constructor(private readonly doctorService: DoctorService) {}

  // ─────────────────────────────────────────────
  // OnModuleInit: load appointments from file
  // ─────────────────────────────────────────────
  onModuleInit() {
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (!fs.existsSync(this.STORE_FILE)) {
        this.logger.log('[Appointment] No existing store — starting fresh');
        return;
      }
      const raw = fs.readFileSync(this.STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, Appointment>;
      this.appointments = new Map(Object.entries(parsed));
      this.logger.log(
        `[Appointment] Loaded ${this.appointments.size} appointment(s) from file`,
      );
    } catch (err) {
      this.logger.error(
        `[Appointment] Failed to load — starting fresh. Error: ${(err as Error).message}`,
      );
      this.appointments = new Map();
    }
  }

  private persistToFile(): void {
    try {
      const dir = path.dirname(this.STORE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const plain = Object.fromEntries(this.appointments);
      fs.writeFileSync(
        this.STORE_FILE,
        JSON.stringify(plain, null, 2),
        'utf-8',
      );
      this.logger.log(
        `[Appointment] Persisted ${this.appointments.size} appointment(s) to file`,
      );
    } catch (err) {
      this.logger.error(
        `[Appointment] Failed to persist: ${(err as Error).message}`,
      );
    }
  }

  // ─────────────────────────────────────────────
  // Generate unique booking ID
  // ─────────────────────────────────────────────
  private generateBookingId(): string {
    return 'APT_' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  // ─────────────────────────────────────────────
  // Get booked times for a doctor on a date
  // Returns array of "HH:MM" strings
  // ─────────────────────────────────────────────
  getBookedTimes(doctorId: string, date: string): string[] {
    const booked: string[] = [];
    for (const apt of this.appointments.values()) {
      if (
        apt.doctor_id === doctorId &&
        apt.date === date &&
        apt.status === AppointmentStatus.CONFIRMED
      ) {
        booked.push(apt.time);
      }
    }
    return booked;
  }

  // ─────────────────────────────────────────────
  // Get all booked times map for a doctor
  // Returns Map<date, string[]> for slot searching
  // ─────────────────────────────────────────────
  private getBookedTimesMap(doctorId: string): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const apt of this.appointments.values()) {
      if (
        apt.doctor_id === doctorId &&
        apt.status === AppointmentStatus.CONFIRMED
      ) {
        const existing = map.get(apt.date) || [];
        existing.push(apt.time);
        map.set(apt.date, existing);
      }
    }
    return map;
  }

  // ─────────────────────────────────────────────
  // Book an appointment
  // Full validation: past date, duplicate, slot available
  // ─────────────────────────────────────────────
  book(
    userPhone: string,
    doctorId: string,
    date: string,
    time: string,
  ): {
    success: boolean;
    message: string;
    appointment?: Appointment;
    suggestion?: { date: string; time: string };
  } {
    this.logger.log(
      `[Appointment] Booking: user=${userPhone}, doctor=${doctorId}, date=${date}, time=${time}`,
    );

    const doctor = this.doctorService.getDoctorById(doctorId);
    if (!doctor) {
      this.logger.warn(`[Appointment] Doctor not found: ${doctorId}`);
      return { success: false, message: 'Doctor not found.' };
    }

    // Check past date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      this.logger.warn(`[Appointment] Past date booking attempt: ${date}`);
      return {
        success: false,
        message: `Cannot book an appointment in the past. Please choose today or a future date.`,
      };
    }

    // Check doctor available on that day
    if (!this.doctorService.isDoctorAvailableOnDate(doctor, date)) {
      const next = this.doctorService.findNextAvailableSlot(
        doctor,
        date,
        this.getBookedTimesMap(doctorId),
      );
      this.logger.warn(
        `[Appointment] Doctor not available on ${date}`,
      );
      return {
        success: false,
        message: `${doctor.name} is not available on ${this.formatDate(date)}. ${next ? `Next available: ${this.formatDate(next.date)} at ${this.formatTime(next.time)}.` : 'No slots available in the next 7 days.'}`,
        suggestion: next || undefined,
      };
    }

    const bookedTimes = this.getBookedTimes(doctorId, date);

    // Check daily limit
    if (bookedTimes.length >= doctor.schedule.daily_limit) {
      const next = this.doctorService.findNextAvailableSlot(
        doctor,
        date,
        this.getBookedTimesMap(doctorId),
      );
      this.logger.warn(`[Appointment] Daily limit reached for ${doctorId} on ${date}`);
      return {
        success: false,
        message: `${doctor.name} is fully booked on ${this.formatDate(date)}. ${next ? `Next available: ${this.formatDate(next.date)} at ${this.formatTime(next.time)}.` : 'No slots available in the next 7 days.'}`,
        suggestion: next || undefined,
      };
    }
    const duplicate = Array.from(this.appointments.values()).find(
      (apt) =>
        apt.user_phone === userPhone &&
        apt.doctor_id === doctorId &&
        apt.date === date &&
        apt.time === time &&
        apt.status === AppointmentStatus.CONFIRMED,
    );
    if (duplicate) {
      this.logger.warn(`[Appointment] Duplicate booking detected`);
      return {
        success: false,
        message: `You already have an appointment with ${doctor.name} on ${this.formatDate(date)} at ${this.formatTime(time)}.`,
      };
    }

    // Check slot available
    if (
      !this.doctorService.isSlotAvailable(doctor, date, time, bookedTimes)
    ) {
      // Find next available slot
      const slots = this.doctorService.getAvailableSlots(
        doctor,
        date,
        bookedTimes,
      );
      const nextSlot = slots.find((s) => s.available);
      this.logger.warn(`[Appointment] Slot ${time} not available`);
      return {
        success: false,
        message: `The slot at ${this.formatTime(time)} is not available. ${nextSlot ? `Next available slot: ${this.formatTime(nextSlot.time)}.` : 'No more slots available today.'}`,
        suggestion: nextSlot ? { date, time: nextSlot.time } : undefined,
      };
    }

    

    // All checks passed — create appointment
    const bookingId = this.generateBookingId();
    const appointment: Appointment = {
      booking_id: bookingId,
      user_phone: userPhone,
      doctor_id: doctorId,
      doctor_name: doctor.name,
      specialization: doctor.specialization,
      date,
      time,
      status: AppointmentStatus.CONFIRMED,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.appointments.set(bookingId, appointment);
    this.persistToFile();

    this.logger.log(
      `[Appointment] Booked successfully: ${bookingId}`,
    );

    return {
      success: true,
      message: `Appointment confirmed with ${doctor.name} on ${this.formatDate(date)} at ${this.formatTime(time)}. Booking ID: ${bookingId}`,
      appointment,
    };
  }

  // ─────────────────────────────────────────────
  // Cancel an appointment
  // Validates: exists, belongs to user, not already cancelled, not past
  // ─────────────────────────────────────────────
  cancel(
    userPhone: string,
    bookingId: string,
  ): { success: boolean; message: string } {
    this.logger.log(
      `[Appointment] Cancel request: user=${userPhone}, bookingId=${bookingId}`,
    );

    const appointment = this.appointments.get(bookingId);

    if (!appointment) {
      this.logger.warn(`[Appointment] Booking not found: ${bookingId}`);
      return {
        success: false,
        message: `No appointment found with booking ID ${bookingId}.`,
      };
    }

    if (appointment.user_phone !== userPhone) {
      this.logger.warn(`[Appointment] Unauthorised cancel attempt`);
      return {
        success: false,
        message: `This appointment does not belong to your account.`,
      };
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      this.logger.warn(`[Appointment] Already cancelled: ${bookingId}`);
      return {
        success: false,
        message: `This appointment is already cancelled.`,
      };
    }

    // Check if appointment is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(appointment.date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      this.logger.warn(`[Appointment] Cannot cancel past appointment`);
      return {
        success: false,
        message: `Cannot cancel a past appointment.`,
      };
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.updated_at = new Date().toISOString();
    this.appointments.set(bookingId, appointment);
    this.persistToFile();

    this.logger.log(`[Appointment] Cancelled: ${bookingId}`);

    return {
      success: true,
      message: `Your appointment with ${appointment.doctor_name} on ${this.formatDate(appointment.date)} at ${this.formatTime(appointment.time)} has been cancelled.`,
    };
  }

  // ─────────────────────────────────────────────
  // Cancel by time — finds appointment by user + time
  // Used when user says "cancel my 5 PM appointment"
  // ─────────────────────────────────────────────
  cancelByTime(
    userPhone: string,
    time: string,
  ): { success: boolean; message: string; matches?: Appointment[] } {
    this.logger.log(
      `[Appointment] Cancel by time: user=${userPhone}, time=${time}`,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const matches = Array.from(this.appointments.values()).filter(
      (apt) =>
        apt.user_phone === userPhone &&
        apt.time === time &&
        apt.status === AppointmentStatus.CONFIRMED &&
        new Date(apt.date) >= today,
    );

    if (matches.length === 0) {
      return {
        success: false,
        message: `No upcoming appointment found at ${this.formatTime(time)}.`,
      };
    }

    if (matches.length > 1) {
      // Ambiguous — return matches for user to choose
      return {
        success: false,
        message: `You have multiple appointments at ${this.formatTime(time)}. Please provide the booking ID to cancel. Your bookings: ${matches.map((m) => `${m.booking_id} with ${m.doctor_name} on ${this.formatDate(m.date)}`).join(', ')}.`,
        matches,
      };
    }

    return this.cancel(userPhone, matches[0].booking_id);
  }

  // ─────────────────────────────────────────────
  // Get appointments for a user
  // Returns only CONFIRMED upcoming appointments by default
  // ─────────────────────────────────────────────
  getByUser(
    userPhone: string,
    includeAll: boolean = false,
  ): Appointment[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = Array.from(this.appointments.values()).filter((apt) => {
      if (apt.user_phone !== userPhone) return false;
      if (!includeAll && apt.status !== AppointmentStatus.CONFIRMED) return false;
      if (!includeAll && new Date(apt.date) < today) return false;
      return true;
    });

    this.logger.log(
      `[Appointment] Found ${results.length} appointment(s) for ${userPhone}`,
    );

    return results.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  // ─────────────────────────────────────────────
  // Get available slots for a doctor on a date
  // Wrapper used by BotService
  // ─────────────────────────────────────────────
  getAvailableSlots(doctorId: string, date: string) {
    const doctor = this.doctorService.getDoctorById(doctorId);
    if (!doctor) return [];
    const bookedTimes = this.getBookedTimes(doctorId, date);
    return this.doctorService.getAvailableSlots(doctor, date, bookedTimes);
  }

  // ─────────────────────────────────────────────
  // Format helpers for user-friendly messages
  // ─────────────────────────────────────────────
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  // ─────────────────────────────────────────────
  // Clear all appointments (for testing only)
  // ─────────────────────────────────────────────
  clearAll(): void {
    this.appointments.clear();
    this.persistToFile();
  }
}