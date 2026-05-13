import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { AppointmentType } from '../template/template.types';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

  // GET /whatsapp/provider
  @Get('provider')
  getActiveProvider() {
    this.logger.log('[WhatsApp Controller] GET /whatsapp/provider called');
    return this.whatsAppService.getActiveProvider();
  }

  // ─────────────────────────────────────────────
  // POST /whatsapp/send-appointment
  // Now accepts appointment_type:
  // "confirmation" → confirmation template
  // "reminder"     → reminder template
  // "cancellation" → cancellation template
  // Defaults to "confirmation" if not provided
  // ─────────────────────────────────────────────
  @Post('send-appointment')
  async sendAppointment(
    @Body()
    body: {
      to: string;
      patient_name: string;
      doctor_name: string;
      appointment_date: string;
      appointment_time: string;
      hospital_name: string;
      appointment_type?: AppointmentType;
    },
    @Query('simulate') simulate?: string,
  ) {
    this.logger.log(
      '[WhatsApp Controller] POST /whatsapp/send-appointment called',
    );
    this.logger.log(
      `[WhatsApp Controller] appointment_type: ${body.appointment_type || 'confirmation (default)'}`,
    );
    return this.whatsAppService.sendAppointmentMessage(
      body.to,
      body.patient_name,
      body.doctor_name,
      body.appointment_date,
      body.appointment_time,
      body.hospital_name,
      body.appointment_type || AppointmentType.CONFIRMATION,
      simulate,
    );
  }
}