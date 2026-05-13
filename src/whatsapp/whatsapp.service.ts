import { Injectable, Logger } from '@nestjs/common';
import { MessageBirdService } from '../messagebird/messagebird.service';
import { getProvider } from '../config/provider.config';
import { TemplateService } from '../template/template.service';
import {
  AppointmentTemplateType,
  AppointmentType,
} from '../template/template.types';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly messageBirdService: MessageBirdService,
    private readonly templateService: TemplateService,
  ) {}

  // ─────────────────────────────────────────────
  // Send Appointment Message
  // Accepts appointment_type to determine which
  // template to send:
  // confirmation → appointment_confirmation
  // reminder     → appointment_reminder
  // cancellation → appointment_cancellation
  // ─────────────────────────────────────────────
  async sendAppointmentMessage(
    to: string,
    patientName: string,
    doctorName: string,
    appointmentDate: string,
    appointmentTime: string,
    hospitalName: string,
    appointmentType: AppointmentType = AppointmentType.CONFIRMATION,
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

    // Map appointment type to template name
    const templateMap: Record<AppointmentType, AppointmentTemplateType> = {
      [AppointmentType.CONFIRMATION]:
        AppointmentTemplateType.CONFIRMATION,
      [AppointmentType.REMINDER]:
        AppointmentTemplateType.REMINDER,
      [AppointmentType.CANCELLATION]:
        AppointmentTemplateType.CANCELLATION,
    };

    const templateName = templateMap[appointmentType];

    this.logger.log(`[WhatsApp Router] Active provider: ${provider}`);
    this.logger.log(`[WhatsApp Router] Appointment type: ${appointmentType}`);
    this.logger.log(`[WhatsApp Router] Template: ${templateName}`);
    this.logger.log(`[WhatsApp Router] Sending to: ${to}`);

    const result = await this.templateService.sendTemplate(
      to,
      templateName,
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
        'To switch providers, change WHATSAPP_PROVIDER in your .env to either MESSAGE_BIRD or META_WHATSAPP and restart the server.',
    };
  }
}