import * as dotenv from 'dotenv';
dotenv.config();

export enum WhatsAppProvider {
  MESSAGE_BIRD = 'MESSAGE_BIRD',
  META_WHATSAPP = 'META_WHATSAPP',
}

export const getProvider = (): WhatsAppProvider => {
  const provider = process.env.WHATSAPP_PROVIDER;

  if (provider === WhatsAppProvider.MESSAGE_BIRD) {
    return WhatsAppProvider.MESSAGE_BIRD;
  }

  if (provider === WhatsAppProvider.META_WHATSAPP) {
    return WhatsAppProvider.META_WHATSAPP;
  }

  // Default fallback
  console.warn(
    `[Config] WHATSAPP_PROVIDER not set or invalid. Defaulting to META_WHATSAPP`,
  );
  return WhatsAppProvider.META_WHATSAPP;
};

export const providerConfig = {
  currentProvider: getProvider(),
  meta: {
    appId: process.env.META_APP_ID || 'MOCK_APP_ID_123456',
    appSecret: process.env.META_APP_SECRET || 'MOCK_APP_SECRET_abcdef',
    verifyToken: process.env.META_VERIFY_TOKEN || 'MOCK_VERIFY_TOKEN_xyz789',
    graphApiVersion: 'v18.0',
    graphApiBase: 'https://graph.facebook.com',
  },
  messagebird: {
    accessKey: process.env.MESSAGEBIRD_ACCESS_KEY || 'MOCK_MB_ACCESS_KEY_123',
    channelId: process.env.MESSAGEBIRD_CHANNEL_ID || 'MOCK_MB_CHANNEL_abc',
    apiBase: 'https://api.bird.com',
  },
};