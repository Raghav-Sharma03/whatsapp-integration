import { Injectable, Logger } from '@nestjs/common';
import { MOCK_META } from '../common/mock-data';
import { providerConfig } from '../config/provider.config';
import { TemplateService } from '../template/template.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly templateService: TemplateService) {}

  // ─────────────────────────────────────────────
  // Meta Webhook Verification
  // ─────────────────────────────────────────────
  verifyMetaWebhook(
    mode: string,
    verifyToken: string,
    challenge: string,
  ): { statusCode: number; response: string } {
    this.logger.log('[Webhook] Meta webhook verification request received');
    this.logger.log('[Webhook] hub.mode: ' + mode);
    this.logger.log('[Webhook] hub.verify_token: ' + verifyToken);
    this.logger.log('[Webhook] hub.challenge: ' + challenge);

    if (
      mode === 'subscribe' &&
      verifyToken === providerConfig.meta.verifyToken
    ) {
      this.logger.log('[Webhook] Verification SUCCESS — returning challenge');
      return { statusCode: 200, response: challenge };
    }

    this.logger.error(
      '[Webhook] Verification FAILED — token mismatch or wrong mode',
    );
    return { statusCode: 403, response: 'Forbidden: Invalid verify token' };
  }

  // ─────────────────────────────────────────────
  // Handle Incoming Meta Webhook Event
  // Handles both regular messages AND
  // template delivery status updates
  // ─────────────────────────────────────────────
  handleMetaWebhookEvent(payload: any): {
    statusCode: number;
    response: string;
  } {
    this.logger.log('[Webhook] Incoming Meta webhook event received');

    if (!payload || !payload.object) {
      this.logger.error('[Webhook] Invalid payload — missing object field');
      return { statusCode: 400, response: 'Invalid payload' };
    }

    if (payload.object === 'whatsapp_business_account') {
      const entries = payload.entry || [];

      entries.forEach((entry: any) => {
        const changes = entry.changes || [];
        changes.forEach((change: any) => {
          const messages = change?.value?.messages || [];
          const statuses = change?.value?.statuses || [];

          // Log incoming messages
          messages.forEach((msg: any) => {
            this.logger.log(
              `[Webhook] New message from ${msg.from}: "${msg.text?.body}"`,
            );
          });

          // Handle template delivery status updates
          statuses.forEach((status: any) => {
            this.logger.log(
              `[Webhook] Template delivery update — ID: ${status.id}, Status: ${status.status}`,
            );
            // Update status in TemplateService
            this.templateService.handleDeliveryStatus(
              status.id,
              status.status,
            );
          });
        });
      });

      this.logger.log('[Webhook] Event processed successfully');
      return { statusCode: 200, response: 'EVENT_RECEIVED' };
    }

    this.logger.warn('[Webhook] Unknown object type: ' + payload.object);
    return { statusCode: 200, response: 'EVENT_RECEIVED' };
  }

  // ─────────────────────────────────────────────
  // Simulate Incoming Webhook Event
  // ─────────────────────────────────────────────
  simulateIncomingEvent() {
    this.logger.log('[Webhook] Simulating incoming Meta webhook event...');
    const mockPayload = MOCK_META.incomingWebhookEvent;
    return this.handleMetaWebhookEvent(mockPayload);
  }

  // ─────────────────────────────────────────────
  // Simulate Template Delivery Status Event
  // Mimics Meta sending a delivery receipt
  // for a template message
  // ─────────────────────────────────────────────
  simulateTemplateDelivery(messageId: string, status: string) {
    this.logger.log(
      `[Webhook] Simulating template delivery event — ID: ${messageId}, Status: ${status}`,
    );

    const mockPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123456789012345',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '+1 (555) 000-1234',
                  phone_number_id: '987654321098765',
                },
                statuses: [
                  {
                    id: messageId,
                    status: status.toLowerCase(),
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    recipient_id: '919876543210',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    return this.handleMetaWebhookEvent(mockPayload);
  }
}