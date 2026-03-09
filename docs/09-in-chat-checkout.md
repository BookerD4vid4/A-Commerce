# 9. การสั่งซื้อผ่าน Chatbot (In-Chat Checkout)

## ภาพรวม

ผู้ใช้สามารถสั่งซื้อสินค้าครบทุกขั้นตอนผ่าน Chatbot โดยไม่ต้องออกจากหน้าต่างแชทเลย

---

## ขั้นตอนทั้งหมด

### ขั้นตอนที่ 1: เพิ่มสินค้าผ่านแชท

ผู้ใช้พิมพ์: `"เอามาม่าต้มยำ 1 ซอง"`

1. ระบบค้นหาสินค้า "มาม่าต้มยำ"
2. เจอสินค้า → ตรวจสอบ Variant
   - **มี 1 ขนาด:** เพิ่มตะกร้าอัตโนมัติ
   - **มีหลายขนาด:** แสดง ChatVariantSelector ให้เลือก
3. เพิ่มลงตะกร้าใน DB (จอง Stock ทันที)
4. แสดงข้อความ "เพิ่มลงตะกร้าแล้วค่ะ"

---

### ขั้นตอนที่ 2: เริ่ม Checkout

ผู้ใช้พิมพ์: `"ชำระเงิน"`

1. ระบบดึงข้อมูลตะกร้าจริงจาก DB
2. แสดงรายการสินค้าที่มีจริง + ยอดรวม
3. แสดง **ChatAddressSelector** — รายการที่อยู่จัดส่ง

---

### ขั้นตอนที่ 3: เลือกที่อยู่

1. ระบบโหลดที่อยู่จาก API
2. ผู้ใช้เลือกที่อยู่ + กด "ยืนยัน"
3. แสดง **ChatPaymentSelector** — เลือกวิธีชำระเงิน

---

### ขั้นตอนที่ 4: เลือกวิธีชำระเงิน

ผู้ใช้เลือก 1 ใน 2 วิธี:

#### PromptPay QR:
1. ตรวจสอบตะกร้าว่ามีสินค้า (ป้องกันตะกร้าว่าง)
2. สร้างคำสั่งซื้อ (`POST /api/orders/`)
3. สร้าง QR Code (`POST /api/payments/{id}/generate-qr`)
4. แสดง **ChatQRCode** — QR + polling ทุก 15 วินาที

#### COD (เก็บเงินปลายทาง):
1. ตรวจสอบตะกร้า
2. สร้างคำสั่งซื้อ
3. ยืนยัน COD (`POST /api/payments/{id}/confirm-cod`)
4. แสดง **ChatCODConfirm** — "สั่งซื้อสำเร็จ"

---

### ขั้นตอนที่ 5: ยืนยันการชำระ (PromptPay)

1. Polling ทุก 15 วินาที (สูงสุด 40 ครั้ง = 10 นาที)
2. **สำเร็จ:** แสดง "ชำระเงินสำเร็จ!" + ลิงก์ดูออเดอร์
3. **หมดเวลา:** แสดง "QR หมดอายุ กรุณาสั่งซื้อใหม่"

---

## แผนภาพ

```mermaid
sequenceDiagram
    participant U as User
    participant Chat as ChatPopup
    participant API as Backend
    participant DB as Database
    participant Cart as CartStore

    Note over U,Cart: Step 1: Add item via chat
    U->>Chat: "เอามาม่าต้มยำ 1 ซอง"
    Chat->>API: POST /sessions/{id}/messages
    API->>API: detect_intent() → "order"
    API->>DB: Semantic search → find product
    API->>API: Call Typhoon LLM
    API-->>Chat: {action: "add_to_cart", orderProduct, quantity: 1}
    Chat->>Cart: addToCart(variantId, 1)
    Cart->>API: POST /api/cart/items
    API->>DB: Deduct stock + add cart_item
    Chat->>Chat: Show confirmation message

    Note over U,Cart: Step 2: Checkout
    U->>Chat: "ชำระเงิน"
    Chat->>API: POST /sessions/{id}/messages
    API->>API: detect_intent() → "checkout"
    API->>DB: get_cart_summary() (real cart data)
    API->>API: Call Typhoon LLM (with real cart context)
    API-->>Chat: {action: "show_addresses", content: "...real cart items..."}

    Note over U,Cart: Step 3: Select address
    Chat->>API: GET /api/addresses
    API-->>Chat: addresses[]
    U->>Chat: Select address + confirm

    Note over U,Cart: Step 4: Select payment
    Chat->>Chat: Show ChatPaymentSelector
    U->>Chat: Click "QR PromptPay"
    Chat->>Cart: fetchCart() (verify cart not empty)
    Chat->>API: POST /api/orders/ {address_id, payment_method}
    API->>DB: Create order + clear cart
    API-->>Chat: {order_id, total_amount}

    Chat->>API: POST /api/payments/{id}/generate-qr
    API-->>Chat: {qr_code_url, amount, demo_mode}
    Chat->>Chat: Show ChatQRCode (polling starts)

    Note over U,Cart: Step 5: Payment verification
    loop Every 15s (max 40 attempts)
        Chat->>API: POST /api/payments/{id}/verify
        API-->>Chat: {paid: false}
    end
    Chat->>API: POST /api/payments/{id}/verify
    API-->>Chat: {paid: true}
    Chat->>Chat: Show "Payment successful!"
```

---

## การป้องกัน Bug ที่ใส่ไว้

| การป้องกัน | คำอธิบาย |
|-----------|----------|
| **ตรวจตะกร้าก่อนสั่ง** | fetchCart() จาก DB ก่อน createOrder ป้องกัน "ตะกร้าว่าง" |
| **ข้อมูลตะกร้าจริง** | ดึงจาก DB ไม่ใช่จากความจำ AI (ป้องกัน AI แต่งข้อมูล) |
| **isLatest guard** | ปุ่มเก่าใน history ถูก disable ไม่ให้กดซ้ำ |
| **Double-click protection** | ปุ่มถูก disable ระหว่างโหลด ป้องกันกดซ้ำ |
| **QR max attempts** | หยุด polling หลัง 10 นาที ไม่ poll ตลอดไป |
