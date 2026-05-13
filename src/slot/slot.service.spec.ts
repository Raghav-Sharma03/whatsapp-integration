import { Test, TestingModule } from '@nestjs/testing';
import { SlotService } from './slot.service';
import { MOCK_DOCTORS } from '../doctor/doctor.mock';

// Use local date construction to avoid UTC timezone shift
function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Find next Monday (Dr. Rajesh works Mon-Sat)
function getNextMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const daysUntil = day === 1 ? 7 : (8 - day) % 7;
  d.setDate(d.getDate() + daysUntil);
  return toDateStr(d);
}

// Find next Sunday (no doctor works Sunday except none)
function getNextSunday(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntil = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + daysUntil);
  return toDateStr(d);
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateStr(d);
}

describe('SlotService', () => {
  let service: SlotService;
  const drRajesh = MOCK_DOCTORS[0]; // DOC_001 — Mon-Sat 9-13
  const drAnil   = MOCK_DOCTORS[2]; // DOC_003 — Tue-Sat 11-15, break 13-13:30
  const drVikram = MOCK_DOCTORS[4]; // DOC_005 — Mon-Sat 8-17, break 13-14

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlotService],
    }).compile();
    service = module.get<SlotService>(SlotService);
  });

  describe('generateDaySlots', () => {
    it('should generate slots for a valid day', () => {
      const slots = service.generateDaySlots(drRajesh, getNextMonday());
      expect(slots.length).toBeGreaterThan(0);
    });

    it('should return empty array for unavailable day (Sunday)', () => {
      const slots = service.generateDaySlots(drAnil, getNextSunday());
      expect(slots).toHaveLength(0);
    });

    it('should skip break periods for Dr. Vikram', () => {
      const slots = service.generateDaySlots(drVikram, getNextMonday());
      const breakSlot = slots.find((s) => s.time === '13:00');
      expect(breakSlot).toBeUndefined();
    });

    it('should generate 8 slots for Dr. Rajesh (9-13, 30min)', () => {
      const slots = service.generateDaySlots(drRajesh, getNextMonday());
      expect(slots).toHaveLength(8);
    });
  });

  describe('isSlotAvailable', () => {
    it('should return unavailable for past date', () => {
      const result = service.isSlotAvailable(drRajesh, getYesterday(), '09:00', []);
      expect(result.available).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('past');
    });

    it('should return unavailable for Sunday (Dr. Anil)', () => {
      const result = service.isSlotAvailable(drAnil, getNextSunday(), '11:00', []);
      expect(result.available).toBe(false);
    });

    it('should return unavailable for time outside working hours', () => {
      const result = service.isSlotAvailable(drRajesh, getNextMonday(), '15:00', []);
      expect(result.available).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('working hours');
    });

    it('should return unavailable during break time', () => {
      const result = service.isSlotAvailable(drVikram, getNextMonday(), '13:00', []);
      expect(result.available).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('break');
    });

    it('should return unavailable when daily limit reached', () => {
      const mockApts = Array.from({ length: 8 }, (_, i) => ({
        booking_id: `APT_00${i}`,
        user_phone: '999',
        doctor_id: 'DOC_001',
        doctor_name: 'Dr. Rajesh Mehta',
        specialization: 'Dermatology',
        date: getNextMonday(),
        time: `09:${i.toString().padStart(2, '0')}`,
        status: 'CONFIRMED' as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      const result = service.isSlotAvailable(drRajesh, getNextMonday(), '09:00', mockApts);
      expect(result.available).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('limit');
    });

    it('should return unavailable for already booked slot', () => {
      const existingApt = [{
        booking_id: 'APT_001',
        user_phone: '999',
        doctor_id: 'DOC_001',
        doctor_name: 'Dr. Rajesh Mehta',
        specialization: 'Dermatology',
        date: getNextMonday(),
        time: '09:00',
        status: 'CONFIRMED' as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }];
      const result = service.isSlotAvailable(drRajesh, getNextMonday(), '09:00', existingApt);
      expect(result.available).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('booked');
    });

    it('should return available for a valid free slot', () => {
      const result = service.isSlotAvailable(drRajesh, getNextMonday(), '09:00', []);
      expect(result.available).toBe(true);
    });
  });

  describe('getAvailableSlots', () => {
    it('should return all slots as available when no bookings', () => {
      const slots = service.getAvailableSlots(drRajesh, getNextMonday(), []);
      expect(slots.every((s) => s.available)).toBe(true);
    });

    it('should mark booked slot as unavailable', () => {
      const monday = getNextMonday();
      const existingApt = [{
        booking_id: 'APT_001',
        user_phone: '999',
        doctor_id: 'DOC_001',
        doctor_name: 'Dr. Rajesh Mehta',
        specialization: 'Dermatology',
        date: monday,
        time: '09:00',
        status: 'CONFIRMED' as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }];
      const slots = service.getAvailableSlots(drRajesh, monday, existingApt);
      const bookedSlot = slots.find((s) => s.time === '09:00');
      expect(bookedSlot?.available).toBe(false);
    });
  });

  describe('suggestAlternatives', () => {
    it('should return up to 3 available slots', () => {
      const slots = service.suggestAlternatives(drRajesh, getNextMonday(), []);
      expect(slots.length).toBeLessThanOrEqual(3);
      expect(slots.every((s) => s.available)).toBe(true);
    });

    it('should return empty when no slots available', () => {
      const monday = getNextMonday();
      const mockApts = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30'].map((time, i) => ({
        booking_id: `APT_00${i}`,
        user_phone: '999',
        doctor_id: 'DOC_001',
        doctor_name: 'Dr. Rajesh Mehta',
        specialization: 'Dermatology',
        date: monday,
        time,
        status: 'CONFIRMED' as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      const slots = service.suggestAlternatives(drRajesh, monday, mockApts);
      expect(slots).toHaveLength(0);
    });
  });
});