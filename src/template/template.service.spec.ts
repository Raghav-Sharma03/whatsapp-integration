import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from './template.service';
import {
  AppointmentTemplateType,
  TemplateMessageStatus,
} from './template.types';

describe('TemplateService — Template Message Flow', () => {
  let service: TemplateService;

  const mockParams = {
    patient_name: 'Raghav Sharma',
    doctor_name: 'Mehta',
    appointment_date: '12th May 2026',
    appointment_time: '10:30 AM',
    hospital_name: 'PearlThoughts Hospital',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateService],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  // ─────────────────────────────────────────────
  // Confirmation Template Tests
  // ─────────────────────────────────────────────

  it('should send confirmation template successfully', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendConfirmation(
      '919876543210',
      mockParams,
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('META_WHATSAPP');
    expect(result.status).toBe(TemplateMessageStatus.SENT);
    expect(result.message_id).toMatch(/^wamid\.MOCK_/);
  });

  it('confirmation payload should contain correct template name', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendConfirmation(
      '919876543210',
      mockParams,
    );

    expect(result.payload_sent.template.name).toBe(
      AppointmentTemplateType.CONFIRMATION,
    );
  });

  it('confirmation payload should contain all 5 dynamic parameters', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendConfirmation(
      '919876543210',
      mockParams,
    );

    const parameters = result.payload_sent.template.components[0].parameters;
    expect(parameters).toHaveLength(5);
    expect(parameters[0].text).toBe('Raghav Sharma');
    expect(parameters[1].text).toBe('Mehta');
    expect(parameters[2].text).toBe('12th May 2026');
    expect(parameters[3].text).toBe('10:30 AM');
    expect(parameters[4].text).toBe('PearlThoughts Hospital');
  });

  // ─────────────────────────────────────────────
  // Reminder Template Tests
  // ─────────────────────────────────────────────

  it('should send reminder template successfully', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendReminder('919876543210', mockParams);

    expect(result.success).toBe(true);
    expect(result.payload_sent.template.name).toBe(
      AppointmentTemplateType.REMINDER,
    );
  });

  // ─────────────────────────────────────────────
  // Cancellation Template Tests
  // ─────────────────────────────────────────────

  it('should send cancellation template successfully', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendCancellation(
      '919876543210',
      mockParams,
    );

    expect(result.success).toBe(true);
    expect(result.payload_sent.template.name).toBe(
      AppointmentTemplateType.CANCELLATION,
    );
  });

  // ─────────────────────────────────────────────
  // Status Tracking Tests
  // ─────────────────────────────────────────────

  it('should track message status after sending', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const sendResult = await service.sendConfirmation(
      '919876543210',
      mockParams,
    );

    const statusResult = service.getStatus(sendResult.message_id);
    expect(statusResult.success).toBe(true);
    expect(statusResult.data.status).toBe(TemplateMessageStatus.SENT);
    expect(statusResult.data.message_id).toBe(sendResult.message_id);
  });

  it('should update status to DELIVERED when webhook fires', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const sendResult = await service.sendConfirmation(
      '919876543210',
      mockParams,
    );

    service.handleDeliveryStatus(sendResult.message_id, 'delivered');

    const statusResult = service.getStatus(sendResult.message_id);
    expect(statusResult.data.status).toBe(TemplateMessageStatus.DELIVERED);
  });

  it('should update status to FAILED when webhook fires failure', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const sendResult = await service.sendConfirmation(
      '919876543210',
      mockParams,
    );

    service.handleDeliveryStatus(sendResult.message_id, 'failed');

    const statusResult = service.getStatus(sendResult.message_id);
    expect(statusResult.data.status).toBe(TemplateMessageStatus.FAILED);
  });

  it('should return error when message_id not found', () => {
    const result = service.getStatus('wamid.NONEXISTENT_ID');
    expect(result.success).toBe(false);
    expect(result.error).toBe('message_not_found');
  });

  // ─────────────────────────────────────────────
  // Retry Logic Tests
  // ─────────────────────────────────────────────

  it('should succeed after retries when simulate=retry', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendConfirmation(
      '919876543210',
      mockParams,
      'retry',
    );

    expect(result.success).toBe(true);
    expect(result.retry_count).toBe(2);
  });

  // ─────────────────────────────────────────────
  // Fallback Tests
  // ─────────────────────────────────────────────

  it('should fallback to MESSAGE_BIRD when META_WHATSAPP fails', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendConfirmation(
      '919876543210',
      mockParams,
      'failure',
    );

    expect(result.success).toBe(true);
    expect(result.fallback).toBe(true);
    expect(result.original_provider).toBe('META_WHATSAPP');
    expect(result.provider).toBe('MESSAGE_BIRD');
  });

  // ─────────────────────────────────────────────
  // Provider Toggle Tests
  // ─────────────────────────────────────────────

  it('should use MessageBird payload format when provider is MESSAGE_BIRD', async () => {
    process.env.WHATSAPP_PROVIDER = 'MESSAGE_BIRD';
    const result = await service.sendConfirmation(
      '919876543210',
      mockParams,
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('MESSAGE_BIRD');
    expect(result.payload_sent.template_name).toBe(
      AppointmentTemplateType.CONFIRMATION,
    );
    expect(result.payload_sent.parameters).toBeDefined();
  });

  it('should use Meta components format when provider is META_WHATSAPP', async () => {
    process.env.WHATSAPP_PROVIDER = 'META_WHATSAPP';
    const result = await service.sendConfirmation(
      '919876543210',
      mockParams,
    );

    expect(result.success).toBe(true);
    expect(result.provider).toBe('META_WHATSAPP');
    expect(result.payload_sent.template.components).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Invalid Template Test
  // ─────────────────────────────────────────────

  it('should return error for invalid template name', async () => {
    const result = await service.sendTemplate(
      '919876543210',
      'invalid_template' as AppointmentTemplateType,
      mockParams,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('template_not_found');
  });
});