import { Test, TestingModule } from '@nestjs/testing';
import { IntentService } from './intent.service';
import { IntentType, Specialization } from '../appointment/appointment.types';

describe('IntentService', () => {
  let service: IntentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntentService],
    }).compile();
    service = module.get<IntentService>(IntentService);
  });

  // ─────────────────────────────────────────────
  // Intent Detection Tests
  // ─────────────────────────────────────────────

  describe('Intent Detection', () => {
    it('should detect BOOK_APPOINTMENT for "book appointment with Dr. Rajesh"', () => {
      const result = service.detect('book appointment with Dr. Rajesh');
      expect(result.intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK_APPOINTMENT for "I need a skin doctor tomorrow"', () => {
      const result = service.detect('I need a skin doctor tomorrow');
      expect(result.intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK_APPOINTMENT for "I want to see a doctor"', () => {
      const result = service.detect('I want to see a doctor');
      expect(result.intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect CANCEL_APPOINTMENT for "cancel my 5 PM appointment"', () => {
      const result = service.detect('cancel my 5 PM appointment');
      expect(result.intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should detect CANCEL_APPOINTMENT for "I want to cancel"', () => {
      const result = service.detect('I want to cancel');
      expect(result.intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should detect VIEW_APPOINTMENTS for "show my appointments"', () => {
      const result = service.detect('show my appointments');
      expect(result.intent).toBe(IntentType.VIEW_APPOINTMENTS);
    });

    it('should detect VIEW_APPOINTMENTS for "show upcoming bookings"', () => {
      const result = service.detect('show upcoming bookings');
      expect(result.intent).toBe(IntentType.VIEW_APPOINTMENTS);
    });

    it('should detect CHECK_SLOTS for "any slots available today"', () => {
      const result = service.detect('any slots available today');
      expect(result.intent).toBe(IntentType.CHECK_SLOTS);
    });

    it('should detect CHECK_SLOTS for "check availability"', () => {
      const result = service.detect('check availability');
      expect(result.intent).toBe(IntentType.CHECK_SLOTS);
    });

    it('should detect UNKNOWN for "hello how are you"', () => {
      const result = service.detect('hello how are you');
      expect(result.intent).toBe(IntentType.UNKNOWN);
    });

    it('should detect UNKNOWN for random text', () => {
      const result = service.detect('xyz random text 123');
      expect(result.intent).toBe(IntentType.UNKNOWN);
    });

    it('should handle typo "buk appointmnt" as BOOK', () => {
      const result = service.detect('buk appointmnt with dr rajesh');
      expect(result.intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should handle typo "cancl my booking" as CANCEL', () => {
      const result = service.detect('cancl my booking');
      expect(result.intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should detect BOOK for "I need a heart doctor"', () => {
      const result = service.detect('I need a heart doctor');
      expect(result.intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for mixed input "book dr rajesh tmrw evng"', () => {
      const result = service.detect('book dr rajesh tmrw evng');
      expect(result.intent).toBe(IntentType.BOOK_APPOINTMENT);
    });
  });

  // ─────────────────────────────────────────────
  // Entity Extraction Tests
  // ─────────────────────────────────────────────

  describe('Entity Extraction', () => {
    it('should extract doctor name from "book appointment with Dr. Rajesh"', () => {
      const result = service.detect('book appointment with Dr. Rajesh');
      expect(result.entities.doctor_name).toBe('rajesh');
    });

    it('should extract specialization "skin" as Dermatology', () => {
      const result = service.detect('I need a skin doctor');
      expect(result.entities.specialization).toBe(Specialization.DERMATOLOGY);
    });

    it('should extract specialization "heart" as Cardiology', () => {
      const result = service.detect('I need a heart doctor');
      expect(result.entities.specialization).toBe(Specialization.CARDIOLOGY);
    });

    it('should extract specialization "bone" as Orthopedics', () => {
      const result = service.detect('I need a bone doctor');
      expect(result.entities.specialization).toBe(Specialization.ORTHOPEDICS);
    });

    it('should extract specialization "child" as Pediatrics', () => {
      const result = service.detect('I need a child doctor');
      expect(result.entities.specialization).toBe(Specialization.PEDIATRICS);
    });

    it('should extract specialization "fever" as General Physician', () => {
      const result = service.detect('I have fever need a doctor');
      expect(result.entities.specialization).toBe(
        Specialization.GENERAL_PHYSICIAN,
      );
    });

    it('should extract date "today"', () => {
      const result = service.detect('any slots today');
      expect(result.entities.date).toBeDefined();
      // Just verify it's a valid date string, don't check exact value (timezone issues)
      expect(result.entities.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should extract date "tomorrow"', () => {
      const result = service.detect('book appointment tomorrow');
      expect(result.entities.date).toBeDefined();
      expect(result.entities.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should extract time "evening" as 17:00', () => {
      const result = service.detect('book appointment tomorrow evening');
      expect(result.entities.time).toBe('17:00');
    });

    it('should extract time "morning" as 09:00', () => {
      const result = service.detect('book appointment tomorrow morning');
      expect(result.entities.time).toBe('09:00');
    });

    it('should extract time "5 PM" as 17:00', () => {
      const result = service.detect('cancel my 5 PM appointment');
      expect(result.entities.time).toBe('17:00');
    });

    it('should extract time "10:30 AM" as 10:30', () => {
      const result = service.detect('book at 10:30 AM');
      expect(result.entities.time).toBe('10:30');
    });

    it('should extract booking ID "APT_ABC123"', () => {
      const result = service.detect('cancel APT_ABC123');
      expect(result.entities.booking_id).toBe('APT_ABC123');
    });
  });
});