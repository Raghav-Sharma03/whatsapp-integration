import {
  Controller,
  Get,
  Post,
  Query,
  Body,
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
  // Meta calls this to verify your webhook URL
  // Query params: hub.mode, hub.verify_token, hub.challenge
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
  // Meta sends incoming events to this endpoint
  // (messages, delivery receipts, status updates)
  // ─────────────────────────────────────────────
  @Post('meta')
  handleWebhookEvent(@Body() payload: any, @Res() res: Response) {
    this.logger.log('[Webhook Controller] POST /webhook/meta called');

    const result = this.webhookService.handleMetaWebhookEvent(payload);
    return res.status(result.statusCode).send(result.response);
  }

  // ─────────────────────────────────────────────
  // POST /webhook/meta/simulate
  // Triggers a fake incoming webhook event
  // so you can test without real Meta credentials
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
}