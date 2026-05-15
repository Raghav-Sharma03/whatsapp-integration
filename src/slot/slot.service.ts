import { Injectable } from '@nestjs/common';
import { Doctor, TimeSlot, Appointment } from '../appointment/appointment.types';

@Injectable()
export class SlotService {
  /**
   * Generate all possible time slots for a doctor on a specific date
   */
  generateDaySlots(doctor: Doctor, date: string): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const { schedule } = doctor;
    
    // Check if doctor available on this day
    const dayName = this.getDayName(date);
    if (!schedule.available_days.includes(dayName)) {
      return [];
    }

    // Generate slots from start to end time
    let currentTime = this.parseTime(schedule.start_time);
    const endTime = this.parseTime(schedule.end_time);
    
    while (currentTime < endTime) {
      const timeStr = this.formatTime(currentTime);
      
      // Check if time is during break
      const isDuringBreak = this.isBreakTime(timeStr, schedule.break_periods);
      
      if (!isDuringBreak) {
        slots.push({
          time: timeStr,
          available: true, // will be updated based on bookings
        });
      }
      
      currentTime += schedule.slot_duration_minutes;
    }
    
    return slots;
  }

  /**
   * Check if a specific slot is available
   */
  isSlotAvailable(
    doctor: Doctor,
    date: string,
    time: string,
    existingAppointments: Appointment[],
  ): { available: boolean; reason?: string } {
    // Check past date
    if (this.isPastDate(date)) {
      return { available: false, reason: 'Cannot book appointments in the past' };
    }

    // Check day availability
    const dayName = this.getDayName(date);
    if (!doctor.schedule.available_days.includes(dayName)) {
      return { available: false, reason: `Dr. ${doctor.name} is not available on ${dayName}` };
    }

    // Check time within working hours
    const timeMinutes = this.parseTime(time);
    const startMinutes = this.parseTime(doctor.schedule.start_time);
    const endMinutes = this.parseTime(doctor.schedule.end_time);
    
    if (timeMinutes < startMinutes || timeMinutes >= endMinutes) {
      return { available: false, reason: 'Time outside working hours' };
    }

    // Check break period
    if (this.isBreakTime(time, doctor.schedule.break_periods)) {
      return { available: false, reason: 'Time falls during break period' };
    }

    // Check daily booking limit
    const dayBookings = existingAppointments.filter(
      apt => apt.doctor_id === doctor.id && apt.date === date && apt.status === 'CONFIRMED',
    );
    
    if (dayBookings.length >= doctor.schedule.daily_limit) {
      return { available: false, reason: 'Daily booking limit reached' };
    }

    // Check if slot already booked
    const slotBooked = dayBookings.some(apt => apt.time === time);
    if (slotBooked) {
      return { available: false, reason: 'Slot already booked' };
    }

    return { available: true };
  }

  /**
   * Get available slots for a doctor on a date (filtered by bookings)
   */
  getAvailableSlots(
    doctor: Doctor,
    date: string,
    existingAppointments: Appointment[],
  ): TimeSlot[] {
    const allSlots = this.generateDaySlots(doctor, date);
    
    return allSlots.map(slot => ({
      ...slot,
      available: this.isSlotAvailable(doctor, date, slot.time, existingAppointments).available,
    }));
  }

  /**
   * Suggest alternative slots if requested slot unavailable
   */
  suggestAlternatives(
    doctor: Doctor,
    date: string,
    existingAppointments: Appointment[],
    limit: number = 3,
  ): TimeSlot[] {
    const availableSlots = this.getAvailableSlots(doctor, date, existingAppointments)
      .filter(slot => slot.available)
      .slice(0, limit);
    
    return availableSlots;
  }

  // ─────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────

  private getDayName(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long' });
}

  private isPastDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private isBreakTime(timeStr: string, breakPeriods: any[]): boolean {
    const timeMinutes = this.parseTime(timeStr);
    
    return breakPeriods.some(period => {
      const breakStart = this.parseTime(period.from);
      const breakEnd = this.parseTime(period.to);
      return timeMinutes >= breakStart && timeMinutes < breakEnd;
    });
  }
}