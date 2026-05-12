import { Injectable, Logger } from '@nestjs/common';
import {
  AppointmentTemplateType,
  AppointmentTemplateParams,
  MetaTemplateSendPayload,
  MessageBirdTemplateSendPayload,
  TemplateMessageStatus,
  TemplateProvider,
  TemplateStatusRecord,
} from './template.types';
import { MOCK_META, MOCK_MESSAGEBIRD } from '../common/mock-data';
import { getProvider, WhatsAppProvider } from '../config/provider.config';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  // ─────────────────────────────────────────────
  // In-memory status tracker
  // Stores message_id → TemplateStatusRecord
  // In production this would be a database table
  // ─────────────────────────────────────────────
  private statusStore = new Map<string, TemplateStatusRecord>();

  // ─────────────────────────────────────────────
  // Build Meta Cloud API Template Payload
  // Mirrors real POST /{phone-number-id}/messages
  // with type: "template" and components array
  // ─────────────────────────────────────────────
  private buildMetaPayload(
    to: string,
    templateName: AppointmentTemplateType,
    params: AppointmentTemplateParams,
  ): MetaTemplateSendPayload {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                parameter_name: 'patient_name',
                text: params.patient_name,
              },
              {
                type: 'text',
                parameter_name: 'doctor_name',
                text: params.doctor_name,
              },
              {
                type: 'text',
                parameter_name: 'appointment_date',
                text: params.appointment_date,
              },
              {
                type: 'text',
                parameter_name: 'appointment_time',
                text: params.appointment_time,
              },
              {
                type: 'text',
                parameter_name: 'hospital_name',
                text: params.hospital_name,
              },
            ],
          },
        ],
      },
    };
  }

  // ─────────────────────────────────────────────
  // Build MessageBird Template Payload
  // ─────────────────────────────────────────────
  private buildMessageBirdPayload(
    to: string,
    templateName: AppointmentTemplateType,
    params: AppointmentTemplateParams,
  ): MessageBirdTemplateSendPayload {
    return {
      to,
      template_name: templateName,
      language_code: 'en_US',
      parameters: {
        patient_name: params.patient_name,
        doctor_name: params.doctor_name,
        appointment_date: params.appointment_date,
        appointment_time: params.appointment_time,
        hospital_name: params.hospital_name,
      },
    };
  }

  // ─────────────────────────────────────────────
  // Core Send Template Method
  // Handles: provider routing, status tracking,
  // retry logic, and fallback handling
  // ─────────────────────────────────────────────
  async sendTemplate(
    to: string,
    templateName: AppointmentTemplateType,
    params: AppointmentTemplateParams,
    simulate?: string,
  ) {
    const provider = getProvider();
    const messageId =
      'wamid.MOCK_' +
      Math.random().toString(36).substr(2, 9).toUpperCase();

    this.logger.log(`[Template] Sending template: ${templateName}`);
    this.logger.log(`[Template] Provider: ${provider}`);
    this.logger.log(`[Template] To: ${to}`);

    // Validate template name
    const validTemplates = Object.values(AppointmentTemplateType);
    if (!validTemplates.includes(templateName)) {
      this.logger.error(`[Template] Invalid template: ${templateName}`);
      return {
        success: false,
        ...MOCK_META.errors.templateNotFound,
      };
    }

    // Try sending with retry logic
    const result = await this.sendWithRetry(
      to,
      templateName,
      params,
      provider,
      messageId,
      simulate,
      0,
    );

    return result;
  }

  // ─────────────────────────────────────────────
  // Retry + Fallback Logic
  // Max 3 retries → fallback to other provider
  // ─────────────────────────────────────────────
  private async sendWithRetry(
    to: string,
    templateName: AppointmentTemplateType,
    params: AppointmentTemplateParams,
    provider: WhatsAppProvider,
    messageId: string,
    simulate?: string,
    retryCount: number = 0,
  ): Promise<any> {
    const MAX_RETRIES = 3;

    this.logger.log(
      `[Template] Attempt ${retryCount + 1} of ${MAX_RETRIES + 1}`,
    );

    // Track status as RETRYING if this is a retry
    if (retryCount > 0) {
      this.updateStatus(messageId, TemplateMessageStatus.RETRYING);
      this.logger.log(`[Template] Retrying... attempt ${retryCount + 1}`);
    }

    // Simulate failure for first 2 retries then succeed
    const shouldFail =
      simulate === 'failure' ||
      (simulate === 'retry' && retryCount < 2);

    if (shouldFail && retryCount < MAX_RETRIES) {
      this.logger.warn(
        `[Template] Send failed — scheduling retry ${retryCount + 1}`,
      );
      this.trackStatus(
        messageId,
        templateName,
        to,
        provider as unknown as TemplateProvider,
        TemplateMessageStatus.FAILED,
        retryCount,
      );

      // If max retries reached → trigger fallback
      if (retryCount === MAX_RETRIES - 1 && simulate === 'failure') {
        return this.fallbackToOtherProvider(
          to,
          templateName,
          params,
          provider,
          messageId,
        );
      }

      return this.sendWithRetry(
        to,
        templateName,
        params,
        provider,
        messageId,
        simulate,
        retryCount + 1,
      );
    }

    // Final failure after all retries
    if (simulate === 'failure' && retryCount >= MAX_RETRIES) {
      this.logger.error('[Template] All retries exhausted — triggering fallback');
      return this.fallbackToOtherProvider(
        to,
        templateName,
        params,
        provider,
        messageId,
      );
    }

    // SUCCESS path
    return this.executeSend(
      to,
      templateName,
      params,
      provider,
      messageId,
      retryCount,
    );
  }

  // ─────────────────────────────────────────────
  // Execute the actual send per provider
  // ─────────────────────────────────────────────
  private executeSend(
    to: string,
    templateName: AppointmentTemplateType,
    params: AppointmentTemplateParams,
    provider: WhatsAppProvider,
    messageId: string,
    retryCount: number,
  ) {
    if (provider === WhatsAppProvider.META_WHATSAPP) {
      const payload = this.buildMetaPayload(to, templateName, params);

      const response = {
        ...MOCK_META.templateSendResponse,
        contacts: [{ input: to, wa_id: to }],
        messages: [{ id: messageId, message_status: 'accepted' }],
      };

      this.trackStatus(
        messageId,
        templateName,
        to,
        TemplateProvider.META_WHATSAPP,
        TemplateMessageStatus.SENT,
        retryCount,
      );

      this.logger.log(`[Template] Sent via Meta. Message ID: ${messageId}`);

      return {
        success: true,
        provider: 'META_WHATSAPP',
        message: `Template "${templateName}" sent successfully via Meta Cloud API`,
        message_id: messageId,
        status: TemplateMessageStatus.SENT,
        retry_count: retryCount,
        payload_sent: payload,
        response,
      };
    }

    if (provider === WhatsAppProvider.MESSAGE_BIRD) {
      const payload = this.buildMessageBirdPayload(to, templateName, params);

      const response = {
        ...MOCK_MESSAGEBIRD.templateSent,
        message_id: messageId,
        template_name: templateName,
        to,
      };

      this.trackStatus(
        messageId,
        templateName,
        to,
        TemplateProvider.MESSAGE_BIRD,
        TemplateMessageStatus.SENT,
        retryCount,
      );

      this.logger.log(
        `[Template] Sent via MessageBird. Message ID: ${messageId}`,
      );

      return {
        success: true,
        provider: 'MESSAGE_BIRD',
        message: `Template "${templateName}" sent successfully via MessageBird`,
        message_id: messageId,
        status: TemplateMessageStatus.SENT,
        retry_count: retryCount,
        payload_sent: payload,
        response,
      };
    }
  }

  // ─────────────────────────────────────────────
  // Fallback to other provider
  // If Meta fails → try MessageBird and vice versa
  // ─────────────────────────────────────────────
  private fallbackToOtherProvider(
    to: string,
    templateName: AppointmentTemplateType,
    params: AppointmentTemplateParams,
    failedProvider: WhatsAppProvider,
    messageId: string,
  ) {
    const fallbackProvider =
      failedProvider === WhatsAppProvider.META_WHATSAPP
        ? WhatsAppProvider.MESSAGE_BIRD
        : WhatsAppProvider.META_WHATSAPP;

    this.logger.warn(
      `[Template] Falling back from ${failedProvider} to ${fallbackProvider}`,
    );

    const fallbackMessageId =
      'wamid.MOCK_FALLBACK_' +
      Math.random().toString(36).substr(2, 9).toUpperCase();

    return {
      success: true,
      provider: fallbackProvider,
      fallback: true,
      original_provider: failedProvider,
      message: `Primary provider ${failedProvider} failed. Message sent via fallback provider ${fallbackProvider}`,
      message_id: fallbackMessageId,
      status: TemplateMessageStatus.SENT,
      ...this.executeSend(
        to,
        templateName,
        params,
        fallbackProvider,
        fallbackMessageId,
        0,
      ),
    };
  }

  // ─────────────────────────────────────────────
  // Track and Update Status in Memory
  // ─────────────────────────────────────────────
  private trackStatus(
    messageId: string,
    templateName: string,
    to: string,
    provider: TemplateProvider,
    status: TemplateMessageStatus,
    retryCount: number,
  ) {
    const record: TemplateStatusRecord = {
      message_id: messageId,
      template_name: templateName,
      to,
      provider,
      status,
      retry_count: retryCount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.statusStore.set(messageId, record);
    this.logger.log(`[Template] Status tracked: ${messageId} → ${status}`);
  }

  private updateStatus(messageId: string, status: TemplateMessageStatus) {
    const existing = this.statusStore.get(messageId);
    if (existing) {
      existing.status = status;
      existing.updated_at = new Date().toISOString();
      this.statusStore.set(messageId, existing);
      this.logger.log(`[Template] Status updated: ${messageId} → ${status}`);
    }
  }

  // ─────────────────────────────────────────────
  // Get Status of a Template Message
  // ─────────────────────────────────────────────
  getStatus(messageId: string) {
    this.logger.log(`[Template] Getting status for: ${messageId}`);
    const record = this.statusStore.get(messageId);

    if (!record) {
      this.logger.warn(`[Template] Message ID not found: ${messageId}`);
      return {
        success: false,
        error: 'message_not_found',
        error_description: `No record found for message_id: ${messageId}`,
      };
    }

    return {
      success: true,
      data: record,
    };
  }

  // ─────────────────────────────────────────────
  // Handle Delivery Status from Webhook
  // Called by WebhookService when Meta sends
  // a delivery status update
  // ─────────────────────────────────────────────
  handleDeliveryStatus(messageId: string, status: string) {
    this.logger.log(
      `[Template] Webhook delivery update — ID: ${messageId}, Status: ${status}`,
    );

    const statusMap: Record<string, TemplateMessageStatus> = {
      sent: TemplateMessageStatus.SENT,
      delivered: TemplateMessageStatus.DELIVERED,
      failed: TemplateMessageStatus.FAILED,
    };

    const mappedStatus = statusMap[status.toLowerCase()];
    if (mappedStatus) {
      this.updateStatus(messageId, mappedStatus);
    }

    return {
      success: true,
      message_id: messageId,
      updated_status: mappedStatus || status,
    };
  }

  // ─────────────────────────────────────────────
  // Convenience methods for each template type
  // These plug into the appointment module
  // ─────────────────────────────────────────────
  async sendConfirmation(
    to: string,
    params: AppointmentTemplateParams,
    simulate?: string,
  ) {
    this.logger.log('[Template] Sending appointment CONFIRMATION');
    return this.sendTemplate(
      to,
      AppointmentTemplateType.CONFIRMATION,
      params,
      simulate,
    );
  }

  async sendReminder(
    to: string,
    params: AppointmentTemplateParams,
    simulate?: string,
  ) {
    this.logger.log('[Template] Sending appointment REMINDER');
    return this.sendTemplate(
      to,
      AppointmentTemplateType.REMINDER,
      params,
      simulate,
    );
  }

  async sendCancellation(
    to: string,
    params: AppointmentTemplateParams,
    simulate?: string,
  ) {
    this.logger.log('[Template] Sending appointment CANCELLATION');
    return this.sendTemplate(
      to,
      AppointmentTemplateType.CANCELLATION,
      params,
      simulate,
    );
  }
}