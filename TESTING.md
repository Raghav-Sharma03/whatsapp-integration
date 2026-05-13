# WhatsApp Doctor Appointment Bot — Testing Documentation

**Project:** NestJS WhatsApp Bot Backend  
**Intern:** Raghav Sharma @ PearlThoughts  
**Date:** May 2026  
**API Base URL:** `http://localhost:3000`

---

## Table of Contents

1. [Test Suites Overview](#1-test-suites-overview)
2. [How to Run Tests](#2-how-to-run-tests)
3. [API Endpoint Reference](#3-api-endpoint-reference)
4. [Scenario Walkthroughs with curl](#4-scenario-walkthroughs-with-curl)
   - 4.1 Book Appointment (step by step)
   - 4.2 Cancel by Booking ID
   - 4.3 View Appointments
   - 4.4 Check Available Slots
   - 4.5 Edge Cases
5. [Sample Request & Response JSON](#5-sample-request--response-json)
6. [Doctor Reference](#6-doctor-reference)
7. [Postman Instructions](#7-postman-instructions)

---

## 1. Test Suites Overview

| File | Suite | Tests | Status |
|------|-------|-------|--------|
| `intent/intent.service.spec.ts` | IntentService | 15 |  All passing |
| `slot/slot.service.spec.ts` | SlotService | varies |  All passing |
| `bot/bot.service.spec.ts` | BotService | 113 total |  All passing |

### BotService Test Groups

| Group | What it covers |
|-------|---------------|
| Book Appointment Flow | Full booking, multi-turn context, duplicate prevention, past date, unknown doctor |
| Cancel Appointment Flow | Cancel by ID, cancel by time, invalid ID, already cancelled |
| View Appointments Flow | Empty list, single booking, multiple bookings |
| Check Slots Flow | Available slots, doctor unavailable on day, two-turn flow (doctor → date) |
| Edge Cases | Direct service validation for duplicate, past date, daily limit |

### Key Design Decisions Tested

- **Timezone safety** — all dates use local constructor (`new Date(y, m-1, d)`) not `new Date('YYYY-MM-DD')` to avoid IST UTC-offset shift
- **Intent order** — CANCEL checked before BOOK so "cancel appointment" isn't misclassified
- **Duplicate check order** — duplicate detected before slot-availability check (same slot = already yours, not "unavailable")
- **Carry-forward intent** — UNKNOWN message with date entity continues a CHECK_SLOTS or BOOK flow if session has doctor context
- **Confirmation flow** — "yes"/"ok"/"sure" maps to BOOK intent and auto-confirms the `suggested_slot` stored in session

---

## 2. How to Run Tests

### Prerequisites

```bash
cd E:\Placement\PearlThought Internship\whatsapp-integration
```

### Run all tests

```bash
npm run test
```

### Run a specific test file

```bash
npm run test -- intent.service.spec
npm run test -- slot.service.spec
npm run test -- bot.service.spec
```

### Run with verbose output (see each test name)

```bash
npm run test -- --verbose
```

### Run with coverage report

```bash
npm run test -- --coverage
```

### Run in watch mode (re-runs on file save)

```bash
npm run test -- --watch
```

### Build before testing (recommended after changes)

```bash
npm run build && npm run test
```

---

## 3. API Endpoint Reference

### POST /bot/message

The single entry point for all bot interactions.

**URL:** `http://localhost:3000/bot/message`  
**Method:** POST  
**Content-Type:** application/json

#### Request Body

```json
{
  "user_phone": "string",   // User's phone number (acts as unique user ID)
  "message": "string"       // Natural language message from user
}
```

#### Response Body

```json
{
  "reply": "string",              // Bot's response message (shown to user)
  "intent": "string",             // Detected intent (BOOK_APPOINTMENT | CANCEL_APPOINTMENT | VIEW_APPOINTMENTS | CHECK_SLOTS | UNKNOWN)
  "entities": {
    "doctor_name": "string|null", // Extracted doctor name
    "specialization": "string|null",
    "date": "YYYY-MM-DD|null",
    "time": "HH:MM|null",
    "booking_id": "string|null"
  },
  "session_context": {
    "doctor_id": "string|null",
    "specialization": "string|null",
    "date": "string|null",
    "time": "string|null",
    "booking_id": "string|null",
    "suggested_slot": { "date": "string", "time": "string" } // null if none
  },
  "data": {}                      // Appointment object(s) if applicable, else null
}
```

#### Intent Values

| Intent | Triggered by |
|--------|-------------|
| `BOOK_APPOINTMENT` | "book", "appointment", "schedule", "consult", "doctor", "yes/ok/sure" |
| `CANCEL_APPOINTMENT` | "cancel", "reschedule", "remove", "delete booking" |
| `VIEW_APPOINTMENTS` | "show", "view", "my appointments", "upcoming" |
| `CHECK_SLOTS` | "slots", "availability", "available", "check", "when is" |
| `UNKNOWN` | Anything unrecognised |

---

## 4. Scenario Walkthroughs with curl

> **Start the server first:**
> ```bash
> npm run start
> ```
> **Kill port if needed:**
> ```bash
> npx kill-port 3000
> ```

---

### 4.1 Book Appointment (Step by Step)

The bot uses multi-turn conversation. You can provide all info in one message or build it up across messages.

#### Option A — All info in one message

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9111111111\",\"message\":\"book appointment with dr rajesh tomorrow at 9 AM\"}"
```

#### Option B — Multi-turn (doctor → date → time)

**Turn 1: State intent and doctor**
```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9222222222\",\"message\":\"I want to book an appointment with Dr Priya\"}"
```
Bot replies: asks for date.

**Turn 2: Provide date**
```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9222222222\",\"message\":\"Monday\"}"
```
Bot replies: shows available time slots.

**Turn 3: Provide time**
```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9222222222\",\"message\":\"10:30 AM\"}"
```
Bot replies: confirms booking with Booking ID.

#### Option C — Book by specialization

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9333333333\",\"message\":\"I have a skin problem, need a doctor\"}"
```
Bot automatically routes to Dermatology (Dr. Rajesh Mehta).

#### Accepted date formats

| Input | Resolves to |
|-------|-------------|
| "today" | Current date |
| "tomorrow" / "tmrw" | Current date + 1 |
| "day after tomorrow" | Current date + 2 |
| "monday" / "tuesday" etc. | Next occurrence of that weekday |
| "next week" | Current date + 7 |
| "15th may" / "3 june" | Specific date in current/next year |

#### Accepted time formats

| Input | Resolves to |
|-------|-------------|
| "9 AM" / "10:30 AM" | 09:00 / 10:30 |
| "2 PM" / "5:30 PM" | 14:00 / 17:30 |
| "morning" | 09:00 |
| "afternoon" | 14:00 |
| "evening" | 17:00 |
| "noon" / "midday" | 12:00 |
| "14:30" (24hr) | 14:30 |

---

### 4.2 Cancel Appointment

#### Cancel by Booking ID (recommended)

Replace `APT_XXXXXX` with the actual booking ID from your booking confirmation.

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9111111111\",\"message\":\"cancel APT_XXXXXX\"}"
```

#### Cancel by time (when you don't have the ID)

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9111111111\",\"message\":\"cancel my 9 AM appointment\"}"
```

#### Cancel without specifying which appointment

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9111111111\",\"message\":\"cancel my appointment\"}"
```
Bot replies: lists all your upcoming appointments with IDs. Then send the ID.

---

### 4.3 View Appointments

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9111111111\",\"message\":\"show my appointments\"}"
```

Variations that also work:
```bash
-d "{\"user_phone\":\"9111111111\",\"message\":\"view my bookings\"}"
-d "{\"user_phone\":\"9111111111\",\"message\":\"my upcoming appointments\"}"
-d "{\"user_phone\":\"9111111111\",\"message\":\"what appointments do i have\"}"
```

---

### 4.4 Check Available Slots

#### Single message (doctor + date)

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9444444444\",\"message\":\"available slots for dr rajesh on monday\"}"
```

#### Two-turn (doctor first, then date)

**Turn 1:**
```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9444444444\",\"message\":\"check slots for dr vikram\"}"
```

**Turn 2:**
```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9444444444\",\"message\":\"tuesday\"}"
```

---

### 4.5 Edge Cases

#### Past date booking attempt

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9555555555\",\"message\":\"book appointment with dr rajesh on 1st january at 9 AM\"}"
```
Expected reply: Cannot book an appointment in the past.

#### Unknown doctor name

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9555555555\",\"message\":\"book appointment with dr batman\"}"
```
Expected reply: Doctor not found — lists all available doctors.

#### Doctor unavailable on requested day

Dr. Anil Verma works Tuesday–Saturday. Requesting Monday:

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9555555555\",\"message\":\"book with dr anil on monday at 11 AM\"}"
```
Expected reply: Not available on Monday + suggests next available date + alternative doctor.

#### Slot already taken — smart fallback

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9555555555\",\"message\":\"book with dr rajesh tomorrow at 9 AM\"}"
```
If 9 AM is taken, bot replies with next available slot and asks "Reply yes to confirm."

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9555555555\",\"message\":\"yes\"}"
```
Bot auto-confirms the suggested slot.

#### Duplicate booking

Booking the exact same doctor + date + time twice returns:
> "You already have an appointment with [Doctor] on [date] at [time]."

#### Cancel non-existent booking ID

```bash
curl -X POST http://localhost:3000/bot/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_phone\":\"9555555555\",\"message\":\"cancel APT_FAKE99\"}"
```
Expected reply: No appointment found with booking ID APT_FAKE99.

#### Cancel another user's appointment

If phone `9111111111` tries to cancel a booking that belongs to `9222222222`:
Expected reply: This appointment does not belong to your account.

#### Typo handling

```bash
-d "{\"user_phone\":\"9666666666\",\"message\":\"buk appoinment wit dr rajesh tmrw at 9am\"}"
```
Works correctly — IntentService handles common typos.

---

## 5. Sample Request & Response JSON

### Successful Booking

**Request:**
```json
{
  "user_phone": "9111111111",
  "message": "book appointment with dr rajesh tomorrow at 9 AM"
}
```

**Response:**
```json
{
  "reply": "✅ Appointment confirmed with Dr. Rajesh Mehta on Monday, 18 May 2026 at 9:00 AM. Booking ID: APT_XY7Z2K\n\nSave your booking ID — you'll need it to cancel. Reply \"my appointments\" to view all bookings.",
  "intent": "BOOK_APPOINTMENT",
  "entities": {
    "doctor_name": "rajesh",
    "specialization": null,
    "date": "2026-05-18",
    "time": "09:00",
    "booking_id": null
  },
  "session_context": {
    "doctor_id": null,
    "specialization": null,
    "date": null,
    "time": null,
    "booking_id": null,
    "suggested_slot": null
  },
  "data": {
    "booking_id": "APT_XY7Z2K",
    "user_phone": "9111111111",
    "doctor_id": "DOC_001",
    "doctor_name": "Dr. Rajesh Mehta",
    "specialization": "Dermatology",
    "date": "2026-05-18",
    "time": "09:00",
    "status": "CONFIRMED",
    "created_at": "2026-05-14T10:00:00.000Z",
    "updated_at": "2026-05-14T10:00:00.000Z"
  }
}
```

### Booking — Missing Time (bot asks)

**Request:**
```json
{
  "user_phone": "9222222222",
  "message": "book with dr priya on monday"
}
```

**Response:**
```json
{
  "reply": "What time would you prefer with Dr. Priya Sharma on Monday, 18 May 2026? ⏰\n\nAvailable slots: 10:00 AM, 10:30 AM, 11:00 AM, 11:30 AM, 12:00 PM",
  "intent": "BOOK_APPOINTMENT",
  "entities": {
    "doctor_name": "priya",
    "specialization": null,
    "date": "2026-05-18",
    "time": null,
    "booking_id": null
  },
  "session_context": {
    "doctor_id": "DOC_002",
    "date": "2026-05-18",
    "time": null
  },
  "data": null
}
```

### Successful Cancellation

**Request:**
```json
{
  "user_phone": "9111111111",
  "message": "cancel APT_XY7Z2K"
}
```

**Response:**
```json
{
  "reply": "✅ Your appointment with Dr. Rajesh Mehta on Monday, 18 May 2026 at 9:00 AM has been cancelled.",
  "intent": "CANCEL_APPOINTMENT",
  "entities": {
    "booking_id": "APT_XY7Z2K"
  },
  "session_context": {},
  "data": null
}
```

### View Appointments

**Request:**
```json
{
  "user_phone": "9111111111",
  "message": "show my appointments"
}
```

**Response:**
```json
{
  "reply": "Your upcoming appointments: 📋\n\n• APT_XY7Z2K — Dr. Rajesh Mehta (Dermatology)\n  📅 Monday, 18 May 2026 at 9:00 AM",
  "intent": "VIEW_APPOINTMENTS",
  "entities": {},
  "session_context": {},
  "data": [
    {
      "booking_id": "APT_XY7Z2K",
      "doctor_name": "Dr. Rajesh Mehta",
      "specialization": "Dermatology",
      "date": "2026-05-18",
      "time": "09:00",
      "status": "CONFIRMED"
    }
  ]
}
```

### Slot Unavailable — Smart Fallback

**Request:**
```json
{
  "user_phone": "9333333333",
  "message": "book with dr rajesh tomorrow at 9 AM"
}
```

**Response (if 9 AM taken):**
```json
{
  "reply": "❌ The slot at 9:00 AM is not available. Next available slot: 9:30 AM.\n\n💡 Next available: Monday, 18 May 2026 at 9:30 AM. Reply \"yes\" to confirm.",
  "intent": "BOOK_APPOINTMENT",
  "session_context": {
    "doctor_id": "DOC_001",
    "date": "2026-05-18",
    "suggested_slot": {
      "date": "2026-05-18",
      "time": "09:30"
    }
  },
  "data": null
}
```

### Past Date Error

**Request:**
```json
{
  "user_phone": "9444444444",
  "message": "book appointment with dr rajesh on 1st january at 9 AM"
}
```

**Response:**
```json
{
  "reply": "❌ Cannot book an appointment in the past. Please choose today or a future date.",
  "intent": "BOOK_APPOINTMENT",
  "data": null
}
```

---

## 6. Doctor Reference

| ID | Name | Specialization | Days | Hours | Slot | Daily Limit | Break |
|----|------|---------------|------|-------|------|-------------|-------|
| DOC_001 | Dr. Rajesh Mehta | Dermatology | Mon–Sat | 09:00–13:00 | 30 min | 8 | None |
| DOC_002 | Dr. Priya Sharma | Cardiology | Mon–Fri | 10:00–14:00 | 30 min | 8 | None |
| DOC_003 | Dr. Anil Verma | Orthopedics | Tue–Sat | 11:00–15:00 | 30 min | 8 | 13:00–13:30 |
| DOC_004 | Dr. Sunita Rao | Pediatrics | Mon–Fri | 09:00–12:00 | 20 min | 9 | None |
| DOC_005 | Dr. Vikram Singh | General Physician | Mon–Sat | 08:00–17:00 | 15 min | 12 | 13:00–14:00 |

**Specialization keywords** (for natural language booking):

| Keywords | Routes to |
|----------|-----------|
| skin, acne, rash, eczema, hair fall, dermat | Dermatology → Dr. Rajesh |
| heart, cardio, chest pain, blood pressure, bp | Cardiology → Dr. Priya |
| bone, joint, knee, back pain, fracture, ortho | Orthopedics → Dr. Anil |
| child, kids, baby, infant, pediatric | Pediatrics → Dr. Sunita |
| fever, cold, cough, flu, stomach, headache, general | General Physician → Dr. Vikram |

---

## 7. Postman Instructions

### Import as a Collection

1. Open Postman → click **Import**
2. Select **Raw Text** and paste the JSON below
3. Click **Import**

```json
{
  "info": {
    "name": "WhatsApp Doctor Bot",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Book — All in one",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/bot/message",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\"user_phone\":\"9111111111\",\"message\":\"book appointment with dr rajesh tomorrow at 9 AM\"}"
        }
      }
    },
    {
      "name": "Book — Turn 1 (doctor only)",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/bot/message",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\"user_phone\":\"9222222222\",\"message\":\"book with dr priya\"}"
        }
      }
    },
    {
      "name": "Book — Turn 2 (date)",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/bot/message",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\"user_phone\":\"9222222222\",\"message\":\"monday\"}"
        }
      }
    },
    {
      "name": "Book — Turn 3 (time)",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/bot/message",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\"user_phone\":\"9222222222\",\"message\":\"10:30 AM\"}"
        }
      }
    },
    {
      "name": "Confirm suggested slot",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/bot/message",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\"user_phone\":\"9333333333\",\"message\":\"yes\"}"
        }
      }
    },
    {
      "name": "Cancel by ID",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/bot/message",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\"user_phone\":\"9111111111\",\"message\":\"cancel APT_XXXXXX\"}"
        }
      }
    },
    {
      "name": "View appointments",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/bot/message",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\"user_phone\":\"9111111111\",\"message\":\"show my appointments\"}"
        }
      }
    },
    {
      "name": "Check slots",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/bot/message",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\"user_phone\":\"9444444444\",\"message\":\"available slots for dr vikram on tuesday\"}"
        }
      }
    },
    {
      "name": "Edge — Past date",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/bot/message",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\"user_phone\":\"9555555555\",\"message\":\"book with dr rajesh on 1st january at 9 AM\"}"
        }
      }
    },
    {
      "name": "Edge — Unknown doctor",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/bot/message",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\"user_phone\":\"9555555555\",\"message\":\"book appointment with dr batman\"}"
        }
      }
    },
    {
      "name": "Edge — Doctor unavailable on day",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/bot/message",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\"user_phone\":\"9555555555\",\"message\":\"book with dr anil on monday at 11 AM\"}"
        }
      }
    },
    {
      "name": "Edge — Cancel invalid ID",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/bot/message",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\"user_phone\":\"9555555555\",\"message\":\"cancel APT_FAKE99\"}"
        }
      }
    }
  ]
}
```

### Environment Setup in Postman

1. Click **Environments** → **Add**
2. Name it `Bot Local`
3. Add variable: `base_url` = `http://localhost:3000`
4. Replace hardcoded URL in each request with `{{base_url}}/bot/message`

### Testing Flow in Postman

Run requests in this order to test the full happy path:
1. **Book — All in one** → note the `booking_id` in response
2. **View appointments** → confirm booking appears
3. **Cancel by ID** → paste the booking_id from step 1 into the message
4. **View appointments** → confirm list is empty

---

*End of TESTING.md*