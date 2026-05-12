import { Injectable, Logger } from '@nestjs/common';
import { MessageBirdService } from '../messagebird/messagebird.service';
import { getProvider, WhatsAppProvider } from '../config/provider.config';
import { TemplateService } from '../template/template.service';
import { AppointmentTemplateType } from '../template/template.types';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly messageBirdService: MessageBirdService,
    private readonly templateService: TemplateService,
  ) {}

  // ─────────────────────────────────────────────
  // Send Appointment Message
  // Now uses TemplateService for structured
  // template messages — NOT plain text
  // This is the proper integration into the
  // existing appointment notification service
  // ─────────────────────────────────────────────
  async sendAppointmentMessage(
    to: string,
    patientName: string,
    doctorName: string,
    appointmentDate: string,
    appointmentTime: string,
    hospitalName: string,
    simulate?: string,
  ) {
    const provider = getProvider();

    const templateParams = {
      patient_name: patientName,
      doctor_name: doctorName,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      hospital_name: hospitalName,
    };

    this.logger.log(`[WhatsApp Router] Active provider: ${provider}`);
    this.logger.log(`[WhatsApp Router] Sending appointment template to: ${to}`);
    this.logger.log(
      `[WhatsApp Router] Using template: ${AppointmentTemplateType.CONFIRMATION}`,
    );

    // ─────────────────────────────────────────
    // Routes to TemplateService which handles:
    // - Correct provider payload format
    // - Status tracking
    // - Retry logic
    // - Fallback handling
    // ─────────────────────────────────────────
    this.logger.log(
      `[WhatsApp Router] Routing to TemplateService → sendConfirmation()`,
    );

    const result = await this.templateService.sendConfirmation(
      to,
      templateParams,
      simulate,
    );

    return result;
  }

  // ─────────────────────────────────────────────
  // Get Current Active Provider
  // ─────────────────────────────────────────────
  getActiveProvider() {
    const provider = getProvider();
    this.logger.log(`[WhatsApp Router] Current provider: ${provider}`);
    return {
      active_provider: provider,
      message: `All WhatsApp messages are currently being sent via ${provider}`,
      switch_instructions:
        'To switch providers, change WHATSAPP_PROVIDER in your .env file to either MESSAGE_BIRD or META_WHATSAPP and restart the server.',
    };
  }
}