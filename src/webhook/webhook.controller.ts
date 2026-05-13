import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  Res,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  // ─────────────────────────────────────────────
  // GET /webhook/meta
  // Meta webhook verification
  // ─────────────────────────────────────────────
  @Get('meta')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    this.logger.log('[Webhook Controller] GET /webhook/meta called');
    const result = this.webhookService.verifyMetaWebhook(
      mode,
      verifyToken,
      challenge,
    );
    return res.status(result.statusCode).send(result.response);
  }

  // ─────────────────────────────────────────────
  // POST /webhook/meta
  // Receive incoming webhook events
  // ─────────────────────────────────────────────
  @Post('meta')
  handleWebhookEvent(@Body() payload: any, @Res() res: Response) {
    this.logger.log('[Webhook Controller] POST /webhook/meta called');
    const result = this.webhookService.handleMetaWebhookEvent(payload);
    return res.status(result.statusCode).send(result.response);
  }

  // ─────────────────────────────────────────────
  // POST /webhook/meta/simulate
  // Simulate incoming message event
  // ─────────────────────────────────────────────
  @Post('meta/simulate')
  simulateEvent(@Res() res: Response) {
    this.logger.log('[Webhook Controller] POST /webhook/meta/simulate called');
    const result = this.webhookService.simulateIncomingEvent();
    return res.status(result.statusCode).json({
      message: 'Simulated webhook event processed',
      result: result.response,
    });
  }

  // ─────────────────────────────────────────────
  // POST /webhook/meta/template-status/:messageId
  // Simulate template delivery status event
  // e.g. ?status=delivered or ?status=failed
  // ─────────────────────────────────────────────
  @Post('meta/template-status/:messageId')
  simulateTemplateDelivery(
    @Param('messageId') messageId: string,
    @Query('status') status: string = 'delivered',
    @Res() res: Response,
  ) {
    this.logger.log(
      `[Webhook Controller] POST /webhook/meta/template-status/${messageId} called`,
    );
    const result = this.webhookService.simulateTemplateDelivery(
      messageId,
      status,
    );
    return res.status(result.statusCode).json({
      message: `Template delivery status "${status}" simulated for message ${messageId}`,
      result: result.response,
    });
  }
}