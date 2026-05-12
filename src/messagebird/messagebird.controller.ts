import { Controller, Post, Body, Query, Logger } from '@nestjs/common';
import { MessageBirdService } from './messagebird.service';

@Controller('messagebird')
export class MessageBirdController {
  private readonly logger = new Logger(MessageBirdController.name);

  constructor(private readonly messageBirdService: MessageBirdService) {}

  // POST /messagebird/connect
  @Post('connect')
  connect(@Query('simulate') simulate?: string) {
    this.logger.log(
      '[MessageBird Controller] POST /messagebird/connect called',
    );
    return this.messageBirdService.connect(simulate);
  }

  // POST /messagebird/send-message
  @Post('send-message')
  sendMessage(
    @Body() body: { to: string; body: string },
    @Query('simulate') simulate?: string,
  ) {
    this.logger.log(
      '[MessageBird Controller] POST /messagebird/send-message called',
    );
    return this.messageBirdService.sendMessage(body.to, body.body, simulate);
  }
}