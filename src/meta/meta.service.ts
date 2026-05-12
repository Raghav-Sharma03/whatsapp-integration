import { Injectable, Logger } from '@nestjs/common';
import { MOCK_META } from '../common/mock-data';
import { providerConfig } from '../config/provider.config';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  // ─────────────────────────────────────────────
  // ONBOARDING FLOW — Happens ONCE per business
  // ─────────────────────────────────────────────

  // STEP 1: Initiate Embedded Signup
  initiateSignup() {
    this.logger.log('[Meta] Initiating Embedded Signup flow...');

    const mockResponse = {
      success: true,
      message: 'Embedded Signup initiated. Launch the auth URL in a popup.',
      session_id: 'SESSION_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      auth_url: `https://www.facebook.com/dialog/oauth?client_id=${providerConfig.meta.appId}&scope=whatsapp_business_management,whatsapp_business_messaging`,
      instructions:
        'In production: open this auth_url in a popup window using Facebook JS SDK. On completion, Meta returns code + waba_id + phone_number_id.',
    };

    this.logger.log('[Meta] Signup session created: ' + mockResponse.session_id);
    return mockResponse;
  }

  // STEP 2: Handle Signup Callback
  handleSignupCallback(simulate?: string) {
    this.logger.log('[Meta] Handling Embedded Signup callback...');

    if (simulate === 'failure') {
      this.logger.error('[Meta] Signup failed — user cancelled the flow');
      return {
        success: false,
        ...MOCK_META.errors.userCancelled,
      };
    }

    this.logger.log('[Meta] Signup completed successfully');
    return {
      success: true,
      message: 'Signup complete. Use the code to exchange for a business token.',
      data: MOCK_META.signupCallback,
    };
  }

  // STEP 3: Exchange Code for Business Token
  exchangeToken(code: string, simulate?: string) {
    this.logger.log('[Meta] Exchanging code for business token...');

    if (simulate === 'failure') {
      this.logger.error('[Meta] Token exchange failed — invalid or expired code');
      return {
        success: false,
        ...MOCK_META.errors.invalidCode,
      };
    }

    if (!code) {
      this.logger.error('[Meta] Token exchange failed — no code provided');
      return {
        success: false,
        error: 'missing_code',
        error_description: 'A valid exchangeable code is required',
        error_code: 4004,
      };
    }

    this.logger.log('[Meta] Token exchanged successfully');
    return {
      success: true,
      message: 'Code exchanged for business token successfully.',
      data: MOCK_META.accessToken,
    };
  }

  // STEP 4: Register Phone Number for Cloud API
  registerPhoneNumber(phoneNumberId: string, accessToken: string, simulate?: string) {
    this.logger.log('[Meta] Registering phone number for Cloud API...');

    if (simulate === 'failure') {
      this.logger.error('[Meta] Phone registration failed — already registered');
      return {
        success: false,
        ...MOCK_META.errors.phoneAlreadyRegistered,
      };
    }

    if (!phoneNumberId || !accessToken) {
      this.logger.error('[Meta] Missing phone_number_id or access_token');
      return {
        success: false,
        error: 'missing_fields',
        error_description: 'phone_number_id and access_token are required',
        error_code: 4005,
      };
    }

    this.logger.log('[Meta] Phone number registered successfully');
    return {
      success: true,
      message: 'Phone number registered for Cloud API use.',
      data: MOCK_META.phoneRegistration,
    };
  }

  // STEP 5: Subscribe App to WABA Webhooks
  subscribeWebhook(wabaId: string, accessToken: string) {
    this.logger.log('[Meta] Subscribing app to WABA webhooks...');

    if (!wabaId || !accessToken) {
      this.logger.error('[Meta] Missing waba_id or access_token');
      return {
        success: false,
        error: 'missing_fields',
        error_description: 'waba_id and access_token are required',
        error_code: 4006,
      };
    }

    this.logger.log('[Meta] Webhook subscription successful');
    return {
      success: true,
      message: 'App successfully subscribed to WABA webhooks.',
      data: MOCK_META.webhookSubscription,
    };
  }

  // ─────────────────────────────────────────────
  // MESSAGING FLOW — Happens EVERY TIME
  // Mocks: POST /{phone-number-id}/messages
  // Real Meta Cloud API endpoint for sending msgs
  // ─────────────────────────────────────────────

  sendMessage(
    to: string,
    messageBody: string,
    simulate?: string,
  ) {
    this.logger.log('[Meta] Sending WhatsApp message via Cloud API...');
    this.logger.log('[Meta] To: ' + to);
    this.logger.log('[Meta] Message: ' + messageBody);

    if (simulate === 'failure') {
      this.logger.error('[Meta] Message send failed — invalid token or number');
      return {
        success: false,
        ...MOCK_META.errors.messageSendFailed,
      };
    }

    if (!to || !messageBody) {
      this.logger.error('[Meta] Missing "to" or "messageBody"');
      return {
        success: false,
        error: 'missing_fields',
        error_description: '"to" and "messageBody" are required',
        error_code: 4007,
      };
    }

    const response = {
      ...MOCK_META.messageSent,
      to,
      text: { body: messageBody },
      message_id:
        'wamid.MOCK_' +
        Math.random().toString(36).substr(2, 9).toUpperCase(),
      sent_at: new Date().toISOString(),
    };

    this.logger.log('[Meta] Message sent successfully. ID: ' + response.message_id);

    return {
      success: true,
      message: 'WhatsApp message sent via Meta Cloud API.',
      data: response,
    };
  }
}