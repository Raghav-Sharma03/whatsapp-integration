import {
  Controller,
  Post,
  Body,
  Logger,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { BotService } from './bot.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('bot')
export class BotController {
  private readonly logger = new Logger(BotController.name);

  constructor(private readonly botService: BotService) {}

  // ─────────────────────────────────────────────
  // POST /bot/message
  // Single entry point for all WhatsApp bot messages
  // Validates: user_phone (digits only, 7-15 chars)
  //            message (non-empty, max 500 chars)
  // ─────────────────────────────────────────────
  @Post('message')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown fields
      forbidNonWhitelisted: true, // reject requests with extra fields
      transform: true,          // auto-transform + run @Transform decorators
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (e) => Object.values(e.constraints || {}).join(', '),
        );
        return new BadRequestException({
          success: false,
          error: 'Validation failed',
          details: messages,
        });
      },
    }),
  )
  async handleMessage(@Body() body: SendMessageDto) {
    this.logger.log(
      `[BotController] Incoming: phone=${body.user_phone}, message="${body.message}"`,
    );

    const response = await this.botService.handleMessage(
      body.user_phone.trim(),
      body.message,
    );

    return {
      success: true,
      ...response,
    };
  }
}