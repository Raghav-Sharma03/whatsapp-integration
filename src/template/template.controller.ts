import { Controller, Post, Get, Body, Param, Query, Logger } from '@nestjs/common';
import { TemplateService } from './template.service';
import { AppointmentTemplateType, AppointmentTemplateParams } from './template.types';

@Controller('template')
export class TemplateController {
  private readonly logger = new Logger(TemplateController.name);

  constructor(private readonly templateService: TemplateService) {}

  // ─────────────────────────────────────────────
  // POST /template/send
  // Send any template by name
  // ─────────────────────────────────────────────
  @Post('send')
  async sendTemplate(
    @Body()
    body: {
      to: string;
      template_name: AppointmentTemplateType;
      params: AppointmentTemplateParams;
    },
    @Query('simulate') simulate?: string,
  ) {
    this.logger.log('[Template Controller] POST /template/send called');
    return this.templateService.sendTemplate(
      body.to,
      body.template_name,
      body.params,
      simulate,
    );
  }

  // ─────────────────────────────────────────────
  // POST /template/appointment/confirmation
  // Send appointment confirmation template
  // ─────────────────────────────────────────────
  @Post('appointment/confirmation')
  async sendConfirmation(
    @Body()
    body: {
      to: string;
      params: AppointmentTemplateParams;
    },
    @Query('simulate') simulate?: string,
  ) {
    this.logger.log(
      '[Template Controller] POST /template/appointment/confirmation called',
    );
    return this.templateService.sendConfirmation(
      body.to,
      body.params,
      simulate,
    );
  }

  // ─────────────────────────────────────────────
  // POST /template/appointment/reminder
  // Send appointment reminder template
  // ─────────────────────────────────────────────
  @Post('appointment/reminder')
  async sendReminder(
    @Body()
    body: {
      to: string;
      params: AppointmentTemplateParams;
    },
    @Query('simulate') simulate?: string,
  ) {
    this.logger.log(
      '[Template Controller] POST /template/appointment/reminder called',
    );
    return this.templateService.sendReminder(
      body.to,
      body.params,
      simulate,
    );
  }

  // ─────────────────────────────────────────────
  // POST /template/appointment/cancellation
  // Send appointment cancellation template
  // ─────────────────────────────────────────────
  @Post('appointment/cancellation')
  async sendCancellation(
    @Body()
    body: {
      to: string;
      params: AppointmentTemplateParams;
    },
    @Query('simulate') simulate?: string,
  ) {
    this.logger.log(
      '[Template Controller] POST /template/appointment/cancellation called',
    );
    return this.templateService.sendCancellation(
      body.to,
      body.params,
      simulate,
    );
  }

  // ─────────────────────────────────────────────
  // GET /template/status/:messageId
  // Get delivery status of a template message
  // ─────────────────────────────────────────────
  @Get('status/:messageId')
  getStatus(@Param('messageId') messageId: string) {
    this.logger.log(
      `[Template Controller] GET /template/status/${messageId} called`,
    );
    return this.templateService.getStatus(messageId);
  }
}