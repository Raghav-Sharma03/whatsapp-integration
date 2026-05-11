import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 WhatsApp Integration Server is running on port ${port}`);
  logger.log(`📡 Active Provider: ${process.env.WHATSAPP_PROVIDER}`);
  logger.log(`🔗 Health check: http://localhost:${port}`);
}

bootstrap();