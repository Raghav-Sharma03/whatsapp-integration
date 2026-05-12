import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from './whatsapp.service';
import { MessageBirdService } from '../messagebird/messagebird.service';
import { TemplateService } from '../template/template.service';

describe('WhatsAppService — Provider Toggle + Appointment Notifications', () => {
  let service: WhatsAppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WhatsAppService, MessageBirdService, TemplateService],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  // ─────────────────────────────────────────────
  // Appointment notification tests
  // Now uses TemplateService internally
  // ─────────────────────────────────────────────

  it('should send appointment message using template service', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendAppointmentMessage(
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

  it('should return structured template response not plain text', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendAppointmentMessage(
      '919876543210',
      'Raghav Sharma',
      'Mehta',
      '12th May 2026',
      '10:30 AM',
      'PearlThoughts Hospital',
    );

    expect(result.success).toBe(true);
    expect(result.message_id).toMatch(/^wamid\.MOCK_/);
    expect(result.payload_sent.type).toBe('template');
  });

  it('should return failure response when simulate=failure', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendAppointmentMessage(
      '919876543210',
      'Raghav Sharma',
      'Mehta',
      '12th May 2026',
      '10:30 AM',
      'PearlThoughts Hospital',
      'failure',
    );

    expect(result.success).toBe(true);
    expect(result.fallback).toBe(true);
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

  it('should route to META_WHATSAPP when provider is META_WHATSAPP', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendAppointmentMessage(
      '919876543210',
      'Raghav',
      'Mehta',
      '12th May 2026',
      '10:30 AM',
      'PearlThoughts Hospital',
    );

    expect(result.provider).toBe('META_WHATSAPP');
  });

  it('should route to MESSAGE_BIRD when provider is MESSAGE_BIRD', async () => {
    process.env.WHATSAPP_PROVIDER = 'MESSAGE_BIRD';
    const result = await service.sendAppointmentMessage(
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