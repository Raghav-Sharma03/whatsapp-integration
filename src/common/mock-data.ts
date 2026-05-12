// ─────────────────────────────────────────────
// All mock data that simulates real Meta &
// MessageBird API responses
// ─────────────────────────────────────────────

export const MOCK_META = {
  // Simulates what Meta returns after Embedded Signup popup completes
  signupCallback: {
    code: 'AQD3_MOCK_EXCHANGEABLE_CODE_abc123xyz',
    waba_id: '123456789012345',
    phone_number_id: '987654321098765',
    business_id: 'BIZ_MOCK_001',
  },

  // Simulates what Meta returns after token exchange
  accessToken: {
    access_token: 'EAABwzLixnjYBO_MOCK_BUSINESS_TOKEN_abc123',
    token_type: 'bearer',
  },

  // Simulates phone number registration response
  phoneRegistration: {
    success: true,
    phone_number_id: '987654321098765',
    display_phone_number: '+1 (555) 000-1234',
    verified_name: 'Mock Business Name',
    status: 'CONNECTED',
  },

  // Simulates webhook subscription response
  webhookSubscription: {
    success: true,
    waba_id: '123456789012345',
    subscribed_fields: [
      'messages',
      'message_template_status_update',
      'account_update',
    ],
  },

  // Simulates Meta Cloud API message send response
  messageSent: {
    messaging_product: 'whatsapp',
    contacts: [{ input: '', wa_id: '' }],
    status: 'SENT',
  },

  // Simulates incoming webhook event (appointment reply)
  incomingWebhookEvent: {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789012345',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1 (555) 000-1234',
                phone_number_id: '987654321098765',
              },
              messages: [
                {
                  from: '919876543210',
                  id: 'wamid.MOCK_MESSAGE_ID_001',
                  timestamp: '1715420400',
                  text: {
                    body: 'I confirm my appointment for tomorrow at 10 AM',
                  },
                  type: 'text',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────
  // Template Message Mock Data
  // Mirrors real Meta Cloud API template responses
  // ─────────────────────────────────────────────

  // Three appointment templates definitions
  templates: {
    appointment_confirmation: {
      name: 'appointment_confirmation',
      language: 'en_US',
      category: 'UTILITY',
      status: 'APPROVED',
      components: {
        body: 'Hello {{patient_name}}! Your appointment with Dr. {{doctor_name}} at {{hospital_name}} is *confirmed* for {{appointment_date}} at {{appointment_time}}. Please reply CONFIRM to confirm or CANCEL to cancel.',
      },
    },
    appointment_reminder: {
      name: 'appointment_reminder',
      language: 'en_US',
      category: 'UTILITY',
      status: 'APPROVED',
      components: {
        body: 'Hello {{patient_name}}! This is a reminder that your appointment with Dr. {{doctor_name}} at {{hospital_name}} is tomorrow — {{appointment_date}} at {{appointment_time}}. Please be on time.',
      },
    },
    appointment_cancellation: {
      name: 'appointment_cancellation',
      language: 'en_US',
      category: 'UTILITY',
      status: 'APPROVED',
      components: {
        body: 'Hello {{patient_name}}, your appointment with Dr. {{doctor_name}} at {{hospital_name}} scheduled for {{appointment_date}} at {{appointment_time}} has been *cancelled*. Please contact us to reschedule.',
      },
    },
  },

  // Simulates Meta response after template message is sent
  templateSendResponse: {
    messaging_product: 'whatsapp',
    contacts: [
      {
        input: '',
        wa_id: '',
      },
    ],
    messages: [
      {
        id: '',
        message_status: 'accepted',
      },
    ],
  },

  // Simulates template delivery webhook event from Meta
  templateDeliveryEvent: {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789012345',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1 (555) 000-1234',
                phone_number_id: '987654321098765',
              },
              statuses: [
                {
                  id: 'wamid.MOCK_TEMPLATE_MSG_001',
                  status: 'delivered',
                  timestamp: '1715420400',
                  recipient_id: '919876543210',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  },

  // Simulates failure scenarios
  errors: {
    userCancelled: {
      error: 'user_cancelled',
      error_description: 'User closed the signup popup without completing',
      error_code: 4001,
    },
    invalidCode: {
      error: 'invalid_code',
      error_description: 'The exchangeable code has expired or is invalid',
      error_code: 4002,
    },
    phoneAlreadyRegistered: {
      error: 'phone_already_registered',
      error_description: 'This phone number is already registered on Cloud API',
      error_code: 4003,
    },
    messageSendFailed: {
      error: 'message_send_failed',
      error_description:
        'Failed to send message — invalid token or unregistered number',
      error_code: 4007,
    },
    templateSendFailed: {
      error: 'template_send_failed',
      error_description:
        'Failed to send template message — invalid template or token',
      error_code: 4008,
    },
    templateNotFound: {
      error: 'template_not_found',
      error_description: 'The requested template name does not exist',
      error_code: 4009,
    },
  },
};

export const MOCK_MESSAGEBIRD = {
  // Simulates MessageBird channel connection
  connection: {
    channel_id: 'MB_CHANNEL_MOCK_abc123',
    access_key: 'MOCK_MB_ACCESS_KEY_123',
    workspace_id: 'MB_WORKSPACE_MOCK_001',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  },

  // Simulates MessageBird message send response
  messageSent: {
    message_id: 'MB_MSG_MOCK_' + Math.random().toString(36).substr(2, 9),
    status: 'ACCEPTED',
    to: '',
    body: '',
    created_at: new Date().toISOString(),
  },

  // Simulates MessageBird template send response
  templateSent: {
    message_id: '',
    template_name: '',
    status: 'ACCEPTED',
    to: '',
    created_at: new Date().toISOString(),
  },

  // Simulates MessageBird failure
  errors: {
    invalidAccessKey: {
      error: 'invalid_access_key',
      error_description: 'The provided access key is not valid',
      error_code: 5001,
    },
    templateSendFailed: {
      error: 'template_send_failed',
      error_description: 'Failed to send template via MessageBird',
      error_code: 5003,
    },
  },
};