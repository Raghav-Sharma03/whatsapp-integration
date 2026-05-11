# WhatsApp Integration — Meta Embedded Signup + MessageBird (Mock Flow)

A NestJS + TypeScript mock implementation of Meta WhatsApp Embedded Signup flow and MessageBird WhatsApp integration, with a feature toggle to switch between providers.

---

## 👨 Built By
**Raghav Sharma** — Backend Developer Intern, PearlThoughts  
**Task Assigned By:** Tharun Kumar (Team Lead)  
**Date:** 11th May 2026

---

##  Live Demo
Server runs locally on: `http://localhost:3000`

---

##  Tech Stack
- NestJS + TypeScript
- Node.js v24
- dotenv / @nestjs/config

---

##  Setup Instructions

### 1. Clone the repo
```bash
git clone https://github.com/Raghav-Sharma03/whatsapp-integration.git
cd whatsapp-integration
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
```bash
cp .env.example .env
```

### 4. Start the server
```bash
npm run start
```

Server will start at `http://localhost:3000`

---

##  Feature Toggle

Control which WhatsApp provider is active by setting this in your `.env` file:

```env
# Switch between providers:
WHATSAPP_PROVIDER=META_WHATSAPP   # Use Meta Embedded Signup flow
WHATSAPP_PROVIDER=MESSAGE_BIRD    # Use MessageBird flow
```

Restart the server after changing the value. No code changes needed.

---

##  API Endpoints

###  Meta Embedded Signup Flow

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/meta/signup/initiate` | Start Embedded Signup — returns auth_url + session_id |
| POST | `/meta/signup/callback` | Complete signup — returns code + waba_id + phone_number_id |
| POST | `/meta/token/exchange` | Exchange code for business access token |
| POST | `/meta/phone/register` | Register phone number for Cloud API |
| POST | `/meta/webhook/subscribe` | Subscribe app to WABA webhooks |

###  Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhook/meta` | Meta webhook verification (hub challenge) |
| POST | `/webhook/meta` | Receive incoming webhook events |
| POST | `/webhook/meta/simulate` | Simulate an incoming webhook event |

###  MessageBird Flow

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/messagebird/connect` | Connect MessageBird channel |
| POST | `/messagebird/send-message` | Send WhatsApp message via MessageBird |

###  Unified Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/whatsapp/provider` | Check which provider is currently active |
| POST | `/whatsapp/send-appointment` | Send appointment message via active provider |

---

##  Simulate Failure Scenarios

Add `?simulate=failure` to these endpoints to trigger error responses:

POST /meta/signup/callback?simulate=failure     → user_cancelled
POST /meta/token/exchange?simulate=failure      → invalid_code
POST /meta/phone/register?simulate=failure      → phone_already_registered
POST /messagebird/connect?simulate=failure      → invalid_access_key
POST /messagebird/send-message?simulate=failure → invalid_access_key
POST /whatsapp/send-appointment?simulate=failure → provider error

---

##  Sample Postman Request Bodies

### POST `/meta/token/exchange`
```json
{
  "code": "AQD3_MOCK_EXCHANGEABLE_CODE_abc123xyz"
}
```

### POST `/meta/phone/register`
```json
{
  "phone_number_id": "987654321098765",
  "access_token": "EAABwzLixnjYBO_MOCK_BUSINESS_TOKEN_abc123"
}
```

### POST `/meta/webhook/subscribe`
```json
{
  "waba_id": "123456789012345",
  "access_token": "EAABwzLixnjYBO_MOCK_BUSINESS_TOKEN_abc123"
}
```

### POST `/messagebird/send-message`
```json
{
  "to": "919876543210",
  "body": "Your appointment is confirmed for tomorrow at 10 AM."
}
```

### POST `/whatsapp/send-appointment`
```json
{
  "to": "919876543210",
  "patient_name": "Raghav Sharma",
  "doctor_name": "Mehta",
  "appointment_date": "12th May 2026",
  "appointment_time": "10:30 AM"
}
```

### GET `/webhook/meta` (Webhook Verification)
http://localhost:3000/webhook/meta?hub.mode=subscribe&hub.verify_token=MOCK_VERIFY_TOKEN_xyz789&hub.challenge=CHALLENGE_ABC123

##  Project Structure
src/
├── config/
│   └── provider.config.ts       # Feature toggle logic
├── common/
│   └── mock-data.ts             # All mock responses
├── meta/
│   ├── meta.service.ts          # Meta Embedded Signup logic
│   └── meta.controller.ts       # Meta endpoints
├── messagebird/
│   ├── messagebird.service.ts   # MessageBird logic
│   └── messagebird.controller.ts
├── webhook/
│   ├── webhook.service.ts       # Webhook verification + events
│   └── webhook.controller.ts
├── whatsapp/
│   ├── whatsapp.service.ts      # Provider router
│   └── whatsapp.controller.ts
├── app.module.ts
└── main.ts

##  How Meta Embedded Signup Works (Real Flow)

User clicks "Login with Facebook" button
↓
Facebook popup opens (JS SDK)
↓
User completes signup → Meta returns:
{ code, waba_id, phone_number_id }
↓
Server exchanges code → business access_token
↓
Server registers phone number for Cloud API
↓
Server subscribes app to WABA webhooks
↓
Business can now send/receive WhatsApp messages


##  Important Notes

- This is a **mock/stub implementation** — no real Meta or MessageBird credentials are used
- All tokens, IDs, and responses are simulated
- The webhook verification uses `MOCK_VERIFY_TOKEN_xyz789` from `.env`
- In production, replace all `MOCK_` values with real credentials from Meta Business Manager

---

##  References

- [Meta Embedded Signup Documentation](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview/)
- [Meta WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/overview/)
- [MessageBird API Docs](https://docs.bird.com)