import os
import httpx
from fastapi import FastAPI, Request, HTTPException, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from twilio.rest import Client as TwilioClient
from dotenv import load_dotenv
import json

load_dotenv()

app = FastAPI(title="HyperLocal Delivery Aggregator API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Twilio Setup
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")
TWILIO_CONTENT_SID = os.getenv("TWILIO_CONTENT_SID")
UPI_ID = os.getenv("UPI_ID", "yourname@upi")
twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Other Config
OLLAMA_URL = "http://localhost:11434/api/generate"
MENU = {
    "Coffee": 150,
    "Tea": 100,
    "Muffin": 120,
    "Sandwich": 200,
    "Cappuccino": 180,
    "Latte": 170
}

# Simple In-Memory State Store (For Demo)
user_states = {} # phone -> state

async def extract_order_with_ollama(text: str):
    """
    Uses Ollama (phi3:mini) to extract order details from plain text.
    """
    prompt = f"""Extract order JSON from: "{text}"
    Price List: Coffee=150, Tea=100, Muffin=120, Sandwich=200, Cappuccino=180, Latte=170.
    JSON format:
    {{
        "items": [{{ "name": "string", "qty": 1, "price": 0 }}],
        "delivery_address": "string"
    }}
    If NO items are found, return "items": [].
    IMPORTANT: Use EXACTLY the key "name" for item names.
    """
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(OLLAMA_URL, json={
                "model": "phi3:mini",
                "prompt": prompt,
                "format": "json",
                "stream": False,
                "options": {"temperature": 0}
            })
            
            if response.status_code != 200:
                print(f"Ollama Status Error: {response.status_code} - {response.text}")
                return None
                
            result = response.json()
            raw_response = result.get("response", "")
            print(f"Ollama Raw Response: {raw_response}")
            return json.loads(raw_response)
        except Exception as e:
            print(f"Ollama Exception: {e}")
            return None

@app.get("/")
async def root():
    return {"message": "HyperLocal Delivery API is running"}

@app.post("/webhook")
async def handle_webhook(
    Body: str = Form(...),
    From: str = Form(...),
    ProfileName: str = Form("Customer")
):
    """
    Production-grade WhatsApp ordering flow.
    """
    user_phone = From.replace("whatsapp:", "")
    msg = Body.strip()
    msg_upper = msg.upper()
    
    # Get current user state (default to IDLE)
    state_data = user_states.get(user_phone, {"state": "IDLE"})
    state = state_data["state"]

    print(f"[{user_phone}] Current State: {state} | Message: {msg}")

    # --- GLOBAL COMMANDS ---
    if msg_upper in ["MENU", "ITEMS", "LIST"]:
        user_states[user_phone] = {"state": "AWAITING_ORDER"}
        menu_text = "\n".join([f"• {item} — ₹{price}" for item, price in MENU.items()])
        twilio_client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=f"📜 *OUR MENU*\n\n{menu_text}\n\n💡 *How to order:*\nSimply type what you want, e.g.,\n_\"2 Cappuccinos and a Muffin\"_",
            to=From
        )
        return {"status": "menu_sent"}

    if msg_upper in ["HI", "HII", "HELLO", "HEY", "START"]:
        user_states[user_phone] = {"state": "AWAITING_ORDER_CONFIRMATION"}
        twilio_client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=(
                f"👋 *Welcome to Parcelo Cafe!*\n\n"
                f"Hi {ProfileName}! It's great to see you. Would you like to order something delicious today?\n\n"
                f"1️⃣ *Yes, please!*\n"
                f"2️⃣ *No, maybe later*"
            ),
            to=From
        )
        return {"status": "greeted"}

    # --- STATE MACHINE ---

    # 1. AWAITING YES/NO
    if state == "AWAITING_ORDER_CONFIRMATION":
        if msg == "1" or "YES" in msg_upper:
            user_states[user_phone] = {"state": "AWAITING_ORDER"}
            menu_text = "\n".join([f"• {item} — ₹{price}" for item, price in MENU.items()])
            twilio_client.messages.create(
                from_=TWILIO_WHATSAPP_NUMBER,
                body=f"📜 *PERFECT! HERE IS OUR MENU*\n\n{menu_text}\n\n📝 *Just type your order below!*",
                to=From
            )
            return {"status": "menu_sent"}
        elif msg == "2" or "NO" in msg_upper:
            user_states[user_phone] = {"state": "IDLE"}
            twilio_client.messages.create(
                from_=TWILIO_WHATSAPP_NUMBER,
                body="No problem! I'll be here if you get hungry later. Have a wonderful day! ✨",
                to=From
            )
            return {"status": "idle"}

    # 2. AWAITING ORDER (PARSING)
    if state == "AWAITING_ORDER":
        extracted_data = await extract_order_with_ollama(msg)
        
        if not extracted_data or not extracted_data.get("items"):
            twilio_client.messages.create(
                from_=TWILIO_WHATSAPP_NUMBER,
                body="🤔 *I didn't quite catch that.*\n\nPlease tell me what you'd like to eat or drink! (e.g., _'2 Lattes'_) Or type *MENU* to see options.",
                to=From
            )
            return {"status": "extraction_failed"}

        # Validate Items
        items_to_save = []
        for item in extracted_data["items"]:
            match = next((k for k in MENU.keys() if k.lower() in item.get('name', '').lower()), None)
            if match:
                items_to_save.append({"name": match, "qty": item.get('qty', 1), "price": MENU[match]})

        if not items_to_save:
            twilio_client.messages.create(
                from_=TWILIO_WHATSAPP_NUMBER,
                body="❌ *Oops!* We don't have those items today. Please check the *MENU* and try again! 📜",
                to=From
            )
            return {"status": "invalid_items"}

        # Calculate Totals
        total = sum([i['price'] * i['qty'] for i in items_to_save])
        items_text = "\n".join([f"• {i['qty']} x {i['name']} — ₹{i['price'] * i['qty']}" for i in items_to_save])
        
        # Store draft order in state
        user_states[user_phone] = {
            "state": "ORDER_CAPTURED",
            "draft_order": {
                "items": items_to_save,
                "total": total,
                "address": extracted_data.get("delivery_address", "TBD")
            }
        }

        twilio_client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=(
                f"🛒 *ORDER SUMMARY*\n\n"
                f"{items_text}\n"
                f"━━━━━━━━━━━━━━\n"
                f"*Total Amount: ₹{total}*\n\n"
                f"✅ *Confirm this order?*\n\n"
                f"1️⃣ *Yes, Confirm & Pay*\n"
                f"2️⃣ *No, Edit Order*"
            ),
            to=From
        )
        return {"status": "order_captured"}

    # 3. ORDER CONFIRMATION
    if state == "ORDER_CAPTURED":
        if msg == "1" or "CONFIRM" in msg_upper or "YES" in msg_upper:
            draft = state_data["draft_order"]
            
            # Save to Supabase
            order_to_save = {
                "customer_name": ProfileName,
                "customer_phone": user_phone,
                "items": draft["items"],
                "subtotal": draft["total"],
                "grand_total": draft["total"],
                "delivery_address": draft["address"],
                "status": "PENDING_PAYMENT"
            }
            response = supabase.table("orders").insert(order_to_save).execute()
            order_id = response.data[0]['id']
            
            # Generate UPI Link
            upi_link = f"upi://pay?pa={UPI_ID}&pn=Parcelo&am={draft['total']}&cu=INR&tn=Order_{order_id[:8]}"
            
            user_states[user_phone] = {"state": "PAYMENT_PENDING", "order_id": order_id}
            
            twilio_client.messages.create(
                from_=TWILIO_WHATSAPP_NUMBER,
                body=(
                    f"📦 *ORDER CONFIRMED!*\n\n"
                    f"Order ID: #{order_id[:8]}\n"
                    f"━━━━━━━━━━━━━━\n"
                    f"💳 *PAYMENT REQUIRED*\n\n"
                    f"Click the link to pay via UPI:\n{upi_link}\n\n"
                    f"💡 *Once done, click below:*\n"
                    f"👉 *1. I'VE PAID*"
                ),
                to=From
            )
            return {"status": "awaiting_payment"}
        
        elif msg == "2" or "EDIT" in msg_upper:
            user_states[user_phone] = {"state": "AWAITING_ORDER"}
            twilio_client.messages.create(
                from_=TWILIO_WHATSAPP_NUMBER,
                body="🔄 *No problem!* Tell me again what you'd like to order.",
                to=From
            )
            return {"status": "back_to_order"}

    # 4. PAYMENT CONFIRMATION
    if state == "PAYMENT_PENDING":
        if msg == "1" or any(x in msg_upper for x in ["PAID", "DONE", "YES", "OK"]):
            order_id = state_data["order_id"]
            supabase.table("orders").update({"status": "PENDING_DELIVERY"}).eq("id", order_id).execute()
            user_states[user_phone] = {"state": "IDLE"}
            
            twilio_client.messages.create(
                from_=TWILIO_WHATSAPP_NUMBER,
                body=(
                    f"🎊 *PAYMENT RECEIVED!*\n\n"
                    f"Thank you {ProfileName}! Your order is being prepared with love. ☕✨\n\n"
                    f"We'll notify you once it's out for delivery!"
                ),
                to=From
            )
            return {"status": "paid"}

    # --- FALLBACK ---
    twilio_client.messages.create(
        from_=TWILIO_WHATSAPP_NUMBER,
        body=(
            f"😅 *Oops, I didn't get that.*\n\n"
            f"Type *MENU* to see what's cooking, or say *HI* to start over!"
        ),
        to=From
    )
    return {"status": "fallback"}

@app.post("/notify-dispatch")
async def notify_dispatch(order_id: str, partner: str = "Uber", tracking_link: str = "https://track.uber.com/demo"):
    """
    Enhanced Dispatch Notification.
    """
    try:
        order = supabase.table("orders").select("*").eq("id", order_id).single().execute()
        if not order.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        customer_phone = order.data["customer_phone"]
        
        message = (
            f"🚀 *YOUR ORDER IS ON THE WAY!*\n\n"
            f"Great news! We've dispatched your order via *{partner}*.\n\n"
            f"📍 *TRACK HERE:*\n{tracking_link}\n\n"
            f"Enjoy your order! 😄✨"
        )
        
        twilio_client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=message,
            to=f"whatsapp:{customer_phone}"
        )
        
        return {"status": "notified"}
    except Exception as e:
        print(f"Dispatch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
