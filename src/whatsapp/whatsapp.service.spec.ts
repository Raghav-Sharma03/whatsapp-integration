import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from './whatsapp.service';
import { MessageBirdService } from '../messagebird/messagebird.service';
import { TemplateService } from '../template/template.service';
import { AppointmentType } from '../template/template.types';

describe('WhatsAppService — Provider Toggle + Appointment Notifications', () => {
  let service: WhatsAppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WhatsAppService, MessageBirdService, TemplateService],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  // ─────────────────────────────────────────────
  // Appointment type routing tests
  // ─────────────────────────────────────────────

  it('should send confirmation template when appointment_type is confirmation', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendAppointmentMessage(
      '919876543210',
      'Raghav Sharma',
      'Mehta',
      '12th May 2026',
      '10:30 AM',
      'PearlThoughts Hospital',
      AppointmentType.CONFIRMATION,
    );

    expect(result.success).toBe(true);
    expect(result.payload_sent.template.name).toBe(
      'appointment_confirmation',
    );
  });

  it('should send reminder template when appointment_type is reminder', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendAppointmentMessage(
      '919876543210',
      'Raghav Sharma',
      'Mehta',
      '13th May 2026',
      '10:30 AM',
      'PearlThoughts Hospital',
      AppointmentType.REMINDER,
    );

    expect(result.success).toBe(true);
    expect(result.payload_sent.template.name).toBe('appointment_reminder');
  });

  it('should send cancellation template when appointment_type is cancellation', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendAppointmentMessage(
      '919876543210',
      'Raghav Sharma',
      'Mehta',
      '12th May 2026',
      '10:30 AM',
      'PearlThoughts Hospital',
      AppointmentType.CANCELLATION,
    );

    expect(result.success).toBe(true);
    expect(result.payload_sent.template.name).toBe(
      'appointment_cancellation',
    );
  });

  it('should default to confirmation when appointment_type is not provided', async () => {
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
    expect(result.payload_sent.template.name).toBe(
      'appointment_confirmation',
    );
  });

  // ─────────────────────────────────────────────
  // Failure and fallback tests
  // ─────────────────────────────────────────────

  it('should trigger fallback when simulate=failure', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendAppointmentMessage(
      '919876543210',
      'Raghav Sharma',
      'Mehta',
      '12th May 2026',
      '10:30 AM',
      'PearlThoughts Hospital',
      AppointmentType.CONFIRMATION,
      'failure',
    );

    expect(result.success).toBe(true);
    expect(result.fallback).toBe(true);
    expect(result.original_provider).toBe('META_WHATSAPP');
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
      AppointmentType.CONFIRMATION,
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
      AppointmentType.CONFIRMATION,
    );

    expect(result.provider).toBe('MESSAGE_BIRD');
  });
});