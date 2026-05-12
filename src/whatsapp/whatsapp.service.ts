import { Injectable, Logger } from '@nestjs/common';
import { MetaService } from '../meta/meta.service';
import { MessageBirdService } from '../messagebird/messagebird.service';
import { getProvider, WhatsAppProvider } from '../config/provider.config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly metaService: MetaService,
    private readonly messageBirdService: MessageBirdService,
  ) {}

  // ─────────────────────────────────────────────
  // Send Appointment Message
  // This is the MESSAGING flow — completely
  // separate from the ONBOARDING flow.
  //
  // Onboarding = registering your business ONCE
  // Messaging  = sending a message EVERY TIME
  // ─────────────────────────────────────────────
  sendAppointmentMessage(
    to: string,
    patientName: string,
    doctorName: string,
    appointmentDate: string,
    appointmentTime: string,
    hospitalName: string,
    simulate?: string,
  ) {
    const provider = getProvider();

    const messageBody =
      `Hello ${patientName}! Your appointment with Dr. ${doctorName} ` +
      `at ${hospitalName} is confirmed for ${appointmentDate} at ${appointmentTime}. ` +
      `Please reply CONFIRM to confirm or CANCEL to cancel.`;

    this.logger.log(`[WhatsApp Router] Active provider: ${provider}`);
    this.logger.log(`[WhatsApp Router] Sending appointment message to: ${to}`);
    this.logger.log(`[WhatsApp Router] Message: ${messageBody}`);

    // ─────────────────────────────────────────
    // META WHATSAPP — uses Cloud API sendMessage
    // NOT onboarding/registration logic
    // ─────────────────────────────────────────
    if (provider === WhatsAppProvider.META_WHATSAPP) {
      this.logger.log('[WhatsApp Router] Routing to → Meta Cloud API sendMessage');
      const result = this.metaService.sendMessage(to, messageBody, simulate);
      return {
        provider: 'META_WHATSAPP',
        ...result,
      };
    }

    // ─────────────────────────────────────────
    // MESSAGE BIRD — uses Bird API sendMessage
    // ─────────────────────────────────────────
    if (provider === WhatsAppProvider.MESSAGE_BIRD) {
      this.logger.log('[WhatsApp Router] Routing to → MessageBird sendMessage');
      const result = this.messageBirdService.sendMessage(to, messageBody, simulate);
      return {
        provider: 'MESSAGE_BIRD',
        ...result,
      };
    }

    // Fallback — should never reach here
    this.logger.error('[WhatsApp Router] Unknown provider — cannot send message');
    return {
      success: false,
      error: 'unknown_provider',
      error_description: 'No valid WhatsApp provider configured',
    };
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