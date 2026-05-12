import { Injectable, Logger } from '@nestjs/common';
import { MOCK_META } from '../common/mock-data';
import { providerConfig } from '../config/provider.config';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  // ─────────────────────────────────────────────
  // Meta Webhook Verification
  // In real flow: Meta sends a GET request to your
  // webhook URL to verify it belongs to you.
  // You must echo back the hub.challenge value.
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

    if (mode === 'subscribe' && verifyToken === providerConfig.meta.verifyToken) {
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
  // In real flow: Meta POSTs events to your
  // callback URL (messages, status updates, etc.)
  // ─────────────────────────────────────────────
  handleMetaWebhookEvent(payload: any): { statusCode: number; response: string } {
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

          // Log status updates
          statuses.forEach((status: any) => {
            this.logger.log(
              `[Webhook] Message status update — ID: ${status.id}, Status: ${status.status}`,
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
  // Simulate an Incoming Webhook Event
  // This lets you test without waiting for Meta
  // ─────────────────────────────────────────────
  simulateIncomingEvent() {
    this.logger.log('[Webhook] Simulating incoming Meta webhook event...');
    const mockPayload = MOCK_META.incomingWebhookEvent;
    return this.handleMetaWebhookEvent(mockPayload);
  }
}