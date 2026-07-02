# Parcelo — HyperLocal Delivery Aggregator

Parcelo is a **B2B2C order-taking and delivery-dispatch platform** built for local cafes and shops. Customers order naturally over WhatsApp; the shop owner sees it live on a Kanban dashboard and dispatches a Rapido/Uber Direct rider — all in one flow.

---

## Architecture

The full flow has five stages. Each stage hands off to the next with zero manual glue.

### Stage 1 — Customer orders on WhatsApp

The customer sends a natural-language message (e.g. *"2 coffees and a sandwich to 14 MG Road"*) to the shop's WhatsApp number, powered by the **Twilio WhatsApp Sandbox**.

### Stage 2 — FastAPI receives and parses

Twilio fires a `POST /webhook` to the **FastAPI** backend. FastAPI sends the raw message + the shop's menu as plain text context to **Ollama (phi3:mini)**, which returns a structured JSON array of items and quantities.

```
"2 coffees and a sandwich" → [{"item": "Coffee", "qty": 2}, {"item": "Sandwich", "qty": 1}]
```

### Stage 3 — Confirmation + UPI payment

FastAPI calculates the total, assembles an order summary, and sends it back to the customer over WhatsApp with a **UPI deep link** (direct to the shop's UPI ID — no payment gateway). The customer pays and confirms.

### Stage 4 — Supabase + Live Dashboard

On payment confirmation, FastAPI inserts the order into **Supabase PostgreSQL** with status `PENDING`. Supabase Realtime fires a WebSocket event to the **Next.js dashboard**, and the order card appears on the Kanban board instantly — no refresh needed.

The shop owner moves the card across columns: `Pending → Preparing → Ready → Dispatched`.

### Stage 5 — Delivery dispatch

When the owner clicks **Dispatch**, the dashboard calls the **Rapido B2B / Uber Direct API** to assign a rider. The tracking link is sent back to the customer over WhatsApp automatically.

---

## Flow at a glance

```
Customer (WhatsApp)
    │
    │  natural language order
    ▼
Twilio WhatsApp Sandbox  ──POST /webhook──►  FastAPI
                                               │
                                               │  menu + message
                                               ▼
                                         Ollama (phi3:mini)
                                               │
                                               │  structured JSON
                                               ▼
                                            FastAPI
                                               │
                                               │  order summary + UPI link
                                               ▼
                                       Customer pays (UPI)
                                               │
                                               ▼
                                       FastAPI  ──INSERT──►  Supabase
                                                                  │
                                                           WebSocket event
                                                                  ▼
                                                          Next.js Dashboard
                                                         (Kanban: live update)
                                                                  │
                                                         Owner clicks Dispatch
                                                                  ▼
                                                      Rapido B2B / Uber Direct API
                                                                  │
                                                           tracking link
                                                                  ▼
                                                       Customer (WhatsApp)
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python), httpx |
| Database | Supabase (PostgreSQL + Realtime WebSockets) |
| AI / LLM | Ollama (phi3:mini) |
| Messaging | Twilio WhatsApp Sandbox |
| Delivery | Rapido B2B, Uber Direct API |

---

## Features

- **WhatsApp-first ordering** — customers order in plain language, no app download required
- **AI-powered parsing** — menu + message → clean JSON in one local API call via Ollama (no vector DB needed)
- **UPI deep link payments** — money goes directly to the shop's UPI ID, zero gateway fees
- **Live Kanban board** — orders appear in real time via Supabase Realtime WebSockets
- **One-click dispatch** — Rapido B2B / Uber Direct triggered from the dashboard; tracking sent to customer automatically

---

## Database Schema (Supabase)

Run this in the Supabase SQL Editor to set up the `orders` table and enable Realtime:

```sql
create table orders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  customer_name text not null,
  customer_phone text not null,
  items jsonb not null,
  subtotal numeric not null,
  grand_total numeric not null,
  delivery_address text not null,
  latitude numeric,
  longitude numeric,
  status text default 'PENDING_DELIVERY'
);

alter publication supabase_realtime add table orders;
```

---

## Setup

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_WHATSAPP_NUMBER=whatsapp:+<your-twilio-number>
UPI_ID=yourshop@upi
```

Start the server:

```bash
uvicorn main:app --reload
```

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

### 3. Expose webhook for local testing

Use ngrok to expose FastAPI to the internet so Twilio can reach it:

```bash
ngrok http 8000
```

Copy the HTTPS URL and set it as the webhook in your Twilio Console -> WhatsApp Sandbox Settings:

```
https://<ngrok-url>/webhook
```

---

## How to Use

### Customer flow (WhatsApp)

1. Send `Hi` or `Menu` to the shop's Twilio WhatsApp Sandbox number
2. Receive the menu with prices
3. Send a natural order: *"I want 2 Cappuccinos and 1 Brownie to 42 Jubilee Hills"*
4. Receive order summary → tap the UPI link → pay
5. Receive a tracking link once the rider is assigned

### Shop owner flow (Dashboard)

1. Open the dashboard — orders appear live as customers pay
2. Move orders across columns: **Pending → Preparing → Ready**
3. Click **Dispatch** to trigger Rapido B2B / Uber Direct and send the tracking link to the customer

---

## Why Parcelo matters

Small cafes and local shops in India lose orders every day because they don't have the budget for a Zomato storefront or a custom app. Parcelo flips that — a shop needs nothing more than a WhatsApp number and a UPI ID to go live. Customers order the way they already text, payments go directly to the shop with zero gateway cut, and deliveries get dispatched without the owner juggling three different apps. It's the infrastructure that neighbourhood businesses never had access to, built lean enough to actually work for them.

---

## Contact

Built with ❤️ for local businesses in Hyderabad.

Have feedback, want to collaborate, or thinking of onboarding your shop?

Reach out at **katukuri.varunsai@gmail.com** — always happy to chat.
