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
  // Intent Detection — existing tests
  // ─────────────────────────────────────────────
  describe('Intent Detection — direct keywords', () => {
    it('should detect BOOK_APPOINTMENT for "book appointment with Dr. Rajesh"', () => {
      expect(service.detect('book appointment with Dr. Rajesh').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK_APPOINTMENT for "I need a skin doctor tomorrow"', () => {
      expect(service.detect('I need a skin doctor tomorrow').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK_APPOINTMENT for "I want to see a doctor"', () => {
      expect(service.detect('I want to see a doctor').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect CANCEL_APPOINTMENT for "cancel my 5 PM appointment"', () => {
      expect(service.detect('cancel my 5 PM appointment').intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should detect CANCEL_APPOINTMENT for "I want to cancel"', () => {
      expect(service.detect('I want to cancel').intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should detect VIEW_APPOINTMENTS for "show my appointments"', () => {
      expect(service.detect('show my appointments').intent).toBe(IntentType.VIEW_APPOINTMENTS);
    });

    it('should detect VIEW_APPOINTMENTS for "show upcoming bookings"', () => {
      expect(service.detect('show upcoming bookings').intent).toBe(IntentType.VIEW_APPOINTMENTS);
    });

    it('should detect CHECK_SLOTS for "any slots available today"', () => {
      expect(service.detect('any slots available today').intent).toBe(IntentType.CHECK_SLOTS);
    });

    it('should detect CHECK_SLOTS for "check availability"', () => {
      expect(service.detect('check availability').intent).toBe(IntentType.CHECK_SLOTS);
    });

    it('should detect UNKNOWN for "hello how are you"', () => {
      expect(service.detect('hello how are you').intent).toBe(IntentType.UNKNOWN);
    });

    it('should detect UNKNOWN for random text', () => {
      expect(service.detect('xyz random text 123').intent).toBe(IntentType.UNKNOWN);
    });

    it('should handle typo "buk appointmnt" as BOOK', () => {
      expect(service.detect('buk appointmnt with dr rajesh').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should handle typo "cancl my booking" as CANCEL', () => {
      expect(service.detect('cancl my booking').intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should detect BOOK for "I need a heart doctor"', () => {
      expect(service.detect('I need a heart doctor').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for mixed input "book dr rajesh tmrw evng"', () => {
      expect(service.detect('book dr rajesh tmrw evng').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });
  });

  // ─────────────────────────────────────────────
  // Intent Detection — indirect / natural language
  // These address Tharun's feedback on NLP robustness
  // ─────────────────────────────────────────────
  describe('Intent Detection — indirect natural language', () => {

    // ── Indirect BOOK phrases ──
    it('should detect BOOK for "I\'d like to see a doctor"', () => {
      expect(service.detect("I'd like to see a doctor").intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for "Can I get an appointment"', () => {
      expect(service.detect('Can I get an appointment').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for "I need to meet a doctor"', () => {
      expect(service.detect('I need to meet a doctor').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for "get me a slot with dr rajesh"', () => {
      expect(service.detect('get me a slot with dr rajesh').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for "fix a consultation for tomorrow"', () => {
      expect(service.detect('fix a consultation for tomorrow').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for "arrange an appointment with dr priya"', () => {
      expect(service.detect('arrange an appointment with dr priya').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for "I have a fever need a doctor"', () => {
      expect(service.detect('I have a fever need a doctor').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for "I feel dizzy need to see someone"', () => {
      expect(service.detect('I feel dizzy need to see someone').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for "my back is hurting badly"', () => {
      expect(service.detect('my back is hurting badly').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for "my child is sick"', () => {
      expect(service.detect('my child is sick').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    // ── Indirect CANCEL phrases ──
    it('should detect CANCEL for "drop my booking"', () => {
      expect(service.detect('drop my booking').intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should detect CANCEL for "I won\'t be coming"', () => {
      expect(service.detect("I won't be coming").intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should detect CANCEL for "remove my appointment"', () => {
      expect(service.detect('remove my appointment').intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should detect CANCEL for "call off my visit"', () => {
      expect(service.detect('call off my visit').intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    it('should detect CANCEL for "delete my booking"', () => {
      expect(service.detect('delete my booking').intent).toBe(IntentType.CANCEL_APPOINTMENT);
    });

    // ── Indirect VIEW phrases ──
    it('should detect VIEW for "what do I have scheduled"', () => {
      expect(service.detect('what do I have scheduled').intent).toBe(IntentType.VIEW_APPOINTMENTS);
    });

    it('should detect VIEW for "my upcoming visits"', () => {
      expect(service.detect('my upcoming visits').intent).toBe(IntentType.VIEW_APPOINTMENTS);
    });

    it('should detect VIEW for "do I have any appointments"', () => {
      expect(service.detect('do I have any appointments').intent).toBe(IntentType.VIEW_APPOINTMENTS);
    });

    it('should detect VIEW for "check my bookings"', () => {
      expect(service.detect('check my bookings').intent).toBe(IntentType.VIEW_APPOINTMENTS);
    });

    // ── Indirect CHECK_SLOTS phrases ──
    it('should detect CHECK_SLOTS for "is dr rajesh free tomorrow"', () => {
      expect(service.detect('is dr rajesh free tomorrow').intent).toBe(IntentType.CHECK_SLOTS);
    });

    it('should detect CHECK_SLOTS for "any openings with dr priya"', () => {
      expect(service.detect('any openings with dr priya').intent).toBe(IntentType.CHECK_SLOTS);
    });

    it('should detect CHECK_SLOTS for "what time is available"', () => {
      expect(service.detect('what time is available').intent).toBe(IntentType.CHECK_SLOTS);
    });

    it('should detect CHECK_SLOTS for "when is dr vikram available"', () => {
      expect(service.detect('when is dr vikram available').intent).toBe(IntentType.CHECK_SLOTS);
    });

    // ── Confirmation phrases ──
    it('should detect BOOK for "sounds good"', () => {
      expect(service.detect('sounds good').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for "that works"', () => {
      expect(service.detect('that works').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for "go ahead"', () => {
      expect(service.detect('go ahead').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    it('should detect BOOK for "absolutely"', () => {
      expect(service.detect('absolutely').intent).toBe(IntentType.BOOK_APPOINTMENT);
    });

    // ── Decline phrases — should stay UNKNOWN ──
    it('should detect UNKNOWN for "no"', () => {
      expect(service.detect('no').intent).toBe(IntentType.UNKNOWN);
    });

    it('should detect UNKNOWN for "nope"', () => {
      expect(service.detect('nope').intent).toBe(IntentType.UNKNOWN);
    });

    it('should detect UNKNOWN for "never mind"', () => {
      expect(service.detect('never mind').intent).toBe(IntentType.UNKNOWN);
    });
  });

  // ─────────────────────────────────────────────
  // Specialization Detection — expanded symptoms
  // ─────────────────────────────────────────────
  describe('Specialization Detection — symptom keywords', () => {

    // Dermatology
    it('should detect Dermatology for "pimples on face"', () => {
      expect(service.detect('pimples on face').entities.specialization).toBe(Specialization.DERMATOLOGY);
    });

    it('should detect Dermatology for "itching problem"', () => {
      expect(service.detect('itching problem').entities.specialization).toBe(Specialization.DERMATOLOGY);
    });

    it('should detect Dermatology for "hair loss issue"', () => {
      expect(service.detect('hair loss issue').entities.specialization).toBe(Specialization.DERMATOLOGY);
    });

    // Cardiology
    it('should detect Cardiology for "chest pain"', () => {
      expect(service.detect('chest pain').entities.specialization).toBe(Specialization.CARDIOLOGY);
    });

    it('should detect Cardiology for "high blood pressure"', () => {
      expect(service.detect('high blood pressure').entities.specialization).toBe(Specialization.CARDIOLOGY);
    });

    it('should detect Cardiology for "shortness of breath"', () => {
      expect(service.detect('shortness of breath').entities.specialization).toBe(Specialization.CARDIOLOGY);
    });

    // Orthopedics
    it('should detect Orthopedics for "my back hurts"', () => {
      expect(service.detect('my back hurts').entities.specialization).toBe(Specialization.ORTHOPEDICS);
    });

    it('should detect Orthopedics for "knee pain"', () => {
      expect(service.detect('knee pain').entities.specialization).toBe(Specialization.ORTHOPEDICS);
    });

    it('should detect Orthopedics for "swollen joints"', () => {
      expect(service.detect('swollen joints').entities.specialization).toBe(Specialization.ORTHOPEDICS);
    });

    it('should detect Orthopedics for "slip disc problem"', () => {
      expect(service.detect('slip disc problem').entities.specialization).toBe(Specialization.ORTHOPEDICS);
    });

    // Pediatrics
    it('should detect Pediatrics for "my son is sick"', () => {
      expect(service.detect('my son is sick').entities.specialization).toBe(Specialization.PEDIATRICS);
    });

    it('should detect Pediatrics for "baby not feeling well"', () => {
      expect(service.detect('baby not feeling well').entities.specialization).toBe(Specialization.PEDIATRICS);
    });

    it('should detect Pediatrics for "toddler has fever"', () => {
      expect(service.detect('toddler has fever').entities.specialization).toBe(Specialization.PEDIATRICS);
    });

    // General Physician
    it('should detect General for "I feel dizzy"', () => {
      expect(service.detect('I feel dizzy').entities.specialization).toBe(Specialization.GENERAL_PHYSICIAN);
    });

    it('should detect General for "sore throat and runny nose"', () => {
      expect(service.detect('sore throat and runny nose').entities.specialization).toBe(Specialization.GENERAL_PHYSICIAN);
    });

    it('should detect General for "not feeling well"', () => {
      expect(service.detect('not feeling well').entities.specialization).toBe(Specialization.GENERAL_PHYSICIAN);
    });

    it('should detect General for "body ache and weakness"', () => {
      expect(service.detect('body ache and weakness').entities.specialization).toBe(Specialization.GENERAL_PHYSICIAN);
    });
  });

  // ─────────────────────────────────────────────
  // Entity Extraction — existing tests
  // ─────────────────────────────────────────────
  describe('Entity Extraction', () => {
    it('should extract doctor name from "book appointment with Dr. Rajesh"', () => {
      expect(service.detect('book appointment with Dr. Rajesh').entities.doctor_name).toBe('rajesh');
    });

    it('should extract specialization "skin" as Dermatology', () => {
      expect(service.detect('I need a skin doctor').entities.specialization).toBe(Specialization.DERMATOLOGY);
    });

    it('should extract specialization "heart" as Cardiology', () => {
      expect(service.detect('I need a heart doctor').entities.specialization).toBe(Specialization.CARDIOLOGY);
    });

    it('should extract specialization "bone" as Orthopedics', () => {
      expect(service.detect('I need a bone doctor').entities.specialization).toBe(Specialization.ORTHOPEDICS);
    });

    it('should extract specialization "child" as Pediatrics', () => {
      expect(service.detect('I need a child doctor').entities.specialization).toBe(Specialization.PEDIATRICS);
    });

    it('should extract specialization "fever" as General Physician', () => {
      expect(service.detect('I have fever need a doctor').entities.specialization).toBe(Specialization.GENERAL_PHYSICIAN);
    });

    it('should extract date "today"', () => {
      const result = service.detect('any slots today');
      expect(result.entities.date).toBeDefined();
      expect(result.entities.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should extract date "tomorrow"', () => {
      const result = service.detect('book appointment tomorrow');
      expect(result.entities.date).toBeDefined();
      expect(result.entities.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should extract time "evening" as 17:00', () => {
      expect(service.detect('book appointment tomorrow evening').entities.time).toBe('17:00');
    });

    it('should extract time "morning" as 09:00', () => {
      expect(service.detect('book appointment tomorrow morning').entities.time).toBe('09:00');
    });

    it('should extract time "5 PM" as 17:00', () => {
      expect(service.detect('cancel my 5 PM appointment').entities.time).toBe('17:00');
    });

    it('should extract time "10:30 AM" as 10:30', () => {
      expect(service.detect('book at 10:30 AM').entities.time).toBe('10:30');
    });

    it('should extract booking ID "APT_ABC123"', () => {
      expect(service.detect('cancel APT_ABC123').entities.booking_id).toBe('APT_ABC123');
    });
  });
});