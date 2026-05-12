import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

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

  // POST /whatsapp/send-appointment
  @Post('send-appointment')
  sendAppointment(
    @Body()
    body: {
      to: string;
      patient_name: string;
      doctor_name: string;
      appointment_date: string;
      appointment_time: string;
      hospital_name: string;
    },
    @Query('simulate') simulate?: string,
  ) {
    this.logger.log(
      '[WhatsApp Controller] POST /whatsapp/send-appointment called',
    );
    return this.whatsAppService.sendAppointmentMessage(
      body.to,
      body.patient_name,
      body.doctor_name,
      body.appointment_date,
      body.appointment_time,
      body.hospital_name,
      simulate,
    );
  }
}