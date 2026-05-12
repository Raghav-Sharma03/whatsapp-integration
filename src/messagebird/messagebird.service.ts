import { Injectable, Logger } from '@nestjs/common';
import { MOCK_MESSAGEBIRD } from '../common/mock-data';
import { providerConfig } from '../config/provider.config';

@Injectable()
export class MessageBirdService {
  private readonly logger = new Logger(MessageBirdService.name);

  // ─────────────────────────────────────────────
  // Connect to MessageBird Channel
  // In real flow: authenticates with MessageBird
  // API and returns channel details
  // ─────────────────────────────────────────────
  connect(simulate?: string) {
    this.logger.log('[MessageBird] Initiating MessageBird connection...');
    this.logger.log(
      '[MessageBird] Using access key: ' + providerConfig.messagebird.accessKey,
    );

    if (simulate === 'failure') {
      this.logger.error(
        '[MessageBird] Connection failed — invalid access key',
      );
      return {
        success: false,
        ...MOCK_MESSAGEBIRD.errors.invalidAccessKey,
      };
    }

    this.logger.log('[MessageBird] Connection established successfully');
    return {
      success: true,
      message: 'MessageBird channel connected successfully.',
      data: MOCK_MESSAGEBIRD.connection,
    };
  }

  // ─────────────────────────────────────────────
  // Send a WhatsApp Message via MessageBird
  // In real flow: POST https://api.bird.com/
  // workspaces/{id}/channels/{id}/messages
  // ─────────────────────────────────────────────
  sendMessage(to: string, body: string, simulate?: string) {
    this.logger.log('[MessageBird] Sending WhatsApp message...');
    this.logger.log('[MessageBird] To: ' + to);
    this.logger.log('[MessageBird] Message: ' + body);

    if (simulate === 'failure') {
      this.logger.error(
        '[MessageBird] Message send failed — invalid access key',
      );
      return {
        success: false,
        ...MOCK_MESSAGEBIRD.errors.invalidAccessKey,
      };
    }

    if (!to || !body) {
      this.logger.error(
        '[MessageBird] Message send failed — missing "to" or "body"',
      );
      return {
        success: false,
        error: 'missing_fields',
        error_description: '"to" and "body" fields are required',
        error_code: 5002,
      };
    }

    const response = {
      ...MOCK_MESSAGEBIRD.messageSent,
      to,
      body,
      message_id:
        'MB_MSG_MOCK_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    };

    this.logger.log(
      '[MessageBird] Message sent successfully. ID: ' + response.message_id,
    );

    return {
      success: true,
      message: 'WhatsApp message sent via MessageBird.',
      data: response,
    };
  }
}