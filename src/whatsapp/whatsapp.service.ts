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
  // Reads WHATSAPP_PROVIDER from .env and routes
  // to the correct provider automatically
  // ─────────────────────────────────────────────
  sendAppointmentMessage(
    to: string,
    patientName: string,
    doctorName: string,
    appointmentDate: string,
    appointmentTime: string,
    simulate?: string,
  ) {
    const provider = getProvider();

    const messageBody =
      `Hello ${patientName}! Your appointment with Dr. ${doctorName} ` +
      `is confirmed for ${appointmentDate} at ${appointmentTime}. ` +
      `Please reply CONFIRM to confirm or CANCEL to cancel.`;

    this.logger.log(`[WhatsApp Router] Active provider: ${provider}`);
    this.logger.log(`[WhatsApp Router] Sending appointment message to: ${to}`);
    this.logger.log(`[WhatsApp Router] Message: ${messageBody}`);

    if (provider === WhatsAppProvider.META_WHATSAPP) {
      this.logger.log('[WhatsApp Router] Routing to → Meta WhatsApp');
      return {
        provider: 'META_WHATSAPP',
        ...this.metaService.registerPhoneNumber(
          'MOCK_PHONE_NUMBER_ID',
          'MOCK_ACCESS_TOKEN',
          simulate,
        ),
        appointment_message: {
          to,
          body: messageBody,
          status: simulate === 'failure' ? 'FAILED' : 'SENT',
          message_id:
            'META_MSG_MOCK_' +
            Math.random().toString(36).substr(2, 9).toUpperCase(),
          sent_at: new Date().toISOString(),
        },
      };
    }

    if (provider === WhatsAppProvider.MESSAGE_BIRD) {
      this.logger.log('[WhatsApp Router] Routing to → MessageBird');
      return {
        provider: 'MESSAGE_BIRD',
        ...this.messageBirdService.sendMessage(to, messageBody, simulate),
      };
    }

    // Fallback — should never reach here due to getProvider() default
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