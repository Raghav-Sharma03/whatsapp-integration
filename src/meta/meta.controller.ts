import { Controller, Post, Body, Query, Logger } from '@nestjs/common';
import { MetaService } from './meta.service';

@Controller('meta')
export class MetaController {
  private readonly logger = new Logger(MetaController.name);

  constructor(private readonly metaService: MetaService) {}

  // POST /meta/signup/initiate
  @Post('signup/initiate')
  initiateSignup() {
    this.logger.log('[Meta Controller] POST /meta/signup/initiate called');
    return this.metaService.initiateSignup();
  }

  // POST /meta/signup/callback?simulate=failure
  @Post('signup/callback')
  handleSignupCallback(@Query('simulate') simulate?: string) {
    this.logger.log('[Meta Controller] POST /meta/signup/callback called');
    return this.metaService.handleSignupCallback(simulate);
  }

  // POST /meta/token/exchange
  @Post('token/exchange')
  exchangeToken(
    @Body() body: { code: string },
    @Query('simulate') simulate?: string,
  ) {
    this.logger.log('[Meta Controller] POST /meta/token/exchange called');
    return this.metaService.exchangeToken(body.code, simulate);
  }

  // POST /meta/phone/register
  @Post('phone/register')
  registerPhoneNumber(
    @Body() body: { phone_number_id: string; access_token: string },
    @Query('simulate') simulate?: string,
  ) {
    this.logger.log('[Meta Controller] POST /meta/phone/register called');
    return this.metaService.registerPhoneNumber(
      body.phone_number_id,
      body.access_token,
      simulate,
    );
  }

  // POST /meta/webhook/subscribe
  @Post('webhook/subscribe')
  subscribeWebhook(
    @Body() body: { waba_id: string; access_token: string },
  ) {
    this.logger.log('[Meta Controller] POST /meta/webhook/subscribe called');
    return this.metaService.subscribeWebhook(body.waba_id, body.access_token);
  }
}