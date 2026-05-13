import { Injectable, Logger } from '@nestjs/common';
import {
  IntentType,
  BotResponse,
  SessionContext,
  Specialization,
} from '../appointment/appointment.types';
import { IntentService } from '../intent/intent.service';
import { AppointmentService } from '../appointment/appointment.service';
import { DoctorService } from '../doctor/doctor.service';
import { SessionService } from '../session/session.service';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly intentService: IntentService,
    private readonly appointmentService: AppointmentService,
    private readonly doctorService: DoctorService,
    private readonly sessionService: SessionService,
  ) {}

  // ─────────────────────────────────────────────
  // Main entry point
  // ─────────────────────────────────────────────
  async handleMessage(
    userPhone: string,
    message: string,
  ): Promise<BotResponse> {
    this.logger.log(`[Bot] Message from ${userPhone}: "${message}"`);

    const session = this.sessionService.getSession(userPhone);
    this.logger.log(`[Bot] Session context: ${JSON.stringify(session.context)}`);

    const { intent, entities } = this.intentService.detect(message);

    // Clear context on intent change (not UNKNOWN)
    if (
      intent !== IntentType.UNKNOWN &&
      session.last_intent !== IntentType.UNKNOWN &&
      intent !== session.last_intent
    ) {
      this.logger.log(`[Bot] Intent changed ${session.last_intent} → ${intent} — clearing context`);
      this.sessionService.clearContext(userPhone);
    }

    // Build new context from extracted entities
    const newContext: SessionContext = {};

    if (entities.doctor_name) {
      const doctor = this.doctorService.findDoctorByName(entities.doctor_name);
      if (doctor) {
        newContext.doctor_id = doctor.id;
        this.logger.log(`[Bot] Resolved doctor name "${entities.doctor_name}" → ${doctor.name} (${doctor.id})`);
      } else {
        this.logger.warn(`[Bot] Could not resolve doctor name: "${entities.doctor_name}"`);
      }
    }

    if (entities.specialization) newContext.specialization = entities.specialization;
    if (entities.date) newContext.date = entities.date;
    if (entities.time) newContext.time = entities.time;
    if (entities.booking_id) newContext.booking_id = entities.booking_id;

    // Capture last_intent BEFORE updateSession overwrites it
    const previousIntent = session.last_intent;

    const updatedSession = this.sessionService.updateSession(userPhone, intent, newContext);
    const context = updatedSession.context;

    // If message is UNKNOWN but user is continuing a CHECK_SLOTS flow with a date,
    // carry the intent forward (e.g. second message is just "monday")
    const effectiveIntent =
      intent === IntentType.UNKNOWN &&
      previousIntent === IntentType.CHECK_SLOTS &&
      context.doctor_id &&
      context.date
        ? IntentType.CHECK_SLOTS
        : intent;


    // Route to handler
    switch (effectiveIntent) {
      case IntentType.BOOK_APPOINTMENT:
        return this.handleBook(userPhone, context, entities);
      case IntentType.CANCEL_APPOINTMENT:
        return this.handleCancel(userPhone, context, entities);
      case IntentType.VIEW_APPOINTMENTS:
        return this.handleView(userPhone, context, entities);
      case IntentType.CHECK_SLOTS:
        return this.handleCheckSlots(userPhone, context, entities);
      default:
        return this.handleUnknown(userPhone, context, entities);
    }
  }

  // ─────────────────────────────────────────────
  // BOOK handler — full smart fallback logic
  // ─────────────────────────────────────────────
  private handleBook(
    userPhone: string,
    context: SessionContext,
    entities: any,
  ): BotResponse {
    this.logger.log(`[Bot] BOOK intent — context: ${JSON.stringify(context)}`);
    // ── Handle "yes" confirmation of a suggested slot ──
if (context.suggested_slot && context.doctor_id) {
  const suggestion = context.suggested_slot;
  this.logger.log(`[Bot] User confirmed suggested slot: ${JSON.stringify(suggestion)}`);

  // Auto-fill date and time from suggestion
  this.sessionService.updateSession(userPhone, IntentType.BOOK_APPOINTMENT, {
    date: suggestion.date,
    time: suggestion.time,
    suggested_slot: undefined,
  });

  const result = this.appointmentService.book(
    userPhone,
    context.doctor_id,
    suggestion.date,
    suggestion.time,
  );

  if (result.success) {
    this.sessionService.clearContext(userPhone);
    return this.buildResponse(
      `✅ ${result.message}\n\nSave your booking ID to cancel later. Reply "my appointments" to view all bookings.`,
      IntentType.BOOK_APPOINTMENT,
      entities,
      context,
      result.appointment,
    );
  }

  return this.buildResponse(
    `❌ ${result.message}\n\nWould you like to try a different date or time?`,
    IntentType.BOOK_APPOINTMENT,
    entities,
    context,
  );
}

    let doctorId = context.doctor_id;
    if (!context.date || !context.time) {
  // Check if this is a "yes" response to a suggestion
      const isConfirmation = ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'confirm']
        .some(k => entities._raw_message?.toLowerCase().startsWith(k));
  // We handle this via session — if context already has date+time from suggestion, proceed
    }

    // Resolve specialization → doctor if no doctor_id
    if (!doctorId && context.specialization) {
      const doctors = this.doctorService.getDoctorsBySpecialization(
        context.specialization as Specialization,
      );
      if (doctors.length > 0) {
        doctorId = doctors[0].id;
        this.sessionService.updateSession(userPhone, IntentType.BOOK_APPOINTMENT, {
          doctor_id: doctorId,
        });
        this.logger.log(`[Bot] Resolved specialization "${context.specialization}" → ${doctors[0].name}`);
      }
    }

    // ── Missing: doctor ──
    if (!doctorId) {
      this.logger.log(`[Bot] Missing doctor — prompting user`);
      return this.buildResponse(
        `I'd be happy to book an appointment! 🏥\n\nWhich doctor or specialization would you like?\n\n• Dr. Rajesh Mehta — Dermatology (Skin)\n• Dr. Priya Sharma — Cardiology (Heart)\n• Dr. Anil Verma — Orthopedics (Bones)\n• Dr. Sunita Rao — Pediatrics (Children)\n• Dr. Vikram Singh — General Physician`,
        IntentType.BOOK_APPOINTMENT,
        entities,
        context,
      );
    }

    const doctor = this.doctorService.getDoctorById(doctorId);
    if (!doctor) {
      this.logger.warn(`[Bot] Doctor ID ${doctorId} not found in records`);
      return this.buildResponse(
        `Sorry, I couldn't find that doctor in our system. Please choose from:\n\n• Dr. Rajesh Mehta — Dermatology\n• Dr. Priya Sharma — Cardiology\n• Dr. Anil Verma — Orthopedics\n• Dr. Sunita Rao — Pediatrics\n• Dr. Vikram Singh — General Physician`,
        IntentType.BOOK_APPOINTMENT,
        entities,
        context,
      );
    }

    // ── Missing: date ──
    if (!context.date) {
      this.logger.log(`[Bot] Missing date — prompting user`);
      const days = doctor.schedule.available_days.join(', ');
      return this.buildResponse(
        `Which date would you like to book with ${doctor.name}? 📅\n\n${doctor.name} is available on: ${days}.\n\n(e.g. "tomorrow", "Monday", "20th May")`,
        IntentType.BOOK_APPOINTMENT,
        entities,
        context,
      );
    }

    // ── Missing: time ──
    if (!context.time) {
      this.logger.log(`[Bot] Missing time — fetching available slots`);

      const slots = this.appointmentService.getAvailableSlots(doctorId, context.date);
      const availableSlots = slots.filter((s) => s.available);

      // ── Smart fallback: doctor not available on this day ──
      if (slots.length === 0) {
        this.logger.warn(`[Bot] ${doctor.name} not available on ${context.date} — suggesting alternative`);

        const bookedTimesMap = new Map<string, string[]>();
        const nextSlot = this.doctorService.findNextAvailableSlot(doctor, context.date, bookedTimesMap);

        // Also check alternative doctor
        const altDoctor = this.doctorService.findAlternativeDoctor(
          doctor.specialization,
          doctorId,
        );

        let reply = `${doctor.name} is not available on ${this.appointmentService.formatDate(context.date)}.\n\n`;

        if (nextSlot) {
          reply += `📅 Next available: ${this.appointmentService.formatDate(nextSlot.date)} at ${this.appointmentService.formatTime(nextSlot.time)}.\n`;
          reply += `Reply "yes" to confirm, or choose a different date.\n`;
        }

        if (altDoctor) {
          reply += `\n👨‍⚕️ Alternative: ${altDoctor.name} (${altDoctor.specialization}) is also available. Would you like to book with them instead?`;
        }

        return this.buildResponse(reply, IntentType.BOOK_APPOINTMENT, entities, context);
      }

      // ── Smart fallback: fully booked on this day ──
      if (availableSlots.length === 0) {
        this.logger.warn(`[Bot] ${doctor.name} fully booked on ${context.date} — suggesting alternatives`);

        const bookedTimesMap = new Map<string, string[]>();
        const nextSlot = this.doctorService.findNextAvailableSlot(doctor, context.date, bookedTimesMap);

        const altDoctor = this.doctorService.findAlternativeDoctor(
          doctor.specialization,
          doctorId,
        );

        let reply = `${doctor.name} is fully booked on ${this.appointmentService.formatDate(context.date)}. 😔\n\n`;

        if (nextSlot) {
          reply += `📅 Next available slot: ${this.appointmentService.formatDate(nextSlot.date)} at ${this.appointmentService.formatTime(nextSlot.time)}.\n`;
        }

        if (altDoctor) {
          reply += `\n👨‍⚕️ Or book with ${altDoctor.name} (same specialization) — reply with their name to switch.`;
        }

        if (!nextSlot && !altDoctor) {
          reply += `No alternatives found. Please try a different date.`;
        }

        return this.buildResponse(reply, IntentType.BOOK_APPOINTMENT, entities, context);
      }

      const slotList = availableSlots
        .map((s) => this.appointmentService.formatTime(s.time))
        .slice(0, 5)
        .join(', ');

      return this.buildResponse(
        `What time would you prefer with ${doctor.name} on ${this.appointmentService.formatDate(context.date)}? ⏰\n\nAvailable slots: ${slotList}`,
        IntentType.BOOK_APPOINTMENT,
        entities,
        context,
      );
    }

    // ── All info present — attempt booking ──
    this.logger.log(`[Bot] All info present — attempting booking: doctor=${doctorId}, date=${context.date}, time=${context.time}`);

    const result = this.appointmentService.book(
      userPhone,
      doctorId,
      context.date,
      context.time,
    );

    if (result.success) {
      this.logger.log(`[Bot] Booking successful: ${result.appointment?.booking_id}`);
      this.sessionService.clearContext(userPhone);

      return this.buildResponse(
        `✅ ${result.message}\n\nSave your booking ID — you'll need it to cancel. Reply "my appointments" to view all bookings.`,
        IntentType.BOOK_APPOINTMENT,
        entities,
        context,
        result.appointment,
      );
    }

    // ── Booking failed — smart fallback ──
    this.logger.warn(`[Bot] Booking failed: ${result.message}`);

    let failReply = `❌ ${result.message}`;

    // Suggest alternative doctor if slot/day unavailable
      if (result.suggestion) {
  // Store suggestion in session so "yes" can auto-confirm it
        this.sessionService.updateSession(userPhone, IntentType.BOOK_APPOINTMENT, {
          suggested_slot: result.suggestion,
      });
        failReply += `\n\n💡 Next available: ${this.appointmentService.formatDate(result.suggestion.date)} at ${this.appointmentService.formatTime(result.suggestion.time)}. Reply "yes" to confirm.`;
    }

    const altDoctor = this.doctorService.findAlternativeDoctor(
      doctor.specialization,
      doctorId,
    );
    if (altDoctor && !result.message.includes('past') && !result.message.includes('duplicate')) {
      failReply += `\n\n👨‍⚕️ Alternative: ${altDoctor.name} (${altDoctor.specialization}) may have slots available.`;
    }

    return this.buildResponse(failReply, IntentType.BOOK_APPOINTMENT, entities, context);
  }

  // ─────────────────────────────────────────────
  // CANCEL handler
  // ─────────────────────────────────────────────
  private handleCancel(
    userPhone: string,
    context: SessionContext,
    entities: any,
  ): BotResponse {
    this.logger.log(`[Bot] CANCEL intent — context: ${JSON.stringify(context)}`);

    if (context.booking_id) {
      const result = this.appointmentService.cancel(userPhone, context.booking_id);
      if (result.success) this.sessionService.clearContext(userPhone);
      return this.buildResponse(
        result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        IntentType.CANCEL_APPOINTMENT,
        entities,
        context,
      );
    }

    if (context.time) {
      const result = this.appointmentService.cancelByTime(userPhone, context.time);
      if (result.success) this.sessionService.clearContext(userPhone);
      return this.buildResponse(
        result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        IntentType.CANCEL_APPOINTMENT,
        entities,
        context,
      );
    }

    // No ID or time — show appointments to choose from
    const appointments = this.appointmentService.getByUser(userPhone);

    if (appointments.length === 0) {
      return this.buildResponse(
        `You have no upcoming appointments to cancel. Would you like to book one?`,
        IntentType.CANCEL_APPOINTMENT,
        entities,
        context,
      );
    }

    const list = appointments
      .map((a) =>
        `• ${a.booking_id} — ${a.doctor_name} on ${this.appointmentService.formatDate(a.date)} at ${this.appointmentService.formatTime(a.time)}`,
      )
      .join('\n');

    return this.buildResponse(
      `Which appointment would you like to cancel? 📋\n\n${list}\n\nReply with the booking ID (e.g. "cancel APT_ABC123").`,
      IntentType.CANCEL_APPOINTMENT,
      entities,
      context,
    );
  }

  // ─────────────────────────────────────────────
  // VIEW handler
  // ─────────────────────────────────────────────
  private handleView(
    userPhone: string,
    context: SessionContext,
    entities: any,
  ): BotResponse {
    this.logger.log(`[Bot] VIEW intent for ${userPhone}`);

    const appointments = this.appointmentService.getByUser(userPhone);

    if (appointments.length === 0) {
      return this.buildResponse(
        `You have no upcoming appointments. 📭\n\nWould you like to book one? Just say "book appointment".`,
        IntentType.VIEW_APPOINTMENTS,
        entities,
        context,
      );
    }

    const list = appointments
      .map((a) =>
        `• ${a.booking_id} — ${a.doctor_name} (${a.specialization})\n  📅 ${this.appointmentService.formatDate(a.date)} at ${this.appointmentService.formatTime(a.time)}`,
      )
      .join('\n\n');

    return this.buildResponse(
      `Your upcoming appointments: 📋\n\n${list}`,
      IntentType.VIEW_APPOINTMENTS,
      entities,
      context,
      appointments,
    );
  }

  // ─────────────────────────────────────────────
  // CHECK SLOTS handler
  // ─────────────────────────────────────────────
  private handleCheckSlots(
    userPhone: string,
    context: SessionContext,
    entities: any,
  ): BotResponse {
    this.logger.log(`[Bot] CHECK_SLOTS intent for ${userPhone}`);

    let doctorId = context.doctor_id;

    if (!doctorId && context.specialization) {
      const doctors = this.doctorService.getDoctorsBySpecialization(
        context.specialization as Specialization,
      );
      if (doctors.length > 0) doctorId = doctors[0].id;
    }

    if (!doctorId) {
      return this.buildResponse(
        `Which doctor would you like to check slots for?\n\n• Dr. Rajesh Mehta — Dermatology\n• Dr. Priya Sharma — Cardiology\n• Dr. Anil Verma — Orthopedics\n• Dr. Sunita Rao — Pediatrics\n• Dr. Vikram Singh — General Physician`,
        IntentType.CHECK_SLOTS,
        entities,
        context,
      );
    }

    const date = context.date || new Date().toISOString().split('T')[0];
    const doctor = this.doctorService.getDoctorById(doctorId);
    const slots = this.appointmentService.getAvailableSlots(doctorId, date);
    const available = slots.filter((s) => s.available);

    if (slots.length === 0) {
      const days = doctor?.schedule.available_days.join(', ');
      return this.buildResponse(
        `${doctor?.name} is not available on ${this.appointmentService.formatDate(date)}.\n\n📅 Available days: ${days}`,
        IntentType.CHECK_SLOTS,
        entities,
        context,
      );
    }

    if (available.length === 0) {
      return this.buildResponse(
        `No available slots for ${doctor?.name} on ${this.appointmentService.formatDate(date)}. All slots are booked.\n\nWould you like to check another date?`,
        IntentType.CHECK_SLOTS,
        entities,
        context,
      );
    }

    const slotList = available
      .map((s) => this.appointmentService.formatTime(s.time))
      .join(', ');

    return this.buildResponse(
      `Available slots for ${doctor?.name} on ${this.appointmentService.formatDate(date)}: ⏰\n\n${slotList}\n\nReply "book [time]" to confirm a slot.`,
      IntentType.CHECK_SLOTS,
      entities,
      context,
      slots,
    );
  }

  // ─────────────────────────────────────────────
  // UNKNOWN handler
  // ─────────────────────────────────────────────
  private handleUnknown(
    userPhone: string,
    context: SessionContext,
    entities: any,
  ): BotResponse {
    this.logger.log(`[Bot] UNKNOWN intent for ${userPhone}`);
    return this.buildResponse(
      `I didn't quite understand that. 🤔\n\nI can help you:\n• Book an appointment — "book appointment with Dr. Rajesh"\n• Cancel — "cancel APT_ABC123"\n• View bookings — "show my appointments"\n• Check slots — "available slots for Dr. Priya"\n\nWhat would you like to do?`,
      IntentType.UNKNOWN,
      entities,
      context,
    );
  }

  // ─────────────────────────────────────────────
  // Build standard BotResponse
  // ─────────────────────────────────────────────
  private buildResponse(
    reply: string,
    intent: IntentType,
    entities: any,
    context: SessionContext,
    data?: any,
  ): BotResponse {
    return { reply, intent, entities, session_context: context, data };
  }
}