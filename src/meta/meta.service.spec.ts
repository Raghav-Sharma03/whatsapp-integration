import { Test, TestingModule } from '@nestjs/testing';
import { MetaService } from './meta.service';

describe('MetaService — Messaging Flow', () => {
  let service: MetaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetaService],
    }).compile();

    service = module.get<MetaService>(MetaService);
  });

  // ─────────────────────────────────────────────
  // sendMessage() tests
  // ─────────────────────────────────────────────

  it('should send a WhatsApp message successfully via Meta Cloud API', () => {
    const result = service.sendMessage(
      '919876543210',
      'Your appointment is confirmed for tomorrow at 10 AM.',
    );

    expect(result.success).toBe(true);
    expect(result.data.to).toBe('919876543210');
    expect(result.data.status).toBe('SENT');
    expect(result.data.message_id).toMatch(/^wamid\.MOCK_/);
  });

  it('should return failure when simulate=failure is passed', () => {
    const result = service.sendMessage(
      '919876543210',
      'Your appointment is confirmed.',
      'failure',
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('message_send_failed');
  });

  it('should return error when "to" is missing', () => {
    const result = service.sendMessage('', 'Your appointment is confirmed.');

    expect(result.success).toBe(false);
    expect(result.error).toBe('missing_fields');
  });

  it('should return error when messageBody is missing', () => {
    const result = service.sendMessage('919876543210', '');

    expect(result.success).toBe(false);
    expect(result.error).toBe('missing_fields');
  });

  // ─────────────────────────────────────────────
  // Onboarding flow tests
  // ─────────────────────────────────────────────

  it('should initiate signup and return session_id and auth_url', () => {
    const result = service.initiateSignup();

    expect(result.success).toBe(true);
    expect(result.session_id).toMatch(/^SESSION_/);
    expect(result.auth_url).toContain('facebook.com/dialog/oauth');
  });

  it('should return signup callback data on success', () => {
    const result = service.handleSignupCallback();

    expect(result.success).toBe(true);
    expect(result.data.waba_id).toBeDefined();
    expect(result.data.phone_number_id).toBeDefined();
    expect(result.data.code).toBeDefined();
  });

  it('should return user_cancelled error on signup failure simulation', () => {
    const result = service.handleSignupCallback('failure');

    expect(result.success).toBe(false);
    expect(result.error).toBe('user_cancelled');
  });

  it('should exchange code for access token', () => {
    const result = service.exchangeToken('AQD3_MOCK_CODE');

    expect(result.success).toBe(true);
    expect(result.data.access_token).toBeDefined();
    expect(result.data.token_type).toBe('bearer');
  });

  it('should return error when code is missing in token exchange', () => {
    const result = service.exchangeToken('');

    expect(result.success).toBe(false);
    expect(result.error).toBe('missing_code');
  });
});