# A-Commerce

ระบบพาณิชย์อิเล็กทรอนิกส์อัตโนมัติสำหรับร้านโชห่วย พร้อม AI Chatbot

## โครงสร้างโปรเจกต์

```
a-commerce/
├── frontend/          # React + Vite + TypeScript + Tailwind CSS
├── backend/           # Python + FastAPI
├── database/          # Schema & Seed files
└── docs/              # Documentation
```

## การติดตั้งและรัน

### Frontend

```bash
cd frontend
npm install
npm run dev
```

เปิดเว็บที่ http://localhost:5173

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
python -m app.main
```

API จะรันที่ http://localhost:8000

## Tech Stack

**Frontend:**

- React + Vite
- TypeScript
- Tailwind CSS
- React Router
- Zustand (state management)
- Axios (HTTP client)
- Lucide React (icons)

**Backend:**

- Python + FastAPI
- PostgreSQL + pgvector (Supabase)
- AsyncPG
- Pydantic
- JWT Authentication

**AI:**

- Typhoon 2.5 LLM (chatbot)
- Gemini Embedding API (semantic search)

**Payment:**

- Omise (PromptPay QR + COD)

## Environment Variables

สร้างไฟล์ `.env` ใน backend/ โดย copy จาก `.env.example`

สำหรับ demo ใช้:

- `DEMO_MODE=true` (OTP จะเป็น "123456" เสมอ)
- เบอร์ Admin: `0999999999`

## Features

- 🔐 OTP Authentication (ไม่มี password)
- 🛍️ Product Catalog
- 🤖 AI Chatbot (semantic search + LLM)
- 🛒 Shopping Cart
- 💳 Payment (PromptPay QR / COD)
- 📦 Order Management
- 👨‍💼 Admin Panel

## Development Status

✅ STEP 0: Project Setup (สมบูรณ์)
⏳ STEP 1: Database Schema + Seed Data (กำลังดำเนินการ)

## License

MIT
