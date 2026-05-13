import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { TemplateService } from '../template/template.service';

describe('WebhookService — Webhook Verification', () => {
  let service: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookService, TemplateService],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  it('should return 200 and echo back challenge when token is correct', () => {
    const result = service.verifyMetaWebhook(
      'subscribe',
      'MOCK_VERIFY_TOKEN_xyz789',
      'CHALLENGE_ABC123',
    );
    expect(result.statusCode).toBe(200);
    expect(result.response).toBe('CHALLENGE_ABC123');
  });

  it('should return 403 when verify token is wrong', () => {
    const result = service.verifyMetaWebhook(
      'subscribe',
      'WRONG_TOKEN',
      'CHALLENGE_ABC123',
    );
    expect(result.statusCode).toBe(403);
    expect(result.response).toContain('Forbidden');
  });

  it('should return 403 when hub.mode is not subscribe', () => {
    const result = service.verifyMetaWebhook(
      'wrongmode',
      'MOCK_VERIFY_TOKEN_xyz789',
      'CHALLENGE_ABC123',
    );
    expect(result.statusCode).toBe(403);
  });

  it('should return 200 EVENT_RECEIVED for valid whatsapp payload', () => {
    const mockPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: '919876543210',
                    text: { body: 'CONFIRM' },
                  },
                ],
                statuses: [],
              },
            },
          ],
        },
      ],
    };
    const result = service.handleMetaWebhookEvent(mockPayload);
    expect(result.statusCode).toBe(200);
    expect(result.response).toBe('EVENT_RECEIVED');
  });

  it('should return 400 when payload is missing object field', () => {
    const result = service.handleMetaWebhookEvent({});
    expect(result.statusCode).toBe(400);
  });

  it('should return 400 when payload is null', () => {
    const result = service.handleMetaWebhookEvent(null);
    expect(result.statusCode).toBe(400);
  });
});