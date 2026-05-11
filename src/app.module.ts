import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MetaService } from './meta/meta.service';
import { MetaController } from './meta/meta.controller';

import { MessageBirdService } from './messagebird/messagebird.service';
import { MessageBirdController } from './messagebird/messagebird.controller';

import { WebhookService } from './webhook/webhook.service';
import { WebhookController } from './webhook/webhook.controller';

import { WhatsAppService } from './whatsapp/whatsapp.service';
import { WhatsAppController } from './whatsapp/whatsapp.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [
    MetaController,
    MessageBirdController,
    WebhookController,
    WhatsAppController,
  ],
  providers: [
    MetaService,
    MessageBirdService,
    WebhookService,
    WhatsAppService,
  ],
})
export class AppModule {}