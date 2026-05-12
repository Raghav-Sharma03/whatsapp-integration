import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MetaService } from './meta/meta.service';
import { MetaController } from './meta/meta.controller';

import { MessageBirdService } from './messagebird/messagebird.service';
import { MessageBirdController } from './messagebird/messagebird.controller';

import { TemplateService } from './template/template.service';
import { TemplateController } from './template/template.controller';

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
    TemplateController,
    WebhookController,
    WhatsAppController,
  ],
  providers: [
    MetaService,
    MessageBirdService,
    TemplateService,
    WebhookService,
    WhatsAppService,
  ],
})
export class AppModule {}