import { Controller, Post, Body, Logger } from '@nestjs/common';
import { BotService } from './bot.service';

export class SendMessageDto {
  user_phone: string;
  message: string;
}

@Controller('bot')
export class BotController {
  private readonly logger = new Logger(BotController.name);

  constructor(private readonly botService: BotService) {}

  // ─────────────────────────────────────────────
  // POST /bot/message
  // Single entry point for all WhatsApp bot messages
  // Simulates incoming WhatsApp message from user
  // ─────────────────────────────────────────────
  @Post('message')
  async handleMessage(@Body() body: SendMessageDto) {
    this.logger.log(
      `[BotController] Incoming message from ${body.user_phone}: "${body.message}"`,
    );

    if (!body.user_phone || !body.message) {
      return {
        success: false,
        error: 'user_phone and message are required',
      };
    }

    const response = await this.botService.handleMessage(
      body.user_phone,
      body.message,
    );

    return {
      success: true,
      ...response,
    };
  }
}