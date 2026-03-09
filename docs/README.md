# A-Commerce Documentation

เอกสารประกอบระบบ A-Commerce — ร้านค้าออนไลน์สำหรับร้านสะดวกซื้อพร้อม AI Chatbot

---

## Data Flow Diagrams (DFD)

แผนภาพการไหลของข้อมูลตามมาตรฐาน DFD แบ่งเป็น 3 ระดับ:

| ระดับ | เอกสาร | เนื้อหา |
|-------|--------|---------|
| Level 0 | [Context Diagram](DFD-Level0-Context.md) | ภาพรวมทั้งระบบ + External Entities ทั้งหมด |
| Level 1 | [Main Processes](DFD-Level1-Main.md) | 6 Process หลัก (P1-P6) + 7 Data Stores (D1-D7) |
| Level 2 | [P1 — Authentication](DFD-Level2-Auth.md) | ตรวจเบอร์, ส่ง OTP, ยืนยัน, ต่ออายุ Token |
| Level 2 | [P2+P3 — Product & Cart](DFD-Level2-ProductCart.md) | ค้นหาสินค้า, ตะกร้า, จอง Stock, คืน Stock |
| Level 2 | [P4 — Order & Payment](DFD-Level2-OrderPayment.md) | สร้าง Order, QR Code, ตรวจชำระ, COD |
| Level 2 | [P5 — AI Chatbot](DFD-Level2-Chatbot.md) | Session, Intent, Semantic Search, LLM, Action |
| Level 2 | [P6 — Admin](DFD-Level2-Admin.md) | Dashboard, CRUD สินค้า, จัดการออเดอร์/สมาชิก/AI |

---

## เอกสารประกอบ (Supplementary Docs)

คำอธิบายรายละเอียดแต่ละส่วน พร้อมตาราง, Sequence Diagram, ER Diagram:

| ลำดับ | เอกสาร | เนื้อหา |
|-------|--------|---------|
| 1 | [ภาพรวมระบบ](01-system-overview.md) | สถาปัตยกรรม, เทคโนโลยี, บริการภายนอก |
| 2 | [เส้นทางหน้าเว็บ](02-frontend-routes.md) | หน้าลูกค้า, หน้าแอดมิน, User Journey |
| 3 | [ระบบยืนยันตัวตน](03-authentication.md) | OTP Login, Token Refresh, ความปลอดภัย |
| 4 | [การเรียกดูสินค้า](04-product-browsing.md) | ค้นหาสินค้า, Variant, AI Semantic Search |
| 5 | [ระบบตะกร้าสินค้า](05-cart-management.md) | Guest/DB Cart, Stock Reservation, Sync |
| 6 | [ระบบสั่งซื้อ](06-checkout-and-orders.md) | Checkout, สถานะ Order, สถานะ Payment |
| 7 | [ระบบชำระเงิน](07-payment.md) | PromptPay QR, COD, Polling, Demo Mode |
| 8 | [AI Chatbot](08-ai-chatbot.md) | Intent Detection, Semantic Search, LLM, Actions |
| 9 | [สั่งซื้อผ่าน Chatbot](09-in-chat-checkout.md) | ขั้นตอนครบวงจร, การป้องกัน Bug |
| 10 | [ระบบแอดมิน](10-admin-panel.md) | Dashboard, จัดการสินค้า/ออเดอร์/สมาชิก/AI |
| 11 | [โครงสร้างฐานข้อมูล](11-database-schema.md) | ตารางทั้งหมด, ER Diagram |
| 12 | [สถาปัตยกรรม Frontend](12-frontend-architecture.md) | Components, State Management (Zustand) |

---

## เทคโนโลยีหลัก

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | React + Vite 7 + TypeScript + Tailwind CSS v4 |
| Backend | Python + FastAPI + asyncpg |
| Database | PostgreSQL + pgvector (Supabase) |
| AI Chat | Typhoon LLM (Thai) + Gemini Embeddings |
| Payment | Omise (PromptPay QR) |
| Auth | OTP via SMS + JWT |
