# A-Commerce

ระบบ E-Commerce สำหรับร้านโชห่วย พร้อม AI Chatbot ภาษาไทย

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4 |
| Backend | Python, FastAPI, AsyncPG, Pydantic |
| Database | PostgreSQL + pgvector (Supabase) |
| AI Chatbot | Typhoon v2 LLM + Gemini Embedding API |
| State | Zustand 5 |
| Auth | JWT + OTP (ไม่ใช้ password) |

## โครงสร้างโปรเจกต์

```
a-commerce/
├── frontend/          # React + Vite + TypeScript + Tailwind v4
├── backend/           # Python + FastAPI + AsyncPG
├── database/          # SQL schema & seed data
└── docs/              # Documentation & DFD diagrams
```

## Features

**ลูกค้า**
- OTP Login ผ่านเบอร์โทร (ไม่ต้องใช้ password)
- เรียกดูสินค้า + ค้นหา + กรองตามหมวดหมู่
- ตะกร้าสินค้า พร้อมระบบ Stock Reservation (hold 30 นาที)
- สั่งซื้อ + เลือกที่อยู่จัดส่ง + ชำระเงิน (PromptPay QR / COD)
- ดูประวัติคำสั่งซื้อ + ติดตามสถานะ

**AI Chatbot**
- แชทภาษาไทยด้วย Typhoon LLM
- Semantic Search สินค้าด้วย Gemini Embedding + pgvector
- เพิ่มสินค้าลงตะกร้า + สั่งซื้อผ่านแชทได้
- รองรับทั้ง guest และ logged-in users

**Admin**
- Dashboard สรุปยอดขาย
- จัดการสินค้า (เพิ่ม/แก้ไข/ลบ + อัพโหลดรูป)
- จัดการคำสั่งซื้อ + อัปเดตสถานะ (pending > confirmed > preparing > shipping > delivered)
- รายงานยอดขาย (รายวัน/รายสัปดาห์/รายเดือน) + สินค้าขายดี Top 10
- จัดการสมาชิก (เปลี่ยน role / ระงับบัญชี)
- ตั้งค่า Chatbot System Prompt

## การติดตั้ง

### Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL (หรือ Supabase account)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cp .env.example .env         # แก้ไขค่าใน .env
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env         # แก้ไขค่าใน .env
npm run dev
```

### Database

รัน SQL files ใน `database/` ตามลำดับ:
1. `schema.sql` — สร้างตาราง
2. `seed.sql` — ข้อมูลตัวอย่าง

หรือใช้ `final-setup.sql` สำหรับรันทุกอย่างในครั้งเดียว

## Environment Variables

Copy `.env.example` เป็น `.env` ทั้งใน `backend/` และ `frontend/`

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key สำหรับ sign JWT |
| `DEMO_MODE` | `true` = OTP เป็น "123456" เสมอ |
| `TYPHOON_API_KEY` | API key สำหรับ Typhoon LLM |
| `GEMINI_API_KEY` | API key สำหรับ Gemini Embedding |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

## API Endpoints

| Method | Path | คำอธิบาย |
|--------|------|----------|
| POST | `/api/auth/request-otp` | ขอ OTP |
| POST | `/api/auth/verify-otp` | ยืนยัน OTP + login |
| GET | `/api/products` | รายการสินค้า |
| GET | `/api/cart` | ดูตะกร้า |
| POST | `/api/cart/items` | เพิ่มสินค้าลงตะกร้า |
| POST | `/api/orders` | สร้างคำสั่งซื้อ |
| POST | `/api/chat/send` | ส่งข้อความแชท |
| GET | `/api/admin/dashboard` | Admin dashboard |

API docs: `http://localhost:8000/docs`

## Demo Account

เมื่อ `DEMO_MODE=true`:
- เบอร์ Admin: `0999999999`
- OTP: `123456` (ใช้ได้กับทุกเบอร์)

## License

MIT
