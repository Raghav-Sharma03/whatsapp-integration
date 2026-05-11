import { Injectable, Logger } from '@nestjs/common';
import { MOCK_META } from '../common/mock-data';
import { providerConfig } from '../config/provider.config';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  // ─────────────────────────────────────────────
  // STEP 1: Initiate Embedded Signup
  // In real flow: launches Facebook JS SDK popup
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // STEP 2: Handle Signup Callback
  // In real flow: called after popup completes
  // Returns: exchangeable code + waba_id + phone_number_id
  // ─────────────────────────────────────────────
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
    this.logger.log('[Meta] Received waba_id: ' + MOCK_META.signupCallback.waba_id);
    this.logger.log('[Meta] Received phone_number_id: ' + MOCK_META.signupCallback.phone_number_id);

    return {
      success: true,
      message:
        'Signup complete. Use the code to exchange for a business token.',
      data: MOCK_META.signupCallback,
    };
  }

  // ─────────────────────────────────────────────
  // STEP 3: Exchange Code for Business Token
  // In real flow: GET https://graph.facebook.com/oauth/access_token
  // ─────────────────────────────────────────────
  exchangeToken(code: string, simulate?: string) {
    this.logger.log('[Meta] Exchanging code for business token...');
    this.logger.log('[Meta] Received code: ' + code);

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

  // ─────────────────────────────────────────────
  // STEP 4: Register Phone Number for Cloud API
  // In real flow: POST /{phone-number-id}/register
  // ─────────────────────────────────────────────
  registerPhoneNumber(phoneNumberId: string, accessToken: string, simulate?: string) {
    this.logger.log('[Meta] Registering phone number for Cloud API...');
    this.logger.log('[Meta] phone_number_id: ' + phoneNumberId);

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

  // ─────────────────────────────────────────────
  // STEP 5: Subscribe App to WABA Webhooks
  // In real flow: POST /{waba-id}/subscribed_apps
  // ─────────────────────────────────────────────
  subscribeWebhook(wabaId: string, accessToken: string) {
    this.logger.log('[Meta] Subscribing app to WABA webhooks...');
    this.logger.log('[Meta] waba_id: ' + wabaId);

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
}