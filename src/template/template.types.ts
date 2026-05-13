// ─────────────────────────────────────────────
// TypeScript interfaces mirroring real Meta
// WhatsApp Cloud API template message structure
// ─────────────────────────────────────────────

// Three appointment template types
export enum AppointmentTemplateType {
  CONFIRMATION = 'appointment_confirmation',
  REMINDER = 'appointment_reminder',
  CANCELLATION = 'appointment_cancellation',
}

// Appointment action type — determines which
// template gets sent from the appointment flow
export enum AppointmentType {
  CONFIRMATION = 'confirmation',
  REMINDER = 'reminder',
  CANCELLATION = 'cancellation',
}

// Template message status lifecycle
export enum TemplateMessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  FALLBACK_SENT = 'FALLBACK_SENT',
}

// WhatsApp provider
export enum TemplateProvider {
  META_WHATSAPP = 'META_WHATSAPP',
  MESSAGE_BIRD = 'MESSAGE_BIRD',
}

// Dynamic placeholders for appointment templates
export interface AppointmentTemplateParams {
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  hospital_name: string;
}

// Single parameter inside components array
// Mirrors real Meta API named parameter format
export interface TemplateParameter {
  type: 'text';
  parameter_name: string;
  text: string;
}

// Component inside template (body, header, footer)
export interface TemplateComponent {
  type: 'body' | 'header' | 'footer';
  parameters: TemplateParameter[];
}

// Full Meta Cloud API template send payload
// Mirrors: POST /{phone-number-id}/messages
export interface MetaTemplateSendPayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components: TemplateComponent[];
  };
}

// MessageBird template send payload
export interface MessageBirdTemplateSendPayload {
  to: string;
  template_name: string;
  language_code: string;
  parameters: {
    patient_name: string;
    doctor_name: string;
    appointment_date: string;
    appointment_time: string;
    hospital_name: string;
  };
}

// Status tracking record stored in memory
export interface TemplateStatusRecord {
  message_id: string;
  template_name: string;
  to: string;
  provider: TemplateProvider;
  status: TemplateMessageStatus;
  retry_count: number;
  fallback_used: boolean;
  fallback_provider?: TemplateProvider;
  created_at: string;
  updated_at: string;
}

// Webhook delivery status event from Meta
export interface MetaTemplateDeliveryEvent {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        statuses: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'failed' | 'read';
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
          }>;
        }>;
      };
      field: string;
    }>;
  }>;
}