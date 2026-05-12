import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from './whatsapp.service';
import { MetaService } from '../meta/meta.service';
import { MessageBirdService } from '../messagebird/messagebird.service';

describe('WhatsAppService — Provider Toggle + Appointment Notifications', () => {
  let service: WhatsAppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WhatsAppService, MetaService, MessageBirdService],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  // ─────────────────────────────────────────────
  // Appointment notification tests
  // ─────────────────────────────────────────────

  it('should send appointment message and return success', () => {
    const result = service.sendAppointmentMessage(
      '919876543210',
      'Raghav Sharma',
      'Mehta',
      '12th May 2026',
      '10:30 AM',
      'PearlThoughts Hospital',
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBeDefined();
  });

  it('appointment message body should contain patient name and doctor name', () => {
    const result = service.sendAppointmentMessage(
      '919876543210',
      'Raghav Sharma',
      'Mehta',
      '12th May 2026',
      '10:30 AM',
      'PearlThoughts Hospital',
    );

    expect(result.success).toBe(true);
    const messageBody = result.data?.text?.body || result.data?.body || '';
    expect(messageBody).toContain('Raghav Sharma');
    expect(messageBody).toContain('Mehta');
    expect(messageBody).toContain('PearlThoughts Hospital');
  });

  it('should return failure response when simulate=failure', () => {
    const result = service.sendAppointmentMessage(
      '919876543210',
      'Raghav Sharma',
      'Mehta',
      '12th May 2026',
      '10:30 AM',
      'PearlThoughts Hospital',
      'failure',
    );

    expect(result.success).toBe(false);
  });

  // ─────────────────────────────────────────────
  // Provider toggle tests
  // ─────────────────────────────────────────────

  it('should return active provider info', () => {
    const result = service.getActiveProvider();

    expect(result.active_provider).toBeDefined();
    expect(['META_WHATSAPP', 'MESSAGE_BIRD']).toContain(
      result.active_provider,
    );
  });

  it('should route to META_WHATSAPP when provider is META_WHATSAPP', () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';

    const result = service.sendAppointmentMessage(
      '919876543210',
      'Raghav',
      'Mehta',
      '12th May 2026',
      '10:30 AM',
      'PearlThoughts Hospital',
    );

    expect(result.provider).toBe('META_WHATSAPP');
  });

  it('should route to MESSAGE_BIRD when provider is MESSAGE_BIRD', () => {
    process.env.WHATSAPP_PROVIDER = 'MESSAGE_BIRD';

    const result = service.sendAppointmentMessage(
      '919876543210',
      'Raghav',
      'Mehta',
      '12th May 2026',
      '10:30 AM',
      'PearlThoughts Hospital',
    );

    expect(result.provider).toBe('MESSAGE_BIRD');
  });
});