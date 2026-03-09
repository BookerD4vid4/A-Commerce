# A-Commerce: Prompt สำหรับสั่ง Agent ใน Antigravity

## วิธีใช้
1. แนบไฟล์ `a-commerce-spec.md` เข้า project ใน Antigravity ก่อน
2. Copy prompt แต่ละ Step ไปสั่ง Agent ตามลำดับ
3. **ทำทีละ Step** อย่าข้าม — แต่ละ Step สร้าง foundation ให้ Step ถัดไป
4. ตรวจผลลัพธ์แต่ละ Step ก่อนไป Step ถัดไป
5. ถ้ามี error ให้ paste error กลับไปให้ Agent แก้

---

## STEP 0: Project Setup

```
อ่านไฟล์ a-commerce-spec.md ที่แนบมาทั้งหมดให้เข้าใจก่อน
นี่คือ spec ของระบบ a-commerce (เว็บแอปร้านโชห่วย + AI chatbot)

จากนั้นทำ project setup ตามนี้:

1. สร้าง folder structure ตามที่ระบุใน section 3 "Folder Structure"
2. Frontend: React + Vite + TypeScript + Tailwind CSS
   - ติดตั้ง dependencies: react-router-dom, zustand, axios, lucide-react
3. Backend: Python + FastAPI
   - ติดตั้ง dependencies: fastapi, uvicorn, asyncpg, pydantic, python-jose[cryptography], httpx, python-dotenv
4. สร้างไฟล์ .env.example ตาม section 10 "Environment Variables"
5. สร้างไฟล์ .env จาก .env.example โดยตั้ง DEMO_MODE=true

ยังไม่ต้องเขียน logic ใดๆ แค่ setup โครงสร้างให้พร้อม run ได้ทั้ง frontend และ backend
```

---

## STEP 1: Database Schema + Seed Data

```
อ่าน section 4 "Database Schema" จาก a-commerce-spec.md

1. สร้างไฟล์ database/schema.sql — copy SQL ทั้งหมดจาก spec รวม:
   - CREATE EXTENSION vector
   - ตาราง users, otp_requests, refresh_tokens, user_addresses
   - ตาราง categories, products, product_variants, product_embeddings
   - ตาราง carts, cart_items
   - ตาราง orders, order_items, payments, shipments
   - ตาราง chat_sessions, chat_messages, chatbot_prompts
   - ทุก INDEX ที่ระบุไว้

2. สร้างไฟล์ database/seed.sql — ข้อมูล demo:
   - Admin account: เบอร์ 0999999999, ชื่อ "ผู้ดูแลระบบ", role='admin'
   - 4 หมวดหมู่หลัก: เครื่องดื่ม, ขนมขบเคี้ยว, ของใช้ในบ้าน, อาหารสำเร็จรูป
   - หมวดหมู่ย่อยตามที่ระบุใน spec (น้ำอัดลม, น้ำผลไม้, นม, ฯลฯ)
   - สินค้าตัวอย่างอย่างน้อย 30 รายการ พร้อม variants (ราคา, สต็อก, unit, image_url placeholder)
   - ให้สินค้ามีราคาสมจริงสำหรับร้านโชห่วยไทย (เช่น น้ำอัดลม 15-25 บาท, บะหมี่กึ่งสำเร็จรูป 6-8 บาท)

3. สร้างไฟล์ backend/app/database.py — Supabase/PostgreSQL connection
   - ใช้ asyncpg สำหรับ async connection pool
   - อ่าน DATABASE_URL จาก .env
```

---

## STEP 2: Authentication Backend (OTP System)

```
อ่าน section 5.1 "Authentication — ระบบยืนยันตัวตนด้วย OTP" จาก a-commerce-spec.md อย่างละเอียด

สร้าง backend auth system ตามที่ spec ระบุ:

1. backend/app/routers/auth.py — ทุก endpoint:
   - POST /api/auth/check-phone (ตรวจเบอร์ว่ามีบัญชีหรือยัง)
   - POST /api/auth/request-otp (สร้าง OTP + rate limit 3 ครั้ง/10 นาที)
   - POST /api/auth/verify-otp (ตรวจ OTP + สร้าง JWT + refresh token)
   - POST /api/auth/register-profile (กรอกชื่อ+ที่อยู่หลัง verify)
   - POST /api/auth/refresh (ใช้ refresh token ขอ access token ใหม่)
   - POST /api/auth/logout (revoke refresh token)

2. backend/app/middleware/auth.py:
   - get_current_user — JWT guard ตรวจ access token
   - require_admin — ตรวจ role='admin'

3. backend/app/services/auth_service.py:
   - generate_otp() — DEMO_MODE=true ใช้ "123456" เสมอ
   - create_access_token() — JWT หมดอายุ 1 ชั่วโมง
   - create_refresh_token() — หมดอายุ 30 วัน
   - hash_token() — SHA-256 สำหรับเก็บ refresh token

สำคัญ:
- ใช้ Pydantic model validate ทุก request/response
- เบอร์โทรไทย: 0 นำหน้า + 10 หลัก
- OTP 6 หลัก, หมดอายุ 5 นาที, กรอกผิดได้ไม่เกิน 5 ครั้ง
- ยกเลิก OTP เก่าทุกครั้งที่ขอ OTP ใหม่
- Refresh token เก็บเป็น hash ใน DB

ใช้ code ตัวอย่างจาก spec เป็น reference แต่ปรับให้ทำงานจริงได้
```

---

## STEP 3: Authentication Frontend

```
อ่าน section 5.1 ส่วน "Frontend Implementation" และ "UI Flow Diagram" จาก a-commerce-spec.md

สร้าง auth UI ครบ 3 step:

1. frontend/src/stores/authStore.ts
   - Zustand store ตาม spec: step (phone→otp→profile→done), tokens, user info
   - เก็บ tokens ใน memory (ไม่ใช้ localStorage ตาม security practice)

2. frontend/src/services/api.ts
   - Axios instance + base URL
   - Request interceptor: แนบ JWT ทุก request
   - Response interceptor: auto refresh เมื่อ 401

3. frontend/src/components/auth/PhoneStep.tsx
   - Input เบอร์โทร (inputMode="numeric", maxLength=10)
   - กดถัดไป → เรียก check-phone → แสดงชื่อ masked ถ้ามีบัญชี
   - กดขอ OTP → เรียก request-otp → ไป OTPStep

4. frontend/src/components/auth/OTPStep.tsx
   - 6 ช่อง input แยกกัน + auto-focus ช่องถัดไป
   - Backspace กลับช่องก่อนหน้า
   - Auto-submit เมื่อกรอกครบ 6 หลัก
   - Countdown timer 5 นาที
   - ปุ่ม "ส่งรหัสใหม่" เมื่อ countdown หมด
   - แสดงจำนวนครั้งที่เหลือเมื่อกรอกผิด

5. frontend/src/components/auth/ProfileStep.tsx (เฉพาะ user ใหม่)
   - ฟอร์มกรอกชื่อ-นามสกุล (required)
   - ฟอร์มกรอกที่อยู่ (optional — มีปุ่ม "ข้ามไปก่อน")
   - ที่อยู่: address_line, ตำบล, อำเภอ, จังหวัด, รหัสไปรษณีย์

6. frontend/src/components/auth/AuthPage.tsx
   - Router ที่แสดง component ตาม step ปัจจุบัน

7. frontend/src/pages/HomePage.tsx (placeholder)
   - แสดงข้อความ "สวัสดี [ชื่อ]" หลัง login สำเร็จ
   - ปุ่ม logout

Design:
- Mobile-first, max-w-md, mx-auto
- ตัวอักษรใหญ่ (text-lg, text-xl)
- สี primary: blue-600, success: green-600
- ปุ่มใหญ่ง่ายต่อการกด (p-4, rounded-xl)
- แสดง error เป็นข้อความสีแดงใต้ input
- Loading state ทุกปุ่มที่เรียก API
```

---

## STEP 4: Product Catalog (Backend + Frontend)

```
อ่าน section 5.3, 5.9 (admin products), และ section 6.3 (AI product import) จาก a-commerce-spec.md

Backend — สร้าง product system:

1. backend/app/routers/products.py (public):
   - GET /api/products — ดูสินค้าทั้งหมด (pagination, filter by category_id, search by name)
   - GET /api/products/:id — ดูรายละเอียด + variants
   - GET /api/categories — ดู category tree (parent-child)

2. backend/app/routers/admin.py (require_admin):
   - GET /api/admin/products — ดูสินค้าทั้งหมด (รวม inactive)
   - POST /api/admin/products — เพิ่มสินค้า manual
   - POST /api/admin/products/ai-generate — เพิ่มสินค้าด้วย AI (รับ image/text → Typhoon → return JSON)
   - PUT /api/admin/products/:id — แก้ไขสินค้า + variants
   - DELETE /api/admin/products/:id — soft delete (is_active=false)
   - POST /api/admin/categories — เพิ่มหมวดหมู่
   - PUT /api/admin/categories/:id — แก้ไขหมวดหมู่
   - DELETE /api/admin/categories/:id — ลบหมวดหมู่

3. backend/app/services/product_service.py:
   - สร้าง embedding เมื่อเพิ่ม/แก้ไขสินค้า (เรียก Gemini Embedding API)
   - เก็บ embedding ลงตาราง product_embeddings
   - ถ้า AI service ล่ม → fallback: บันทึกสินค้าได้แต่ไม่มี embedding (สร้างทีหลัง)

Frontend — Customer side:

4. frontend/src/pages/ShopPage.tsx:
   - แสดง category tabs ด้านบน (แนวนอน scroll ได้)
   - Product grid (2 columns mobile, 3-4 columns desktop)
   - แต่ละ card: รูป, ชื่อ, ราคา, ปุ่ม "ใส่ตะกร้า"
   - Search bar ด้านบน
   - Loading skeleton ขณะโหลด

5. frontend/src/components/shop/ProductCard.tsx:
   - รูปสินค้า (placeholder ถ้าไม่มี)
   - ชื่อสินค้า
   - ราคา (format ฿XX.XX)
   - unit (ต่อชิ้น, ต่อกล่อง)
   - badge "หมดสต็อก" ถ้า stock=0 (สีเทา, กดไม่ได้)
   - ปุ่มเพิ่มตะกร้า

6. frontend/src/components/shop/ProductDetail.tsx (modal หรือ page):
   - รูปใหญ่
   - ชื่อ, รายละเอียด, marketing_copy
   - เลือก variant (ถ้ามีหลาย size/color)
   - ราคา + สต็อกคงเหลือ
   - ปุ่มเพิ่มจำนวน (+/-) + ปุ่มใส่ตะกร้า

Frontend — Admin side:

7. frontend/src/pages/admin/ProductsPage.tsx:
   - ตาราง: ชื่อสินค้า, หมวดหมู่, ราคา, สต็อก, สถานะ
   - ปุ่ม "เพิ่มสินค้า" → เปิด ProductForm
   - ปุ่ม แก้ไข/ลบ ในแต่ละ row
   - Filter: หมวดหมู่, สถานะ (active/inactive)
   - Search by ชื่อสินค้า

8. frontend/src/components/admin/ProductForm.tsx:
   - 2 mode: Manual + AI Generate
   - Tab "AI Import": upload รูป หรือ paste ข้อความ → กดปุ่ม "Generate with AI" → auto-fill ฟอร์ม
   - Tab "กรอกเอง": ฟอร์มเต็มรูปแบบ
   - ฟิลด์: ชื่อ, หมวดหมู่ (dropdown), รายละเอียด, คำโฆษณา, รูปภาพ
   - Variant section: เพิ่มได้หลาย variant (ราคา, SKU, สต็อก, unit, size, color)
   - ข้อมูลที่ AI สร้าง แสดง badge "AI Generated"
   - ปุ่ม "บันทึก" + "ยกเลิก"
```

---

## STEP 5: Cart System

```
อ่าน section 5.5 "Cart" จาก a-commerce-spec.md

Backend:

1. backend/app/routers/cart.py:
   - GET /api/cart — ดูตะกร้า (ดึงจาก DB + join ข้อมูลสินค้าล่าสุด)
   - POST /api/cart/items — เพิ่มสินค้า { variant_id, quantity }
   - PUT /api/cart/items/:variant_id — แก้จำนวน { quantity }
   - DELETE /api/cart/items/:variant_id — ลบสินค้า
   - POST /api/cart/sync — รับ cookie cart → merge เข้า DB cart

   สำคัญ:
   - ตรวจสต็อกทุกครั้งที่เพิ่ม/แก้ไข
   - ราคาดึงจาก DB สด ไม่ใช้จาก client
   - คำนวณราคารวมฝั่ง server

Frontend:

2. frontend/src/stores/cartStore.ts (Zustand):
   - Guest: เก็บ cart ใน state { [variant_id]: quantity }
   - Logged in: sync กับ DB
   - actions: addItem, removeItem, updateQuantity, clearCart, syncCart

3. frontend/src/components/cart/CartDrawer.tsx (slide-in จากขวา):
   - รายการสินค้าในตะกร้า
   - แต่ละ item: รูปเล็ก, ชื่อ, ราคา, ปุ่ม +/-, ปุ่มลบ
   - แสดงข้อความ "สินค้าหมดสต็อก" ถ้าสต็อก=0 (ตัวอักษรสีเทา)
   - แสดงข้อความ "ราคาเปลี่ยนแปลง" ถ้าราคาไม่ตรง
   - ยอดรวม ด้านล่าง
   - ปุ่ม "สั่งซื้อ" → ไป CheckoutPage
   - ปุ่ม "ช้อปต่อ" → ปิด drawer

4. frontend/src/components/common/CartIcon.tsx:
   - ไอคอนตะกร้า + badge จำนวนสินค้า
   - Floating button มุมขวาล่าง (ข้าง chat button)
   - กดแล้วเปิด CartDrawer
```

---

## STEP 6: Checkout & Payment

```
อ่าน section 5.6 "Orders & Checkout" และ section 5.7 "Payment" จาก a-commerce-spec.md

Backend:

1. backend/app/routers/orders.py:
   - POST /api/orders — สร้างคำสั่งซื้อ
     * ตรวจสต็อกด้วย SELECT FOR UPDATE (ป้องกัน race condition)
     * ตัดสต็อก
     * สร้าง order + order_items (snapshot ราคา ณ เวลาสั่ง)
     * ถ้า promptpay → เรียก Omise สร้าง QR charge (demo: mock QR)
     * ถ้า COD → บันทึก payment status = "cod_pending"
   - GET /api/orders — ดูคำสั่งซื้อทั้งหมดของตัวเอง (เรียงจากล่าสุด)
   - GET /api/orders/:id — ดูรายละเอียดคำสั่งซื้อ
   - POST /api/orders/:id/cancel — ยกเลิก (เฉพาะ status=pending)
     * คืนสต็อก

2. backend/app/routers/payments.py:
   - POST /api/payments/webhook — Omise webhook (demo: mock)
   - GET /api/payments/:order_id/status — ตรวจสถานะ

3. backend/app/services/payment_service.py:
   - สำหรับ demo: mock payment ที่มีปุ่ม "จำลองชำระเงินสำเร็จ"
   - สร้าง QR code จากเบอร์ PromptPay (ใช้ library qrcode)

Frontend:

4. frontend/src/pages/CheckoutPage.tsx:
   - สรุปรายการสินค้า (ชื่อ, จำนวน, ราคา)
   - เลือกที่อยู่จัดส่ง (dropdown จาก user_addresses)
   - ปุ่มเพิ่มที่อยู่ใหม่ (modal form)
   - เลือกวิธีชำระเงิน: PromptPay QR / เก็บเงินปลายทาง
   - ยอดรวมสุทธิ
   - ปุ่ม "ยืนยันคำสั่งซื้อ" (ใหญ่, สีเขียว)

5. frontend/src/pages/PaymentPage.tsx (สำหรับ PromptPay):
   - แสดง QR Code ขนาดใหญ่
   - ยอดเงินที่ต้องชำระ
   - Countdown 15 นาที
   - สำหรับ demo: ปุ่ม "จำลองชำระเงินสำเร็จ" (สีส้ม, ชัดเจน)
   - เมื่อสำเร็จ → หน้า "สั่งซื้อสำเร็จ" พร้อมเลขที่คำสั่งซื้อ

6. frontend/src/pages/OrderSuccessPage.tsx:
   - ✅ ไอคอนสำเร็จ
   - เลขที่คำสั่งซื้อ
   - สรุปยอด
   - ปุ่ม "ดูคำสั่งซื้อ" + ปุ่ม "กลับหน้าร้าน"
```

---

## STEP 7: Order Management

```
อ่าน section 5.6 "Order Tracking", section 5.8, section 5.9 (admin orders) จาก a-commerce-spec.md

Customer side:

1. frontend/src/pages/OrdersPage.tsx:
   - รายการคำสั่งซื้อทั้งหมด (เรียงจากล่าสุด)
   - แต่ละ order: เลขที่, วันที่, ยอดรวม, สถานะ (badge สี)
   - สถานะ: pending=เหลือง, confirmed=ฟ้า, preparing=ส้ม, shipping=น้ำเงิน, delivered=เขียว, cancelled=แดง
   - กดแต่ละ order → ดูรายละเอียด

2. frontend/src/pages/OrderDetailPage.tsx:
   - ข้อมูลคำสั่งซื้อ: เลขที่, วันที่, สถานะ
   - Progress bar แสดงสถานะ (pending → confirmed → preparing → shipping → delivered)
   - รายการสินค้า (ชื่อ, จำนวน, ราคา)
   - ที่อยู่จัดส่ง
   - ข้อมูลการชำระเงิน
   - เลข tracking (ถ้ามี)
   - ปุ่ม "ยกเลิกคำสั่งซื้อ" (เฉพาะ status=pending)

Admin side:

3. backend/app/routers/admin.py (เพิ่ม):
   - GET /api/admin/orders — ดูคำสั่งซื้อทั้งหมด (filter: status, payment_status, date range)
   - GET /api/admin/orders/:id — ดูรายละเอียด
   - PUT /api/admin/orders/:id/status — เปลี่ยนสถานะ { status: "preparing" }
   - PUT /api/admin/orders/:id/shipping — เพิ่มข้อมูลจัดส่ง { tracking_number, carrier }
   - POST /api/admin/orders/:id/cancel — ยกเลิก + คืนสต็อก + บันทึกเหตุผล

4. frontend/src/pages/admin/OrdersPage.tsx:
   - ตาราง: เลขที่, ลูกค้า, ยอดรวม, สถานะ, วันที่
   - Filter tabs: ทั้งหมด / รอชำระ / ชำระแล้ว / กำลังจัดส่ง / สำเร็จ / ยกเลิก
   - กดแต่ละ row → เปิด order detail

5. frontend/src/pages/admin/OrderDetailPage.tsx:
   - ข้อมูลลูกค้า (ชื่อ, เบอร์)
   - รายการสินค้า
   - ที่อยู่จัดส่ง
   - หลักฐานการชำระเงิน
   - Dropdown เปลี่ยนสถานะ
   - ฟอร์มกรอก tracking number + ชื่อขนส่ง
   - ปุ่ม "ยกเลิก + คืนเงิน" (พร้อมช่องกรอกเหตุผล)
```

---

## STEP 8: AI Chatbot

```
อ่าน section 5.4 "Chatbot", section 6.1 "Typhoon LLM", section 6.2 "Gemini Embedding", 
และ section 7 "Cost Optimization" จาก a-commerce-spec.md อย่างละเอียด

นี่คือ core feature สำคัญที่สุดของโปรเจกต์

Backend:

1. backend/app/services/ai_service.py:
   - create_embedding(text) — เรียก Gemini Embedding API สร้าง vector
   - search_products_semantic(query, top_k=3) — embed query → pgvector cosine search → ดึงราคา/สต็อกสด
   - generate_chat_response(user_message, product_context, chat_history, ...) — เรียก Typhoon API
   - ai_generate_product_data(image, text) — AI วิเคราะห์สินค้าจากรูป/ข้อความ

2. backend/app/services/chat_service.py:
   - Intent detection (rule-based ไม่ใช้ AI):
     * "สถานะ/คำสั่งซื้อ/ออเดอร์/ของถึงไหน" → order_status (ดึงจาก DB ตอบเลย)
     * "มี/ราคา/สินค้า/หา/แนะนำ/ถูก/แพง" → product_search (ใช้ semantic search + AI)
     * "ตะกร้า/เพิ่ม/ใส่/สั่ง/ซื้อ" → cart_action (action ตรง ไม่ต้องใช้ AI)
     * อื่นๆ → general (ส่ง Typhoon ตอบ)
   - ถ้า intent ไม่ต้องใช้ AI → ตอบจาก DB เลย = ประหยัด cost

3. backend/app/services/cache_service.py:
   - SimpleCache (in-memory) ตาม spec
   - Cache embedding results 5 นาที
   - Cache AI response สำหรับคำถามทั่วไป 10 นาที
   - ห้าม cache ราคา/สต็อก

4. backend/app/middleware/rate_limit.py:
   - จำกัด 30 AI requests ต่อ user ต่อวัน
   - ถ้าเกิน → ตอบว่า "วันนี้คุยกันเยอะแล้ว ลองมาใหม่พรุ่งนี้นะคะ"

5. backend/app/routers/chat.py:
   - POST /api/chat/message — processing pipeline:
     1. รับข้อความ
     2. Intent detection
     3. ถ้าเกี่ยวกับสินค้า → semantic search → ดึงราคาสด → Typhoon generate
     4. ถ้าเกี่ยวกับคำสั่งซื้อ → query DB ตอบเลย
     5. ถ้าทั่วไป → Typhoon generate (ไม่มี product context)
     6. บันทึก chat history
     7. Return response + product cards (ถ้ามี)
   - GET /api/chat/history — ดูประวัติแชท (session-based)
   - POST /api/chat/session — สร้าง session ใหม่

   Fallback เมื่อ AI ล่ม:
   - Retry 3 ครั้ง
   - ถ้า retry หมด → ตอบ "ระบบกำลังปรับปรุง กรุณาลองใหม่ภายหลัง"

Frontend:

6. frontend/src/components/chat/ChatWindow.tsx:
   - Floating button 💬 มุมขวาล่าง (ข้างไอคอนตะกร้า)
   - กดแล้วเปิด chat window (slide up / modal)
   - Header: "น้องเอ ผู้ช่วยร้านค้า" + ปุ่มปิด
   - Message area: scroll ได้, auto-scroll ลงล่าง
   - Input area: ช่องพิมพ์ + ปุ่มส่ง

7. frontend/src/components/chat/ChatBubble.tsx:
   - User message: ชิดขวา, สีฟ้า
   - Bot message: ชิดซ้าย, สีเทาอ่อน
   - Typing indicator (จุด 3 จุด) ขณะรอ AI ตอบ

8. frontend/src/components/chat/ProductCard.tsx (ใน chat):
   - การ์ดสินค้าขนาดเล็กที่แนบมากับคำตอบ AI
   - รูป, ชื่อ, ราคา, ปุ่ม "ใส่ตะกร้า"
   - แสดง 1-3 การ์ดต่อคำตอบ

System Prompt สำหรับ Typhoon (ตั้งค่าใน backend):
- ชื่อ "น้องเอ" ผู้ช่วยขายร้านโชห่วย
- ตอบภาษาไทย สุภาพ เป็นมิตร กระชับ ไม่เกิน 3 ประโยค
- ห้ามแต่งเรื่อง ต้องใช้ข้อมูลที่ให้เท่านั้น
- ถ้าไม่มีข้อมูล ให้แจ้งว่าไม่พบ
```

---

## STEP 9: Admin — Members, Chatbot Settings, Reports

```
อ่าน section 5.9 "Admin APIs" จาก a-commerce-spec.md

Backend:

1. backend/app/routers/admin.py (เพิ่ม):
   สมาชิก:
   - GET /api/admin/users — ดูสมาชิกทั้งหมด (search by ชื่อ/เบอร์, pagination)
   - PUT /api/admin/users/:id — แก้ไข role, is_active
   - DELETE /api/admin/users/:id — soft delete

   แชทบอท:
   - GET /api/admin/chatbot/prompts — ดู prompt ทั้งหมด (group by category)
   - PUT /api/admin/chatbot/prompts/:id — แก้ไข prompt
   - POST /api/admin/chatbot/prompts — เพิ่ม prompt ใหม่
   - POST /api/admin/chatbot/test — ทดสอบ prompt (ส่งไป Typhoon แล้ว return ผลลัพธ์)

   รายงาน:
   - GET /api/admin/reports/sales?start_date=&end_date= — ยอดขายตามช่วงเวลา
   - GET /api/admin/reports/top-products?limit=10 — สินค้าขายดี
   - GET /api/admin/reports/overview — dashboard: ยอดขายวันนี้, คำสั่งซื้อใหม่, สินค้าใกล้หมด

2. SQL สำหรับรายงาน:
   - ยอดขายรวม: SUM(total_amount) FROM orders WHERE status != 'cancelled' AND created_at BETWEEN
   - สินค้าขายดี: JOIN order_items GROUP BY product_name ORDER BY SUM(quantity) DESC
   - Overview: COUNT orders today, SUM amount today, COUNT products WHERE stock < low_stock_threshold

Frontend:

3. frontend/src/pages/admin/MembersPage.tsx:
   - ตาราง: ชื่อ, เบอร์โทร, role, สถานะ, วันที่สมัคร
   - Search bar
   - ปุ่มเปลี่ยน role (user↔admin)
   - ปุ่มระงับ/เปิดใช้งาน
   - ปุ่มลบ (ยืนยันก่อน)

4. frontend/src/pages/admin/ChatbotSettingsPage.tsx:
   - แสดงรายการหมวดหมู่
   - กดหมวดหมู่ → แสดง Category Prompt (textarea แก้ไขได้)
   - แสดงสินค้าในหมวดนั้น → เลือกสินค้า → ใส่ Specific Instruction
   - ปุ่ม "ทดสอบ" → เปิด chat window จำลองด้านข้าง
   - ปุ่ม "บันทึก"
   - ปุ่ม "คืนค่าเริ่มต้น"

5. frontend/src/pages/admin/DashboardPage.tsx:
   - Card: ยอดขายวันนี้ (฿), คำสั่งซื้อใหม่ (จำนวน), สมาชิกทั้งหมด, สินค้าใกล้หมดสต็อก
   - กราฟยอดขาย 7 วัน (ใช้ recharts: LineChart)
   - ตาราง: สินค้าขายดี top 5

6. frontend/src/pages/admin/ReportsPage.tsx:
   - Filter: ช่วงวันที่ (date picker), หมวดหมู่สินค้า
   - ปุ่ม "ดึงรายงาน"
   - ตาราง: รายการคำสั่งซื้อ, ยอดรวม, สถานะ
   - กราฟแท่ง: ยอดขายรายวัน (ใช้ recharts: BarChart)
   - สรุป: ยอดขายรวม, จำนวนคำสั่งซื้อ, ค่าเฉลี่ยต่อคำสั่งซื้อ
```

---

## STEP 10: Admin Layout + Routing + Profile Page

```
สร้าง layout และ routing ให้ครบ:

1. frontend/src/components/admin/AdminLayout.tsx:
   - Sidebar ซ้าย (desktop) / Bottom nav (mobile):
     * 📊 Dashboard
     * 📦 จัดการสินค้า
     * 📋 คำสั่งซื้อ
     * 👥 สมาชิก
     * 🤖 ตั้งค่าแชทบอท
     * 📈 รายงาน
   - Header: ชื่อร้าน + ชื่อ admin + ปุ่ม logout
   - Content area ขวา

2. frontend/src/pages/ProfilePage.tsx (customer):
   - แสดงข้อมูล: ชื่อ, เบอร์โทร
   - ปุ่มแก้ไขชื่อ
   - รายการที่อยู่ (เพิ่ม/แก้ไข/ลบ/ตั้งเป็นค่าเริ่มต้น)
   - ปุ่ม "คำสั่งซื้อของฉัน" → ไป OrdersPage
   - ปุ่ม "ลบบัญชี" (สีแดง, ยืนยัน 2 ครั้ง)
   - ปุ่ม logout

3. frontend/src/App.tsx — React Router:
   Public routes (ไม่ต้อง login):
   - / → HomePage (แสดงสินค้า + chat)
   - /shop → ShopPage
   - /auth → AuthPage

   Protected routes (ต้อง login):
   - /cart → CartPage
   - /checkout → CheckoutPage
   - /payment/:orderId → PaymentPage
   - /orders → OrdersPage
   - /orders/:id → OrderDetailPage
   - /profile → ProfilePage

   Admin routes (ต้อง login + role=admin):
   - /admin → DashboardPage
   - /admin/products → ProductsPage
   - /admin/orders → AdminOrdersPage
   - /admin/orders/:id → AdminOrderDetailPage
   - /admin/members → MembersPage
   - /admin/chatbot → ChatbotSettingsPage
   - /admin/reports → ReportsPage

4. frontend/src/components/common/ProtectedRoute.tsx:
   - ตรวจ accessToken → ถ้าไม่มี redirect /auth
   - ตรวจ role=admin สำหรับ admin routes → ถ้าไม่ใช่ redirect /

5. frontend/src/components/common/CustomerLayout.tsx:
   - Header: ชื่อร้าน + ไอคอนโปรไฟล์ + ไอคอนตะกร้า
   - Floating buttons: 💬 Chat + 🛒 Cart
   - Bottom: nav bar (mobile) — หน้าแรก / ร้านค้า / คำสั่งซื้อ / โปรไฟล์
```

---

## STEP 11: Polish & Demo Preparation

```
ขั้นตอนสุดท้าย — ทำให้ระบบพร้อม demo ให้อาจารย์:

1. Error Handling ทุกหน้า:
   - แสดงข้อความ error ที่เข้าใจง่าย (ภาษาไทย)
   - Loading spinner/skeleton ทุกจุดที่เรียก API
   - Empty state ทุกรายการที่อาจไม่มีข้อมูล ("ยังไม่มีคำสั่งซื้อ")
   - Network error: "ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่"

2. Responsive ทุกหน้า:
   - Mobile (375px) ต้องใช้งานได้สมบูรณ์
   - ตัวอักษรอย่างน้อย 16px (target user สูงอายุ)
   - ปุ่มใหญ่พอกดบนมือถือ (min 44x44px)

3. Chatbot Fallback:
   - ถ้า Typhoon API ล่ม → ตอบ template: "ขออภัยค่ะ ระบบกำลังปรับปรุง"
   - ถ้า Gemini API ล่ม → fallback เป็น SQL LIKE search แทน semantic search
   - ถ้า rate limit หมด → แจ้ง user อย่างสุภาพ

4. Demo Scenario — เตรียม flow ที่แน่ใจว่าทำงานได้:
   Flow 1 - ลูกค้าใหม่:
   - สมัครเบอร์ใหม่ → OTP 123456 → กรอกชื่อ → เข้าหน้าร้าน
   - แชท: "มีน้ำอัดลมอะไรบ้าง" → AI ตอบ + แสดง product cards
   - เพิ่มตะกร้า → checkout → PromptPay → จำลองชำระเงิน → สำเร็จ
   - แชท: "ของฉันถึงไหนแล้ว" → แสดงสถานะ

   Flow 2 - ลูกค้าเดิม:
   - Login เบอร์เดิม → OTP 123456 → เข้าหน้าร้าน
   - ดูคำสั่งซื้อเก่า → ดู tracking

   Flow 3 - Admin:
   - Login เบอร์ 0999999999 → OTP 123456 → Admin Dashboard
   - เพิ่มสินค้าด้วย AI → ตรวจสอบ → บันทึก
   - จัดการคำสั่งซื้อ → เปลี่ยนสถานะ → ใส่ tracking
   - ดูรายงานยอดขาย

5. สร้าง README.md:
   - วิธี setup project
   - วิธี run frontend + backend
   - วิธีสร้าง database + seed data
   - Demo accounts + OTP code
   - Environment variables ที่ต้องตั้ง
```

---

## Tips สำหรับการใช้งาน

1. **ทำทีละ Step** — อย่า copy หลาย Step ไปพร้อมกัน Agent จะสับสน
2. **ตรวจงานทุก Step** — run ดูว่าทำงานได้จริงก่อนไป Step ถัดไป
3. **ถ้า error** — copy error message ทั้งหมดส่งให้ Agent แก้
4. **ถ้าผลลัพธ์ไม่ตรงใจ** — อธิบายเพิ่มเป็นภาษาไทยได้เลยว่าอยากได้แบบไหน
5. **Step 8 (AI Chatbot) ต้องมี API key จริง** — ถ้ายังไม่มี ให้ Agent สร้าง mock response ก่อน แล้วค่อยต่อ API จริงทีหลัง
6. **ไฟล์ a-commerce-spec.md คือ source of truth** — ถ้า Agent ถามอะไร ให้ชี้ไปที่ spec
