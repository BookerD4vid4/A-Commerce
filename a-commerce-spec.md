# A-Commerce: ระบบพาณิชย์อิเล็กทรอนิกส์อัตโนมัติ

## สารบัญ

1. [ภาพรวมโปรเจกต์](#1-ภาพรวมโปรเจกต์)
2. [Tech Stack](#2-tech-stack)
3. [สถาปัตยกรรมระบบ](#3-สถาปัตยกรรมระบบ)
4. [Database Schema](#4-database-schema)
5. [Features & API Endpoints](#5-features--api-endpoints)
6. [AI Integration](#6-ai-integration)
7. [Cost Optimization Strategy](#7-cost-optimization-strategy)
8. [UI/UX Guidelines](#8-uiux-guidelines)
9. [Development Phases](#9-development-phases)
10. [หมายเหตุสำหรับ Agent](#10-หมายเหตุสำหรับ-agent)

---

## 1. ภาพรวมโปรเจกต์

### จุดมุ่งหมาย
ระบบ a-commerce เป็นเว็บแอปพลิเคชันสำหรับร้านโชห่วยในชุมชนท้องถิ่น ใช้ **แชทบอท AI** เป็นช่องทางหลักในการสื่อสารกับลูกค้า ออกแบบมาให้ง่ายต่อการใช้งานสำหรับผู้ใช้วัยกลางคน-สูงอายุ

### กลุ่มผู้ใช้
- **ลูกค้า (User)**: สั่งซื้อสินค้า, แชทกับบอท, ติดตามคำสั่งซื้อ
- **ผู้ดูแล (Admin)**: จัดการสินค้า, คำสั่งซื้อ, สมาชิก, ตั้งค่าแชทบอท, ดูรายงาน

### ขอบเขต Demo
เนื่องจากเป็นโปรเจกต์ส่งอาจารย์ ให้เน้นทำ **core flow ให้สมบูรณ์**:
1. ลูกค้าเปิดเว็บ → แชทกับบอทถามสินค้า → เพิ่มตะกร้า → สั่งซื้อ → ชำระเงิน
2. Admin จัดการสินค้า (เพิ่มด้วย AI + manual) → จัดการคำสั่งซื้อ → ดูรายงาน
3. Chatbot ทำ semantic search + ตอบคำถามด้วย LLM

---

## 2. Tech Stack

### Frontend
```
Framework    : React (Vite) + TypeScript
Styling      : Tailwind CSS
State        : Zustand หรือ React Context
Routing      : React Router v6
HTTP Client  : Axios
Chat UI      : Custom component (ไม่ต้องใช้ lib ภายนอก)
```

### Backend
```
Runtime      : Node.js (Express.js) หรือ Python (FastAPI)
ORM          : Prisma (Node.js) หรือ SQLAlchemy (Python)
Validation   : Zod (Node.js) หรือ Pydantic (Python)
Auth         : JWT + OTP via SMS API (หรือ mock OTP สำหรับ demo)
```

> **แนะนำ**: ใช้ **Python + FastAPI** เพราะ AI integration กับ Typhoon/Gemini จะสะดวกกว่า

### Database & Infrastructure
```
Database     : PostgreSQL
BaaS         : Supabase (Auth, Storage, Realtime, pgvector)
Vector Store : pgvector extension บน Supabase
File Storage : Supabase Storage (รูปสินค้า)
Deployment   : Vercel (FE) + Railway/Render (BE) หรือ Supabase Edge Functions
```

### AI Services
```
LLM              : Typhoon 2.5 (SCB 10X) — ตอบแชท, generate ข้อมูลสินค้า
Embedding        : Gemini Embedding API — สร้าง vector สำหรับ semantic search
Vector Search    : pgvector (cosine similarity) บน Supabase
```

### Payment
```
Payment Gateway  : Omise (PromptPay QR + COD)
```

---

## 3. สถาปัตยกรรมระบบ

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Chat UI  │  │ Shop UI  │  │ Cart UI  │  │  Admin Panel │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
└───────┼──────────────┼──────────────┼───────────────┼────────┘
        │              │              │               │
        ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY (FastAPI)                      │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌────────────┐ │
│  │ /api/chat  │ │/api/products│ │/api/orders│ │ /api/admin │ │
│  └─────┬──────┘ └─────┬──────┘ └─────┬────┘ └─────┬──────┘ │
│        │              │              │             │         │
│  ┌─────▼──────────────▼──────────────▼─────────────▼──────┐ │
│  │              SERVICE LAYER                              │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │ │
│  │  │ ChatSvc  │  │ ProductSvc│  │ OrderSvc │             │ │
│  │  │(AI Logic)│  │(CRUD+AI) │  │(Payment) │             │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘             │ │
│  └───────┼──────────────┼──────────────┼──────────────────┘ │
└──────────┼──────────────┼──────────────┼────────────────────┘
           │              │              │
     ┌─────▼─────┐  ┌────▼────┐   ┌────▼─────┐
     │ Typhoon   │  │ Gemini  │   │  Omise   │
     │ LLM API   │  │Embedding│   │ Payment  │
     └───────────┘  └────┬────┘   └──────────┘
                         │
              ┌──────────▼──────────┐
              │   PostgreSQL        │
              │   (Supabase)        │
              │  ┌───────────────┐  │
              │  │  pgvector     │  │
              │  │  (embeddings) │  │
              │  └───────────────┘  │
              └─────────────────────┘
```

### Folder Structure (แนะนำ)
```
a-commerce/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/           # ChatWindow, ChatBubble, ChatInput
│   │   │   ├── shop/           # ProductCard, ProductList, ProductDetail
│   │   │   ├── cart/           # CartDrawer, CartItem, CartSummary
│   │   │   ├── order/          # OrderList, OrderDetail, OrderTracking
│   │   │   ├── admin/          # AdminLayout, Dashboard, ProductForm
│   │   │   └── common/         # Button, Input, Modal, Loading
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── ShopPage.tsx
│   │   │   ├── CartPage.tsx
│   │   │   ├── CheckoutPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── admin/
│   │   │       ├── DashboardPage.tsx
│   │   │       ├── ProductsPage.tsx
│   │   │       ├── OrdersPage.tsx
│   │   │       ├── MembersPage.tsx
│   │   │       ├── ChatbotSettingsPage.tsx
│   │   │       └── ReportsPage.tsx
│   │   ├── hooks/
│   │   ├── services/           # API call functions
│   │   ├── stores/             # Zustand stores
│   │   ├── types/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app entry
│   │   ├── config.py           # Environment variables
│   │   ├── database.py         # Supabase/DB connection
│   │   ├── models/             # SQLAlchemy/Pydantic models
│   │   │   ├── user.py
│   │   │   ├── product.py
│   │   │   ├── order.py
│   │   │   └── chat.py
│   │   ├── routers/            # API routes
│   │   │   ├── auth.py
│   │   │   ├── products.py
│   │   │   ├── cart.py
│   │   │   ├── orders.py
│   │   │   ├── chat.py
│   │   │   ├── admin.py
│   │   │   └── reports.py
│   │   ├── services/           # Business logic
│   │   │   ├── ai_service.py       # Typhoon + Gemini wrapper
│   │   │   ├── auth_service.py     # OTP, JWT, token management
│   │   │   ├── sms_service.py      # SMS gateway (mock for demo)
│   │   │   ├── chat_service.py     # Chatbot logic
│   │   │   ├── product_service.py
│   │   │   ├── order_service.py
│   │   │   ├── payment_service.py  # Omise integration
│   │   │   └── cache_service.py    # Redis/in-memory cache
│   │   ├── middleware/
│   │   │   ├── auth.py
│   │   │   └── rate_limit.py
│   │   └── utils/
│   │       ├── prompt_templates.py  # AI prompt templates
│   │       └── helpers.py
│   ├── requirements.txt
│   └── .env.example
│
├── database/
│   ├── migrations/
│   ├── schema.sql
│   └── seed.sql                # ข้อมูล demo สินค้า
│
└── docs/
    └── api.md
```

---

## 4. Database Schema

### Enable Extensions (Supabase)
```sql
CREATE EXTENSION IF NOT EXISTS vector;  -- สำหรับ pgvector
```

### Core Tables

```sql
-- =============================================
-- 1. USERS & AUTH
-- =============================================

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(200),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,   -- ยืนยัน OTP สำเร็จอย่างน้อย 1 ครั้ง
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE otp_requests (
    otp_id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,        -- 6 หลักเท่านั้น
    purpose VARCHAR(20) NOT NULL         -- 'register' | 'login' | 'reset'
        CHECK (purpose IN ('register', 'login', 'reset')),
    expires_at TIMESTAMPTZ NOT NULL,     -- หมดอายุใน 5 นาที
    is_used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,              -- นับจำนวนครั้งที่กรอกผิด (max 5)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ป้องกัน OTP spam: index สำหรับ query rate limit
CREATE INDEX idx_otp_phone_created ON otp_requests(phone_number, created_at DESC);

-- Refresh Token สำหรับ JWT rotation
CREATE TABLE refresh_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,     -- SHA-256 hash ของ refresh token
    device_info TEXT,                     -- Browser/Device fingerprint (optional)
    expires_at TIMESTAMPTZ NOT NULL,      -- 30 วัน
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

CREATE TABLE user_addresses (
    address_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    recipient_name VARCHAR(200),
    phone_number VARCHAR(20),
    address_line TEXT NOT NULL,
    subdistrict VARCHAR(150),
    district VARCHAR(150),
    province VARCHAR(150),
    postal_code VARCHAR(10),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. PRODUCTS & CATALOG
-- =============================================

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    parent_id INT REFERENCES categories(category_id) ON DELETE SET NULL,
    prompt_template TEXT,           -- Category-level AI prompt
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    marketing_copy TEXT,            -- AI-generated คำโฆษณา
    category_id INT REFERENCES categories(category_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_variants (
    variant_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    image_url TEXT,
    unit VARCHAR(50),               -- ลักษณะนาม เช่น "ชิ้น", "กล่อง", "ขวด"
    size VARCHAR(50),
    color VARCHAR(50),
    low_stock_threshold INT DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Embedding สำหรับ Semantic Search
CREATE TABLE product_embeddings (
    embedding_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    embedding vector(768),          -- Gemini embedding dimension
    text_content TEXT,              -- ข้อความที่ใช้สร้าง embedding (ชื่อ+รายละเอียด+โฆษณา)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. CART (Cookie-based + DB sync เมื่อ login)
-- =============================================

CREATE TABLE carts (
    cart_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INT REFERENCES carts(cart_id) ON DELETE CASCADE,
    variant_id INT REFERENCES product_variants(variant_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    UNIQUE(cart_id, variant_id)     -- ป้องกัน duplicate
);

-- =============================================
-- 4. ORDERS & PAYMENTS
-- =============================================

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    shipping_address_id INT REFERENCES user_addresses(address_id),
    total_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled')),
    payment_status VARCHAR(50) DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'paid', 'cod_pending', 'refunded')),
    cancel_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    variant_id INT REFERENCES product_variants(variant_id),
    product_name VARCHAR(200),      -- snapshot ชื่อสินค้า ณ เวลาสั่งซื้อ
    price DECIMAL(10,2) NOT NULL,   -- snapshot ราคา ณ เวลาสั่งซื้อ
    quantity INT NOT NULL
);

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    method VARCHAR(100) NOT NULL CHECK (method IN ('promptpay_qr', 'cod')),
    amount DECIMAL(10,2) NOT NULL,
    transaction_ref TEXT,           -- Omise charge ID
    omise_source_id TEXT,
    paid_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'successful', 'failed', 'expired'))
);

CREATE TABLE shipments (
    shipment_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    address_snapshot TEXT,          -- snapshot ที่อยู่ ณ เวลาจัดส่ง
    tracking_number VARCHAR(150),
    carrier VARCHAR(100),           -- ชื่อขนส่ง
    status VARCHAR(50) DEFAULT 'preparing'
        CHECK (status IN ('preparing', 'shipped', 'delivered', 'failed')),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- =============================================
-- 5. CHATBOT
-- =============================================

CREATE TABLE chat_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    session_token VARCHAR(100) UNIQUE,  -- สำหรับ guest user
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
    message_id SERIAL PRIMARY KEY,
    session_id INT REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,                 -- เก็บข้อมูลเสริม เช่น product cards ที่แนะนำ
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chatbot Prompt Configuration (Admin ตั้งค่าได้)
CREATE TABLE chatbot_prompts (
    prompt_id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(category_id) ON DELETE CASCADE,
    prompt_type VARCHAR(50) DEFAULT 'category'
        CHECK (prompt_type IN ('system', 'category', 'product_specific')),
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. INDEXES
-- =============================================

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_active ON product_variants(is_active);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_embeddings_product ON product_embeddings(product_id);

-- pgvector index สำหรับ semantic search (IVFFlat)
CREATE INDEX idx_product_embedding_vector
    ON product_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);  -- ปรับ lists ตามจำนวนสินค้า (sqrt of total rows)
```

### Relationships Diagram
```
users ──┬── user_addresses
        ├── carts ──── cart_items ──── product_variants
        ├── orders ──┬── order_items ──── product_variants
        │            ├── payments
        │            └── shipments
        └── chat_sessions ──── chat_messages

categories ──┬── products ──┬── product_variants
             │              ├── product_embeddings
             └── chatbot_prompts
                            └── chatbot_prompts (product_specific)
```

---

## 5. Features & API Endpoints

### 5.1 Authentication — ระบบยืนยันตัวตนด้วย OTP (UC-01)

#### Concept
ระบบใช้ **เบอร์โทรศัพท์ + OTP** เป็นกลไกหลักในการยืนยันตัวตน ไม่มี password
เหตุผล: target user เป็นวัยกลางคน-สูงอายุ การจำ password เป็นปัญหา OTP ง่ายกว่ามาก

#### API Endpoints

```
POST   /api/auth/check-phone        # ตรวจสอบเบอร์ → มีบัญชีหรือยัง
POST   /api/auth/request-otp        # ส่ง OTP ไปเบอร์โทร (register/login)
POST   /api/auth/verify-otp         # ยืนยัน OTP → return JWT
POST   /api/auth/register-profile   # กรอกชื่อ + ที่อยู่ (หลัง verify ครั้งแรก)
POST   /api/auth/refresh            # ใช้ refresh token ขอ access token ใหม่
POST   /api/auth/logout             # Revoke refresh token
```

#### Flow Diagrams

**Flow 1: สมัครสมาชิกใหม่ (Register)**
```
ผู้ใช้                          Frontend                         Backend                        DB
  │                               │                                │                             │
  │  1. กรอกเบอร์โทร              │                                │                             │
  │  ──────────────────────────>  │                                │                             │
  │                               │  POST /auth/check-phone        │                             │
  │                               │  { phone: "0812345678" }       │                             │
  │                               │  ─────────────────────────────>│  SELECT * FROM users        │
  │                               │                                │  WHERE phone = '081...'     │
  │                               │                                │  ─────────────────────────> │
  │                               │                                │  <── ไม่พบ (user ใหม่)       │
  │                               │  <── { exists: false }         │                             │
  │                               │                                │                             │
  │  2. ระบบแสดงหน้า "สมัคร"      │                                │                             │
  │  <──────────────────────────  │                                │                             │
  │                               │                                │                             │
  │  3. กดปุ่ม "ขอรหัส OTP"       │                                │                             │
  │  ──────────────────────────>  │                                │                             │
  │                               │  POST /auth/request-otp        │                             │
  │                               │  { phone: "081...",            │                             │
  │                               │    purpose: "register" }       │                             │
  │                               │  ─────────────────────────────>│                             │
  │                               │                                │  ตรวจ rate limit            │
  │                               │                                │  (max 3 OTP/เบอร์/10นาที)   │
  │                               │                                │  ─────────────────────────> │
  │                               │                                │                             │
  │                               │                                │  สร้าง OTP 6 หลัก           │
  │                               │                                │  INSERT otp_requests        │
  │                               │                                │  (purpose='register',       │
  │                               │                                │   expires=NOW()+5min)       │
  │                               │                                │  ─────────────────────────> │
  │                               │                                │                             │
  │                               │                                │  [Production] ส่ง SMS       │
  │                               │                                │  [Demo] log OTP ใน console  │
  │                               │                                │                             │
  │                               │  <── { message: "OTP sent",    │                             │
  │                               │        expires_in: 300 }       │                             │
  │                               │                                │                             │
  │  4. ระบบแสดงช่องกรอก OTP      │                                │                             │
  │     พร้อม countdown 5:00      │                                │                             │
  │  <──────────────────────────  │                                │                             │
  │                               │                                │                             │
  │  5. กรอก OTP "123456"         │                                │                             │
  │  ──────────────────────────>  │                                │                             │
  │                               │  POST /auth/verify-otp         │                             │
  │                               │  { phone: "081...",            │                             │
  │                               │    otp: "123456",              │                             │
  │                               │    purpose: "register" }       │                             │
  │                               │  ─────────────────────────────>│                             │
  │                               │                                │  ตรวจ OTP:                  │
  │                               │                                │  - ตรงกัน?                   │
  │                               │                                │  - หมดอายุ?                  │
  │                               │                                │  - ใช้แล้ว?                  │
  │                               │                                │  - attempts < 5?            │
  │                               │                                │  ─────────────────────────> │
  │                               │                                │                             │
  │                               │                                │  OTP ถูกต้อง →              │
  │                               │                                │  INSERT users (phone,       │
  │                               │                                │    is_verified=true)         │
  │                               │                                │  UPDATE otp is_used=true    │
  │                               │                                │  สร้าง JWT + refresh token  │
  │                               │                                │  ─────────────────────────> │
  │                               │                                │                             │
  │                               │  <── { access_token, refresh_token, │                        │
  │                               │        is_new_user: true }     │                             │
  │                               │                                │                             │
  │  6. ระบบเห็น is_new_user=true │                                │                             │
  │     → แสดงฟอร์มกรอกข้อมูล     │                                │                             │
  │  <──────────────────────────  │                                │                             │
  │                               │                                │                             │
  │  7. กรอกชื่อ + ที่อยู่         │                                │                             │
  │  ──────────────────────────>  │                                │                             │
  │                               │  POST /auth/register-profile   │                             │
  │                               │  { full_name: "สมชาย",         │                             │
  │                               │    address: {...} }            │                             │
  │                               │  [Authorization: Bearer xxx]   │                             │
  │                               │  ─────────────────────────────>│                             │
  │                               │                                │  UPDATE users SET full_name │
  │                               │                                │  INSERT user_addresses      │
  │                               │                                │  ─────────────────────────> │
  │                               │                                │                             │
  │                               │  <── { success: true }         │                             │
  │                               │                                │                             │
  │  8. เข้าสู่หน้าหลักสำเร็จ     │                                │                             │
  │  <──────────────────────────  │                                │                             │
```

**Flow 2: เข้าสู่ระบบ (Login — มีบัญชีแล้ว)**
```
ผู้ใช้                          Frontend                         Backend
  │                               │                                │
  │  1. กรอกเบอร์โทร              │                                │
  │  ──────────────────────────>  │                                │
  │                               │  POST /auth/check-phone        │
  │                               │  ─────────────────────────────>│
  │                               │  <── { exists: true,           │
  │                               │        full_name: "สม..." }    │
  │                               │                                │
  │  2. ระบบแสดง "สวัสดี คุณสม..."│                                │
  │     + ปุ่ม "ขอรหัส OTP"       │                                │
  │  <──────────────────────────  │                                │
  │                               │                                │
  │  3. กดขอ OTP                  │                                │
  │  ──────────────────────────>  │                                │
  │                               │  POST /auth/request-otp        │
  │                               │  { phone, purpose: "login" }   │
  │                               │  ─────────────────────────────>│
  │                               │  <── { message: "OTP sent" }   │
  │                               │                                │
  │  4. กรอก OTP → verify         │                                │
  │  ──────────────────────────>  │                                │
  │                               │  POST /auth/verify-otp         │
  │                               │  { phone, otp, purpose:"login"}│
  │                               │  ─────────────────────────────>│
  │                               │                                │
  │                               │  <── { access_token,           │
  │                               │        refresh_token,          │
  │                               │        is_new_user: false,     │
  │                               │        user: { id, name, role } } │
  │                               │                                │
  │  5. เข้าสู่หน้าหลัก           │                                │
  │     (หรือ Admin Dashboard     │                                │
  │      ถ้า role = admin)        │                                │
  │  <──────────────────────────  │                                │
```

#### Backend Implementation

```python
# ============================================
# routers/auth.py
# ============================================

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from datetime import datetime, timedelta
import random
import hashlib
import jwt

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── Request/Response Models ──

class CheckPhoneRequest(BaseModel):
    phone_number: str

    @validator('phone_number')
    def validate_phone(cls, v):
        """ตรวจเบอร์ไทย: 0 นำหน้า + 9 หลัก = 10 หลัก"""
        cleaned = v.replace("-", "").replace(" ", "").strip()
        if not cleaned.startswith("0") or len(cleaned) != 10 or not cleaned.isdigit():
            raise ValueError("เบอร์โทรศัพท์ไม่ถูกต้อง กรุณากรอกเบอร์ 10 หลัก")
        return cleaned

class CheckPhoneResponse(BaseModel):
    exists: bool
    masked_name: str | None = None    # "สม***" สำหรับ privacy

class RequestOTPRequest(BaseModel):
    phone_number: str
    purpose: str    # "register" | "login"

    @validator('purpose')
    def validate_purpose(cls, v):
        if v not in ("register", "login", "reset"):
            raise ValueError("purpose ต้องเป็น register, login หรือ reset")
        return v

class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp_code: str
    purpose: str

    @validator('otp_code')
    def validate_otp(cls, v):
        if len(v) != 6 or not v.isdigit():
            raise ValueError("OTP ต้องเป็นตัวเลข 6 หลัก")
        return v

class RegisterProfileRequest(BaseModel):
    full_name: str
    address: dict | None = None    # optional ตอนสมัคร

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int              # วินาที
    is_new_user: bool
    user: dict | None = None

# ── Config ──

OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
OTP_MAX_ATTEMPTS = 5
OTP_RATE_LIMIT = 3               # max 3 OTP ต่อเบอร์ ใน 10 นาที
OTP_RATE_WINDOW_MINUTES = 10
ACCESS_TOKEN_EXPIRY_MINUTES = 60  # 1 ชั่วโมง
REFRESH_TOKEN_EXPIRY_DAYS = 30
JWT_SECRET = "your-jwt-secret"    # ใช้ env variable จริง
DEMO_MODE = True                  # True = ใช้ OTP "123456" เสมอ

# ── Helper Functions ──

def generate_otp() -> str:
    """สร้าง OTP 6 หลัก (demo mode ใช้ 123456 เสมอ)"""
    if DEMO_MODE:
        return "123456"
    return str(random.randint(100000, 999999))

def mask_name(name: str) -> str:
    """ซ่อนชื่อบางส่วน: สมชาย → สม***"""
    if not name or len(name) <= 2:
        return name
    return name[:2] + "***"

def create_access_token(user_id: int, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRY_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def create_refresh_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

# ── Endpoints ──

@router.post("/check-phone", response_model=CheckPhoneResponse)
async def check_phone(req: CheckPhoneRequest, db=Depends(get_db)):
    """
    Step 1: ตรวจสอบว่าเบอร์โทรมีในระบบหรือยัง
    → ถ้ามี: แสดงชื่อ (masked) + ปุ่ม "เข้าสู่ระบบ"
    → ถ้าไม่มี: แสดงฟอร์ม "สมัครสมาชิก"
    """
    user = await db.fetchrow(
        "SELECT user_id, full_name, is_active FROM users WHERE phone_number = $1",
        req.phone_number
    )

    if user and not user["is_active"]:
        raise HTTPException(
            status_code=403,
            detail="บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
        )

    return CheckPhoneResponse(
        exists=user is not None,
        masked_name=mask_name(user["full_name"]) if user else None
    )


@router.post("/request-otp")
async def request_otp(req: RequestOTPRequest, db=Depends(get_db)):
    """
    Step 2: ส่ง OTP ไปยังเบอร์โทรศัพท์
    
    ตรวจสอบ:
    - rate limit: ไม่เกิน 3 OTP ต่อเบอร์ ใน 10 นาที
    - purpose สอดคล้องกับสถานะ user:
      - register: เบอร์ต้องยังไม่มีในระบบ
      - login: เบอร์ต้องมีในระบบแล้ว
    """
    # ── ตรวจ rate limit ──
    cutoff = datetime.utcnow() - timedelta(minutes=OTP_RATE_WINDOW_MINUTES)
    recent_count = await db.fetchval(
        """SELECT COUNT(*) FROM otp_requests
           WHERE phone_number = $1 AND created_at > $2""",
        req.phone_number, cutoff
    )

    if recent_count >= OTP_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"ส่ง OTP ได้ไม่เกิน {OTP_RATE_LIMIT} ครั้งใน {OTP_RATE_WINDOW_MINUTES} นาที กรุณารอสักครู่"
        )

    # ── ตรวจสอบ purpose กับสถานะ user ──
    user = await db.fetchrow(
        "SELECT user_id FROM users WHERE phone_number = $1",
        req.phone_number
    )

    if req.purpose == "register" and user:
        raise HTTPException(
            status_code=409,
            detail="เบอร์โทรศัพท์นี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ"
        )

    if req.purpose == "login" and not user:
        raise HTTPException(
            status_code=404,
            detail="ไม่พบบัญชีที่ใช้เบอร์นี้ กรุณาสมัครสมาชิก"
        )

    # ── ยกเลิก OTP เก่าที่ยังไม่ใช้ ──
    await db.execute(
        """UPDATE otp_requests SET is_used = TRUE
           WHERE phone_number = $1 AND is_used = FALSE AND purpose = $2""",
        req.phone_number, req.purpose
    )

    # ── สร้าง OTP ใหม่ ──
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    await db.execute(
        """INSERT INTO otp_requests (phone_number, otp_code, purpose, expires_at)
           VALUES ($1, $2, $3, $4)""",
        req.phone_number, otp, req.purpose, expires_at
    )

    # ── ส่ง OTP ──
    if DEMO_MODE:
        print(f"[DEMO] OTP for {req.phone_number}: {otp}")
    else:
        # Production: เรียก SMS API เช่น Twilio, ThaiBulkSMS, SMSMKT
        await send_sms(req.phone_number, f"รหัส OTP ของคุณคือ {otp} (หมดอายุใน 5 นาที)")

    return {
        "message": "ส่งรหัส OTP เรียบร้อยแล้ว",
        "expires_in": OTP_EXPIRY_MINUTES * 60,  # วินาที
        "phone_masked": req.phone_number[:3] + "****" + req.phone_number[-3:]
    }


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(req: VerifyOTPRequest, db=Depends(get_db)):
    """
    Step 3: ยืนยัน OTP → ออก JWT

    ผลลัพธ์:
    - register: สร้าง user ใหม่ + return JWT + is_new_user=true
    - login: return JWT + is_new_user=false
    """
    # ── ค้นหา OTP ล่าสุดที่ยังไม่ใช้ ──
    otp_record = await db.fetchrow(
        """SELECT otp_id, otp_code, expires_at, attempts
           FROM otp_requests
           WHERE phone_number = $1
             AND purpose = $2
             AND is_used = FALSE
           ORDER BY created_at DESC
           LIMIT 1""",
        req.phone_number, req.purpose
    )

    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="ไม่พบรหัส OTP กรุณาขอรหัสใหม่"
        )

    # ── ตรวจหมดอายุ ──
    if datetime.utcnow() > otp_record["expires_at"].replace(tzinfo=None):
        await db.execute(
            "UPDATE otp_requests SET is_used = TRUE WHERE otp_id = $1",
            otp_record["otp_id"]
        )
        raise HTTPException(
            status_code=410,
            detail="รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่"
        )

    # ── ตรวจจำนวนครั้งที่กรอกผิด ──
    if otp_record["attempts"] >= OTP_MAX_ATTEMPTS:
        await db.execute(
            "UPDATE otp_requests SET is_used = TRUE WHERE otp_id = $1",
            otp_record["otp_id"]
        )
        raise HTTPException(
            status_code=429,
            detail="กรอก OTP ผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่"
        )

    # ── ตรวจ OTP ──
    if otp_record["otp_code"] != req.otp_code:
        # เพิ่ม attempt count
        await db.execute(
            "UPDATE otp_requests SET attempts = attempts + 1 WHERE otp_id = $1",
            otp_record["otp_id"]
        )
        remaining = OTP_MAX_ATTEMPTS - otp_record["attempts"] - 1
        raise HTTPException(
            status_code=401,
            detail=f"รหัส OTP ไม่ถูกต้อง (เหลืออีก {remaining} ครั้ง)"
        )

    # ── OTP ถูกต้อง → mark as used ──
    await db.execute(
        "UPDATE otp_requests SET is_used = TRUE WHERE otp_id = $1",
        otp_record["otp_id"]
    )

    # ── Register: สร้าง user ใหม่ ──
    is_new_user = False
    if req.purpose == "register":
        user = await db.fetchrow(
            """INSERT INTO users (phone_number, is_verified)
               VALUES ($1, TRUE)
               RETURNING user_id, phone_number, full_name, role""",
            req.phone_number
        )
        is_new_user = True
    else:
        # Login: ดึง user ที่มีอยู่
        user = await db.fetchrow(
            """UPDATE users SET last_login_at = NOW(), is_verified = TRUE
               WHERE phone_number = $1 AND is_active = TRUE
               RETURNING user_id, phone_number, full_name, role""",
            req.phone_number
        )
        if not user:
            raise HTTPException(status_code=404, detail="ไม่พบบัญชีผู้ใช้")

    # ── สร้าง JWT tokens ──
    access_token = create_access_token(user["user_id"], user["role"])
    refresh_token = create_refresh_token(user["user_id"])

    # เก็บ refresh token hash ลง DB
    await db.execute(
        """INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, $3)""",
        user["user_id"],
        hash_token(refresh_token),
        datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS)
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRY_MINUTES * 60,
        is_new_user=is_new_user,
        user={
            "user_id": user["user_id"],
            "phone_number": user["phone_number"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    )


@router.post("/register-profile")
async def register_profile(
    req: RegisterProfileRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Step 4 (เฉพาะ register): กรอกชื่อ + ที่อยู่หลัง verify OTP สำเร็จ
    ต้องมี JWT แล้ว (ได้จาก verify-otp)
    """
    # อัปเดตชื่อ
    await db.execute(
        "UPDATE users SET full_name = $1, updated_at = NOW() WHERE user_id = $2",
        req.full_name, current_user["user_id"]
    )

    # เพิ่มที่อยู่ (ถ้ามี)
    if req.address:
        await db.execute(
            """INSERT INTO user_addresses
               (user_id, recipient_name, phone_number, address_line,
                subdistrict, district, province, postal_code, is_default)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)""",
            current_user["user_id"],
            req.full_name,
            current_user["phone_number"],
            req.address.get("address_line", ""),
            req.address.get("subdistrict", ""),
            req.address.get("district", ""),
            req.address.get("province", ""),
            req.address.get("postal_code", "")
        )

    return {"success": True, "message": "บันทึกข้อมูลเรียบร้อยแล้ว"}


@router.post("/refresh", response_model=dict)
async def refresh_token(refresh_token: str, db=Depends(get_db)):
    """
    ใช้ refresh token ขอ access token ใหม่
    ใช้เมื่อ access token หมดอายุ (401 จาก API อื่น)
    """
    try:
        payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token หมดอายุ กรุณาเข้าสู่ระบบใหม่")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token ไม่ถูกต้อง")

    # ตรวจว่า refresh token ยังไม่ถูก revoke
    token_record = await db.fetchrow(
        """SELECT token_id FROM refresh_tokens
           WHERE user_id = $1 AND token_hash = $2 AND is_revoked = FALSE""",
        payload["user_id"], hash_token(refresh_token)
    )

    if not token_record:
        raise HTTPException(status_code=401, detail="Token ถูกเพิกถอนแล้ว")

    # ดึง user info
    user = await db.fetchrow(
        "SELECT user_id, role FROM users WHERE user_id = $1 AND is_active = TRUE",
        payload["user_id"]
    )

    if not user:
        raise HTTPException(status_code=401, detail="บัญชีถูกระงับ")

    new_access_token = create_access_token(user["user_id"], user["role"])

    return {
        "access_token": new_access_token,
        "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_EXPIRY_MINUTES * 60
    }


@router.post("/logout")
async def logout(refresh_token: str, db=Depends(get_db)):
    """Revoke refresh token เมื่อ logout"""
    await db.execute(
        "UPDATE refresh_tokens SET is_revoked = TRUE WHERE token_hash = $1",
        hash_token(refresh_token)
    )
    return {"message": "ออกจากระบบเรียบร้อยแล้ว"}


# ============================================
# middleware/auth.py — JWT Guard
# ============================================

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db)
):
    """
    Middleware: ตรวจ JWT ทุก request ที่ต้อง login
    ใช้: current_user = Depends(get_current_user)
    """
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=["HS256"]
        )
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token หมดอายุ")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token ไม่ถูกต้อง")

    user = await db.fetchrow(
        """SELECT user_id, phone_number, full_name, role, is_active
           FROM users WHERE user_id = $1""",
        payload["user_id"]
    )

    if not user or not user["is_active"]:
        raise HTTPException(status_code=401, detail="บัญชีถูกระงับ")

    return dict(user)


async def require_admin(current_user=Depends(get_current_user)):
    """Middleware: ตรวจว่าเป็น admin"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="สิทธิ์ไม่เพียงพอ")
    return current_user
```

#### Frontend Implementation

```typescript
// ============================================
// stores/authStore.ts — Zustand Store
// ============================================

import { create } from 'zustand'

type AuthStep = 'phone' | 'otp' | 'profile' | 'done'

interface AuthState {
    // State
    step: AuthStep
    phoneNumber: string
    isExistingUser: boolean
    maskedName: string | null
    otpExpiresAt: number | null       // timestamp
    accessToken: string | null
    refreshToken: string | null
    user: { user_id: number; full_name: string; role: string } | null

    // Actions
    setPhone: (phone: string, exists: boolean, name?: string) => void
    setOtpSent: (expiresIn: number) => void
    setAuthenticated: (tokens: TokenResponse) => void
    setProfileComplete: () => void
    logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    step: 'phone',
    phoneNumber: '',
    isExistingUser: false,
    maskedName: null,
    otpExpiresAt: null,
    accessToken: null,
    refreshToken: null,
    user: null,

    setPhone: (phone, exists, name) => set({
        phoneNumber: phone,
        isExistingUser: exists,
        maskedName: name || null,
        step: 'phone'    // ยังอยู่หน้า phone แต่แสดงปุ่ม "ขอ OTP" แล้ว
    }),

    setOtpSent: (expiresIn) => set({
        step: 'otp',
        otpExpiresAt: Date.now() + (expiresIn * 1000)
    }),

    setAuthenticated: (response) => set({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        user: response.user,
        step: response.is_new_user ? 'profile' : 'done'
    }),

    setProfileComplete: () => set({ step: 'done' }),

    logout: () => set({
        step: 'phone',
        phoneNumber: '',
        isExistingUser: false,
        maskedName: null,
        otpExpiresAt: null,
        accessToken: null,
        refreshToken: null,
        user: null
    })
}))


// ============================================
// components/auth/PhoneStep.tsx
// ============================================

export function PhoneStep() {
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { setPhone: savePhone } = useAuthStore()

    const handleCheckPhone = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await api.post('/auth/check-phone', {
                phone_number: phone
            })
            savePhone(phone, res.data.exists, res.data.masked_name)
        } catch (err) {
            setError(err.response?.data?.detail || 'เกิดข้อผิดพลาด')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center p-6 max-w-sm mx-auto">
            <h1 className="text-2xl font-bold mb-2">ร้านโชห่วย ABC</h1>
            <p className="text-gray-600 mb-6 text-lg">
                กรอกเบอร์โทรศัพท์เพื่อเข้าใช้งาน
            </p>

            <input
                type="tel"
                inputMode="numeric"
                placeholder="0812345678"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full p-4 text-xl text-center border-2 rounded-xl
                           tracking-widest focus:border-blue-500"
            />

            {error && (
                <p className="text-red-500 mt-2 text-sm">{error}</p>
            )}

            <button
                onClick={handleCheckPhone}
                disabled={phone.length !== 10 || loading}
                className="w-full mt-4 p-4 bg-blue-600 text-white text-lg
                           rounded-xl disabled:bg-gray-300"
            >
                {loading ? 'กำลังตรวจสอบ...' : 'ถัดไป'}
            </button>
        </div>
    )
}


// ============================================
// components/auth/OTPStep.tsx
// ============================================

export function OTPStep() {
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [countdown, setCountdown] = useState(300)   // 5 นาที
    const inputRefs = useRef<HTMLInputElement[]>([])
    const { phoneNumber, isExistingUser, setOtpSent, setAuthenticated } = useAuthStore()

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => prev > 0 ? prev - 1 : 0)
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Auto-submit เมื่อกรอกครบ 6 หลัก
    useEffect(() => {
        const code = otp.join('')
        if (code.length === 6) {
            handleVerify(code)
        }
    }, [otp])

    const handleInputChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return
        const newOtp = [...otp]
        newOtp[index] = value.slice(-1)
        setOtp(newOtp)
        // Auto-focus ช่องถัดไป
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handleKeyDown = (index: number, e: KeyboardEvent) => {
        // Backspace → focus ช่องก่อนหน้า
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    const handleVerify = async (code: string) => {
        setLoading(true)
        setError('')
        try {
            const res = await api.post('/auth/verify-otp', {
                phone_number: phoneNumber,
                otp_code: code,
                purpose: isExistingUser ? 'login' : 'register'
            })
            setAuthenticated(res.data)
        } catch (err) {
            setError(err.response?.data?.detail || 'OTP ไม่ถูกต้อง')
            setOtp(['', '', '', '', '', ''])
            inputRefs.current[0]?.focus()
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        try {
            const res = await api.post('/auth/request-otp', {
                phone_number: phoneNumber,
                purpose: isExistingUser ? 'login' : 'register'
            })
            setCountdown(res.data.expires_in)
            setError('')
        } catch (err) {
            setError(err.response?.data?.detail || 'ไม่สามารถส่ง OTP ได้')
        }
    }

    const formatTime = (s: number) =>
        `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

    return (
        <div className="flex flex-col items-center p-6 max-w-sm mx-auto">
            <h2 className="text-xl font-bold mb-2">กรอกรหัส OTP</h2>
            <p className="text-gray-600 mb-6">
                ส่งไปที่ {phoneNumber.slice(0,3)}****{phoneNumber.slice(-3)}
            </p>

            {/* OTP Input: 6 ช่อง */}
            <div className="flex gap-2 mb-4">
                {otp.map((digit, i) => (
                    <input
                        key={i}
                        ref={(el) => inputRefs.current[i] = el!}
                        type="tel"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleInputChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        className="w-12 h-14 text-2xl text-center border-2
                                   rounded-lg focus:border-blue-500"
                    />
                ))}
            </div>

            {error && <p className="text-red-500 mb-2">{error}</p>}

            {loading && <p className="text-blue-500 mb-2">กำลังตรวจสอบ...</p>}

            {/* Countdown + Resend */}
            <div className="text-gray-500 text-sm">
                {countdown > 0 ? (
                    <span>รหัสจะหมดอายุใน {formatTime(countdown)}</span>
                ) : (
                    <button
                        onClick={handleResend}
                        className="text-blue-600 underline"
                    >
                        ส่งรหัส OTP ใหม่
                    </button>
                )}
            </div>
        </div>
    )
}


// ============================================
// components/auth/ProfileStep.tsx
// (แสดงเฉพาะ user ใหม่หลัง verify OTP สำเร็จ)
// ============================================

export function ProfileStep() {
    const [name, setName] = useState('')
    const [address, setAddress] = useState({
        address_line: '',
        subdistrict: '',
        district: '',
        province: '',
        postal_code: ''
    })
    const [loading, setLoading] = useState(false)
    const { setProfileComplete } = useAuthStore()

    const handleSubmit = async () => {
        if (!name.trim()) return
        setLoading(true)
        try {
            await api.post('/auth/register-profile', {
                full_name: name,
                address: address.address_line ? address : null
            })
            setProfileComplete()
        } catch (err) {
            // handle error
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col p-6 max-w-sm mx-auto">
            <h2 className="text-xl font-bold mb-2">เกือบเสร็จแล้ว!</h2>
            <p className="text-gray-600 mb-6">กรอกข้อมูลเพื่อเริ่มใช้งาน</p>

            <label className="text-sm font-medium mb-1">ชื่อ-นามสกุล *</label>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="สมชาย ใจดี"
                className="p-3 border rounded-lg mb-4 text-lg"
            />

            <label className="text-sm font-medium mb-1">ที่อยู่จัดส่ง (เพิ่มทีหลังได้)</label>
            <textarea
                value={address.address_line}
                onChange={(e) => setAddress({...address, address_line: e.target.value})}
                placeholder="บ้านเลขที่ ซอย ถนน"
                rows={2}
                className="p-3 border rounded-lg mb-2"
            />

            <div className="grid grid-cols-2 gap-2 mb-4">
                <input placeholder="ตำบล" className="p-3 border rounded-lg"
                    onChange={(e) => setAddress({...address, subdistrict: e.target.value})} />
                <input placeholder="อำเภอ" className="p-3 border rounded-lg"
                    onChange={(e) => setAddress({...address, district: e.target.value})} />
                <input placeholder="จังหวัด" className="p-3 border rounded-lg"
                    onChange={(e) => setAddress({...address, province: e.target.value})} />
                <input placeholder="รหัสไปรษณีย์" className="p-3 border rounded-lg"
                    inputMode="numeric" maxLength={5}
                    onChange={(e) => setAddress({...address, postal_code: e.target.value})} />
            </div>

            <button
                onClick={handleSubmit}
                disabled={!name.trim() || loading}
                className="p-4 bg-green-600 text-white text-lg rounded-xl
                           disabled:bg-gray-300"
            >
                {loading ? 'กำลังบันทึก...' : 'เริ่มใช้งาน'}
            </button>

            <button
                onClick={() => setProfileComplete()}
                className="mt-2 p-2 text-gray-500 text-sm"
            >
                ข้ามไปก่อน (เพิ่มที่อยู่ภายหลัง)
            </button>
        </div>
    )
}


// ============================================
// components/auth/AuthPage.tsx — Main Auth Router
// ============================================

export function AuthPage() {
    const { step } = useAuthStore()

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-lg w-full max-w-md">
                {step === 'phone' && <PhoneStep />}
                {step === 'otp' && <OTPStep />}
                {step === 'profile' && <ProfileStep />}
            </div>
        </div>
    )
}


// ============================================
// services/api.ts — Axios Instance with Auto Refresh
// ============================================

import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({ baseURL: '/api' })

// ── Request: แนบ JWT ทุก request ──
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ── Response: auto refresh เมื่อ 401 ──
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const originalRequest = error.config
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true
            const refreshToken = useAuthStore.getState().refreshToken

            if (refreshToken) {
                try {
                    const res = await axios.post('/api/auth/refresh', {
                        refresh_token: refreshToken
                    })
                    useAuthStore.setState({
                        accessToken: res.data.access_token
                    })
                    originalRequest.headers.Authorization =
                        `Bearer ${res.data.access_token}`
                    return api(originalRequest)
                } catch {
                    // Refresh token ก็หมดอายุ → force logout
                    useAuthStore.getState().logout()
                }
            }
        }
        return Promise.reject(error)
    }
)

export default api
```

#### UI Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTH FLOW (Mobile-first)                    │
│                                                               │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐   │
│  │  STEP 1     │    │  STEP 2      │    │  STEP 3        │   │
│  │  Phone      │───>│  OTP         │───>│  Profile       │   │
│  │             │    │              │    │  (new user     │   │
│  │ ┌─────────┐ │    │ ┌──┬──┬──┐  │    │   only)        │   │
│  │ │0812345678│ │    │ │1 │2 │3 │  │    │                │   │
│  │ └─────────┘ │    │ │4 │5 │6 │  │    │ ชื่อ: [______]  │   │
│  │             │    │ └──┴──┴──┘  │    │ ที่อยู่: [____]  │   │
│  │ กรณีมีบัญชี:│    │              │    │                │   │
│  │ "สวัสดี     │    │ หมดอายุใน    │    │ [เริ่มใช้งาน]  │   │
│  │  คุณสม..."  │    │   4:32       │    │ [ข้ามไปก่อน]   │   │
│  │             │    │              │    │                │   │
│  │ [ขอรหัส OTP]│    │ [ส่งรหัสใหม่]│    └────────┬───────┘   │
│  └─────────────┘    └──────────────┘             │            │
│                                                  ▼            │
│                                         ┌────────────────┐   │
│                                         │   Homepage /    │   │
│                                         │   Admin Panel   │   │
│                                         │   (ตาม role)    │   │
│                                         └────────────────┘   │
│                                                               │
│  Error States:                                                │
│  • เบอร์ไม่ถูกต้อง → แสดงข้อความสีแดงใต้ช่องกรอก             │
│  • OTP ผิด → "รหัสไม่ถูกต้อง (เหลืออีก X ครั้ง)"             │
│  • OTP หมดอายุ → แสดงปุ่ม "ส่งรหัสใหม่"                      │
│  • Rate limit → "กรุณารอ X นาที"                              │
│  • บัญชีถูกระงับ → "กรุณาติดต่อผู้ดูแลระบบ"                   │
└──────────────────────────────────────────────────────────────┘
```

#### Security Checklist สำหรับ Agent

```
✅ OTP ต้อง hash ก่อนเก็บ DB (production) — demo เก็บ plaintext ได้
✅ Rate limit: max 3 OTP ต่อเบอร์ ใน 10 นาที
✅ OTP หมดอายุใน 5 นาที
✅ กรอก OTP ผิดได้ไม่เกิน 5 ครั้ง → ต้องขอใหม่
✅ ยกเลิก OTP เก่าทุกครั้งที่ขอ OTP ใหม่
✅ Refresh token เก็บเป็น hash ใน DB (ไม่เก็บ plaintext)
✅ Access token อายุสั้น (1 ชม.) + auto refresh
✅ ตรวจ is_active ทุกครั้งที่ verify token
✅ Phone number validation: ต้อง 0 นำหน้า + 10 หลัก
✅ ซ่อนชื่อผู้ใช้ (mask) ตอน check-phone เพื่อ privacy
```

### 5.2 User Profile & Addresses (UC-02)

```
GET    /api/users/me              # ดูข้อมูลตัวเอง
PUT    /api/users/me              # แก้ไขข้อมูล (ชื่อ)
DELETE /api/users/me              # ลบบัญชี (soft delete: set is_active=false)

GET    /api/users/me/addresses    # ดูที่อยู่ทั้งหมด
POST   /api/users/me/addresses    # เพิ่มที่อยู่ใหม่
PUT    /api/users/me/addresses/:id  # แก้ไขที่อยู่
DELETE /api/users/me/addresses/:id  # ลบที่อยู่
```

### 5.3 Products & Catalog

```
GET    /api/products              # ดูสินค้าทั้งหมด (pagination, filter by category)
GET    /api/products/:id          # ดูรายละเอียดสินค้า + variants
GET    /api/products/search?q=    # Semantic search ด้วย AI
GET    /api/categories            # ดู categories ทั้งหมด (tree structure)
```

### 5.4 Chatbot (UC-03) ⭐ Core Feature

```
POST   /api/chat/message          # ส่งข้อความ → รับคำตอบจาก AI
GET    /api/chat/history           # ดูประวัติแชท (session-based)
POST   /api/chat/session           # สร้าง session ใหม่
```

**Chatbot Processing Pipeline:**
```
User Message
    │
    ▼
┌─────────────────┐
│ Intent Detection │ ← Rule-based (ไม่ต้องใช้ AI)
│ (keyword match)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[สินค้า]  [คำสั่งซื้อ]  [ทั่วไป]
    │         │              │
    ▼         │              │
┌────────┐   │              │
│Gemini  │   │              │
│Embed   │   │              │
│query   │   │              │
└───┬────┘   │              │
    ▼         │              │
┌────────┐   │              │
│pgvector│   │              │
│search  │   │              │
│top 3   │   │              │
└───┬────┘   │              │
    ▼         ▼              │
┌────────────────┐          │
│ Query ข้อมูล    │          │
│ ราคา/สต็อก     │          │
│ จาก DB จริง    │          │
└───────┬────────┘          │
        │                   │
        ▼                   ▼
┌──────────────────────────────┐
│     Typhoon LLM API          │
│  System Prompt + Context     │
│  + User Message              │
│  → Generate Response         │
└──────────────┬───────────────┘
               ▼
         AI Response
      (+ Product Cards)
```

**Intent Detection (Rule-based — ไม่เสีย AI cost):**
```python
INTENT_PATTERNS = {
    "order_status": [
        "สถานะ", "คำสั่งซื้อ", "ออเดอร์", "ของถึงไหน", "tracking",
        "พัสดุ", "จัดส่ง", "ติดตาม"
    ],
    "product_search": [
        "มี", "ราคา", "สินค้า", "หา", "ขาย", "แนะนำ", "ถูก", "แพง",
        "โปรโมชั่น", "ลด", "ยี่ห้อ", "รุ่น"
    ],
    "cart_action": [
        "ตะกร้า", "เพิ่ม", "ใส่", "สั่ง", "ซื้อ"
    ],
    "general": []  # fallback
}
```

**สิ่งสำคัญ: ถ้า intent = order_status → ดึงจาก DB ตอบเลย ไม่ต้องยิง AI**

### 5.5 Cart (UC-04)

```
GET    /api/cart                   # ดูตะกร้า
POST   /api/cart/items             # เพิ่มสินค้า
PUT    /api/cart/items/:variant_id  # แก้ไขจำนวน
DELETE /api/cart/items/:variant_id  # ลบสินค้า
POST   /api/cart/sync              # Sync cookie cart → DB cart (เมื่อ login)
```

**Cart Strategy:**
- **Guest (ยังไม่ login)**: เก็บใน Cookie/LocalStorage → `{ variant_id: quantity }`
- **Logged in**: Sync เข้า DB → ตาราง carts + cart_items
- **เมื่อ Login**: เรียก `/api/cart/sync` เพื่อ merge cookie cart เข้า DB cart

### 5.6 Orders & Checkout (UC-05)

```
POST   /api/orders                 # สร้างคำสั่งซื้อจากตะกร้า
GET    /api/orders                 # ดูคำสั่งซื้อทั้งหมดของตัวเอง
GET    /api/orders/:id             # ดูรายละเอียดคำสั่งซื้อ
POST   /api/orders/:id/cancel      # ยกเลิกคำสั่งซื้อ (ถ้ายังไม่จัดส่ง)
```

**Checkout Flow:**
```
1. POST /api/orders
   Body: { address_id, payment_method: "promptpay_qr" | "cod", items: [...] }

2. ระบบตรวจสต็อก (ใช้ SELECT FOR UPDATE เพื่อ lock row)
3. ตัดสต็อก + สร้าง order + order_items
4. ถ้า payment_method = "promptpay_qr":
   → เรียก Omise API สร้าง QR charge
   → Return QR code image URL + charge_id
5. ถ้า payment_method = "cod":
   → บันทึก payment status = "cod_pending"
   → Return order confirmation

Stock Locking (ป้องกัน race condition):
```sql
BEGIN;
SELECT stock_quantity FROM product_variants
WHERE variant_id = $1 FOR UPDATE;
-- ตรวจสอบว่าพอ
UPDATE product_variants SET stock_quantity = stock_quantity - $2
WHERE variant_id = $1;
COMMIT;
```
```

### 5.7 Payment (UC-05)

```
POST   /api/payments/create-charge   # สร้าง Omise charge (PromptPay QR)
POST   /api/payments/webhook         # Omise webhook callback
GET    /api/payments/:order_id/status # ตรวจสอบสถานะ payment
```

**Omise PromptPay Flow:**
```python
# สร้าง charge
charge = omise.Charge.create(
    amount=total_amount_satang,  # จำนวนเงินเป็นสตางค์
    currency="thb",
    source={"type": "promptpay"}
)
# charge.source.scannable_code.image.download_uri → QR Code URL

# Webhook: Omise จะ POST มาเมื่อจ่ายสำเร็จ
# → update payment status = "successful"
# → update order payment_status = "paid"
```

**สำหรับ Demo ที่ไม่มี Omise Account:**
```python
# Mock payment — สร้าง QR image จาก promptpay number
# ใช้ library: promptpay-qr หรือ generate QR ด้วย qrcode library
# แล้วมี button "จำลองการชำระเงินสำเร็จ" สำหรับ demo
```

### 5.8 Order Tracking (UC-06)

```
GET    /api/orders/:id/tracking    # ดูสถานะจัดส่ง
```

### 5.9 Admin APIs

```
# สมาชิก
GET    /api/admin/users            # ดูสมาชิกทั้งหมด (search, pagination)
PUT    /api/admin/users/:id        # แก้ไขข้อมูล/role
DELETE /api/admin/users/:id        # ลบสมาชิก

# สินค้า
GET    /api/admin/products         # ดูสินค้าทั้งหมด
POST   /api/admin/products         # เพิ่มสินค้า (manual)
POST   /api/admin/products/ai-generate  # เพิ่มสินค้า (AI-assisted)
PUT    /api/admin/products/:id     # แก้ไขสินค้า
DELETE /api/admin/products/:id     # ลบสินค้า (soft delete)

# คำสั่งซื้อ
GET    /api/admin/orders           # ดูคำสั่งซื้อทั้งหมด (filter by status)
PUT    /api/admin/orders/:id/status  # อัปเดตสถานะ
PUT    /api/admin/orders/:id/shipping  # เพิ่มข้อมูลจัดส่ง + tracking number

# แชทบอท
GET    /api/admin/chatbot/prompts         # ดู prompt ทั้งหมด
PUT    /api/admin/chatbot/prompts/:id     # แก้ไข prompt
POST   /api/admin/chatbot/test            # ทดสอบ prompt

# รายงาน
GET    /api/admin/reports/sales           # รายงานยอดขาย
GET    /api/admin/reports/top-products    # สินค้าขายดี
GET    /api/admin/reports/overview        # ภาพรวม dashboard
```

---

## 6. AI Integration

### 6.1 Typhoon LLM — Chatbot Response

```python
# services/ai_service.py

import httpx
from typing import Optional

TYPHOON_API_URL = "https://api.opentyphoon.ai/v1/chat/completions"
TYPHOON_API_KEY = "your-api-key"
TYPHOON_MODEL = "typhoon-v2.5-instruct"  # ตรวจสอบ model name ล่าสุด

async def generate_chat_response(
    user_message: str,
    product_context: Optional[str] = None,
    chat_history: list = [],
    category_prompt: str = "",
    max_tokens: int = 300  # จำกัดให้สั้น = ประหยัด cost
) -> str:
    
    system_prompt = f"""คุณคือผู้ช่วยขายของร้านโชห่วย ชื่อ "น้องเอ"
ตอบด้วยภาษาไทยที่เป็นมิตร สุภาพ กระชับ ไม่เกิน 3 ประโยค

กฎสำคัญ:
- ถ้ามีข้อมูลสินค้าให้ ตอบเฉพาะข้อมูลที่มี ห้ามแต่งเรื่อง
- ถ้าไม่มีข้อมูลสินค้า ให้แจ้งว่าไม่พบ
- ราคาและจำนวนสต็อก ต้องใช้จากข้อมูลที่ให้เท่านั้น ห้ามเดา
- ถ้าลูกค้าถามนอกเรื่องสินค้า ตอบสั้นๆ แล้วพากลับมาเรื่องสินค้า

{category_prompt}
"""

    if product_context:
        system_prompt += f"\n\nข้อมูลสินค้าที่เกี่ยวข้อง:\n{product_context}"

    messages = [{"role": "system", "content": system_prompt}]
    
    # ส่งแค่ 5 ข้อความล่าสุด (ประหยัด token)
    recent_history = chat_history[-5:]
    messages.extend(recent_history)
    messages.append({"role": "user", "content": user_message})

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            TYPHOON_API_URL,
            headers={
                "Authorization": f"Bearer {TYPHOON_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": TYPHOON_MODEL,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.3  # ต่ำ = ตอบตรงประเด็นกว่า
            }
        )
        data = response.json()
        return data["choices"][0]["message"]["content"]
```

### 6.2 Gemini Embedding — Semantic Search

```python
# services/ai_service.py (ต่อ)

import google.generativeai as genai

genai.configure(api_key="your-gemini-api-key")

async def create_embedding(text: str) -> list[float]:
    """สร้าง embedding vector จากข้อความ"""
    result = genai.embed_content(
        model="models/embedding-001",
        content=text,
        task_type="retrieval_document"
    )
    return result['embedding']  # 768 dimensions

async def search_products_semantic(query: str, top_k: int = 3) -> list:
    """ค้นหาสินค้าด้วย semantic search"""
    query_embedding = await create_embedding(query)
    
    # ใช้ pgvector cosine similarity search
    sql = """
        SELECT pe.product_id, p.name, p.description,
               1 - (pe.embedding <=> $1::vector) AS similarity
        FROM product_embeddings pe
        JOIN products p ON p.product_id = pe.product_id
        WHERE p.is_active = TRUE
        ORDER BY pe.embedding <=> $1::vector
        LIMIT $2
    """
    results = await db.fetch(sql, str(query_embedding), top_k)
    
    # ดึงข้อมูลราคา/สต็อกล่าสุด (สำคัญมาก — ห้ามใช้ cached data)
    product_ids = [r['product_id'] for r in results]
    fresh_data = await db.fetch("""
        SELECT p.product_id, p.name, p.description, p.marketing_copy,
               pv.variant_id, pv.price, pv.stock_quantity, pv.unit,
               pv.size, pv.color, pv.image_url
        FROM products p
        JOIN product_variants pv ON pv.product_id = p.product_id
        WHERE p.product_id = ANY($1) AND pv.is_active = TRUE
    """, product_ids)
    
    return fresh_data
```

### 6.3 AI Product Import (Admin Feature)

```python
async def ai_generate_product_data(
    image_base64: Optional[str] = None,
    text_description: Optional[str] = None
) -> dict:
    """ใช้ AI วิเคราะห์ข้อมูลสินค้าจากรูปภาพ/ข้อความ"""
    
    prompt = """วิเคราะห์ข้อมูลสินค้าต่อไปนี้ และส่งผลลัพธ์เป็น JSON เท่านั้น (ไม่มีข้อความอื่น)
โครงสร้าง JSON:
{
    "name": "ชื่อสินค้า",
    "category": "หมวดหมู่ที่เหมาะสม",
    "description": "รายละเอียดสินค้า",
    "marketing_copy": "คำโฆษณาสั้นๆ ดึงดูดลูกค้า",
    "variants": [
        {
            "price": 0.00,
            "unit": "ลักษณะนาม",
            "size": "ขนาด หรือ null",
            "color": "สี หรือ null"
        }
    ]
}"""

    messages = [{"role": "user", "content": []}]
    
    if image_base64:
        messages[0]["content"].append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
        })
    
    if text_description:
        messages[0]["content"].append({
            "type": "text",
            "text": f"{prompt}\n\nข้อมูลสินค้า:\n{text_description}"
        })
    else:
        messages[0]["content"].append({
            "type": "text",
            "text": prompt
        })

    # ใช้ Typhoon vision model
    response = await call_typhoon_api(messages, max_tokens=500)
    
    # Parse JSON response
    import json
    try:
        product_data = json.loads(response)
        return {"success": True, "data": product_data}
    except json.JSONDecodeError:
        return {"success": False, "raw_response": response}
```

---

## 7. Cost Optimization Strategy

### 7.1 Caching Layer

```python
# services/cache_service.py

from functools import lru_cache
from datetime import datetime, timedelta
import hashlib

class SimpleCache:
    """In-memory cache สำหรับ demo (production ใช้ Redis)"""
    
    def __init__(self):
        self._cache = {}
        self._ttl = {}
    
    def get(self, key: str):
        if key in self._cache:
            if datetime.now() < self._ttl[key]:
                return self._cache[key]
            else:
                del self._cache[key]
                del self._ttl[key]
        return None
    
    def set(self, key: str, value, ttl_seconds: int = 300):
        self._cache[key] = value
        self._ttl[key] = datetime.now() + timedelta(seconds=ttl_seconds)

cache = SimpleCache()

def get_cache_key(query: str) -> str:
    """สร้าง cache key จาก query"""
    return hashlib.md5(query.strip().lower().encode()).hexdigest()
```

### 7.2 สิ่งที่ Cache ได้ vs ไม่ได้

```
✅ CACHE ได้ (5-10 นาที):
- Embedding vector ของ query ที่เคยค้นหาแล้ว
- ผลลัพธ์ semantic search (product_ids ที่ match)
- Category prompt templates
- AI response สำหรับคำถามทั่วไป (เช่น "ร้านเปิดกี่โมง")

❌ ห้าม CACHE:
- ราคาสินค้า (อาจเปลี่ยนได้)
- จำนวนสต็อก (เปลี่ยนทุกครั้งที่มีคนสั่ง)
- สถานะคำสั่งซื้อ
```

### 7.3 Rate Limiting

```python
# middleware/rate_limit.py

from collections import defaultdict
from datetime import datetime, timedelta

class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)
    
    def check(self, user_id: str, limit: int = 30, window_seconds: int = 86400) -> bool:
        """จำกัด 30 AI requests ต่อ user ต่อวัน"""
        now = datetime.now()
        cutoff = now - timedelta(seconds=window_seconds)
        
        # ลบ requests เก่า
        self.requests[user_id] = [
            t for t in self.requests[user_id] if t > cutoff
        ]
        
        if len(self.requests[user_id]) >= limit:
            return False
        
        self.requests[user_id].append(now)
        return True

rate_limiter = RateLimiter()
```

### 7.4 Cost Budget Estimation (สำหรับ Demo)

```
สมมุติ: Demo มีสินค้า 100 รายการ, ทดสอบ 50 conversations

Embedding Cost (Gemini):
- สร้าง embedding 100 สินค้า × 1 ครั้ง = 100 calls (ฟรี)
- Search embedding ~200 queries = 200 calls (ฟรี)
- Gemini free tier: 1,500 requests/day → เหลือเฟือ

Typhoon LLM Cost:
- 50 conversations × avg 5 messages = 250 LLM calls
- avg 300 tokens/response = ~75,000 output tokens
- Typhoon free tier: ตรวจสอบ quota ปัจจุบัน
- ถ้าเกิน free tier: ~$0.001-0.003 per 1K tokens → ไม่เกิน ฿10-30

AI Product Import:
- 100 สินค้า × 1 generate = 100 calls → ไม่เกิน ฿5-10

รวมทั้ง Demo: ฿0 - ฿50 (ถ้าใช้ free tier ได้ อาจไม่ต้องเสียเลย)
```

---

## 8. UI/UX Guidelines

### Design Principles
1. **ง่ายมากๆ** — ผู้ใช้วัยกลางคน-สูงอายุ ต้องใช้ได้โดยไม่ต้องสอน
2. **ตัวอักษรใหญ่** — ขนาด base font อย่างน้อย 16px
3. **สี contrast สูง** — ใช้สีที่อ่านง่าย
4. **แชทเป็นศูนย์กลาง** — floating chat button ที่เด่นชัด
5. **Responsive** — ทำงานได้ดีบนมือถือ (mobile-first)

### Color Palette (แนะนำ)
```css
:root {
    --primary: #2563EB;        /* Blue — น่าเชื่อถือ */
    --primary-light: #DBEAFE;
    --secondary: #059669;      /* Green — ปุ่มสั่งซื้อ */
    --accent: #F59E0B;         /* Amber — badge, notification */
    --danger: #DC2626;         /* Red — ลบ, หมดสต็อก */
    --text: #1F2937;
    --text-light: #6B7280;
    --bg: #F9FAFB;
    --card: #FFFFFF;
}
```

### Key Pages Layout

**Homepage (ลูกค้า):**
```
┌──────────────────────────────┐
│  🏪 ร้านโชห่วย ABC          │
│  [Search Bar]                │
├──────────────────────────────┤
│  หมวดหมู่: [เครื่องดื่ม] [ขนม] [ของใช้] │
├──────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐       │
│  │ 📦 │ │ 📦 │ │ 📦 │       │
│  │สินค้า│ │สินค้า│ │สินค้า│       │
│  │ ฿xx │ │ ฿xx │ │ ฿xx │       │
│  └────┘ └────┘ └────┘       │
│                              │
│              🛒 (3)    💬    │  ← Floating buttons
└──────────────────────────────┘
```

**Chat Window:**
```
┌──────────────────────────────┐
│  💬 น้องเอ ผู้ช่วยร้านค้า    │  ✕
├──────────────────────────────┤
│  🤖 สวัสดีค่ะ มีอะไรให้ช่วย  │
│     ไหมคะ?                    │
│                              │
│         มีน้ำอัดลมอะไรบ้าง 👤 │
│                              │
│  🤖 มีน้ำอัดลมหลายยี่ห้อค่ะ  │
│     ┌─────────────────┐      │
│     │ 🥤 โค้ก 330ml    │      │
│     │ ราคา ฿15         │      │
│     │ [ใส่ตะกร้า]      │      │
│     └─────────────────┘      │
│     ┌─────────────────┐      │
│     │ 🥤 เป๊ปซี่ 330ml  │      │
│     │ ราคา ฿15         │      │
│     └─────────────────┘      │
├──────────────────────────────┤
│  [พิมพ์ข้อความ...     ] [ส่ง] │
└──────────────────────────────┘
```

**Admin Dashboard:**
```
┌────────┬─────────────────────┐
│        │  Dashboard           │
│ 📊 รายงาน │                    │
│ 📦 สินค้า  │  ยอดขายวันนี้: ฿X,XXX │
│ 📋 คำสั่งซื้อ│  คำสั่งซื้อใหม่: XX │
│ 👥 สมาชิก │  สินค้าใกล้หมด: XX  │
│ 🤖 แชทบอท│                    │
│        │  [กราฟยอดขาย 7 วัน]  │
│        │                      │
└────────┴─────────────────────┘
```

---

## 9. Development Phases

### Phase 1: Foundation (สัปดาห์ที่ 1-2)
```
□ Setup project structure (React + FastAPI)
□ Setup Supabase project + database schema (รวม pgvector extension)
□ สร้าง seed data สินค้า 50-100 รายการ + admin account

Auth System (OTP-based):
□ POST /auth/check-phone — ตรวจเบอร์ว่ามีบัญชีหรือยัง
□ POST /auth/request-otp — สร้าง OTP + mock SMS (DEMO_MODE)
□ POST /auth/verify-otp — ตรวจ OTP + สร้าง JWT + refresh token
□ POST /auth/register-profile — กรอกชื่อ+ที่อยู่ (user ใหม่)
□ POST /auth/refresh — auto refresh token
□ POST /auth/logout — revoke refresh token
□ Axios interceptor — auto refresh เมื่อ 401
□ Auth UI: PhoneStep → OTPStep → ProfileStep (3 ขั้นตอน)
□ JWT guard middleware + role check (user/admin)
□ Rate limit OTP (3 ครั้ง/10 นาที/เบอร์)

Product CRUD:
□ CRUD สินค้า (Admin)
□ แสดงรายการสินค้า + categories (Customer)
```

### Phase 2: Core Shopping (สัปดาห์ที่ 3-4)
```
□ Cart system (Cookie + DB sync)
□ Checkout flow
□ Order management
□ Payment integration (Omise หรือ mock)
□ Order tracking
□ Admin order management
```

### Phase 3: AI Features (สัปดาห์ที่ 5-6)
```
□ Gemini embedding — สร้าง embeddings สำหรับสินค้าทั้งหมด
□ Semantic search ด้วย pgvector
□ Chatbot UI component
□ Intent detection (rule-based)
□ Typhoon integration — generate responses
□ Caching layer
□ Rate limiting
□ AI product import (Admin)
```

### Phase 4: Polish & Demo (สัปดาห์ที่ 7-8)
```
□ Admin dashboard + reports
□ Chatbot prompt management (Admin)
□ UI polish + responsive
□ Error handling + fallback responses
□ Testing + bug fixes
□ Demo data preparation
□ Presentation prep
```

---

## 10. หมายเหตุสำหรับ Agent

### สิ่งที่ต้องระวัง
1. **อย่าลืม `SELECT FOR UPDATE`** เมื่อตัดสต็อก — race condition เป็นปัญหาจริงถ้ามีหลายคนสั่งพร้อมกัน
2. **ราคาและสต็อก ต้อง query สดเสมอ** — ไม่ใช้จาก embedding หรือ cache
3. **Snapshot ราคาใน order_items** — เก็บราคา ณ เวลาที่สั่ง ไม่ใช่ reference ไปตาราง variants
4. **Cookie cart มี limit 4KB** — เก็บแค่ `{variant_id: qty}` ดึงรายละเอียดจาก DB ตอนแสดงผล
5. **OTP สำหรับ demo ใช้ "123456" ตลอด** — ไม่ต้องต่อ SMS API จริง ตั้ง `DEMO_MODE=True`
6. **Typhoon API** อาจเปลี่ยน endpoint/model name — ตรวจสอบ docs ล่าสุดก่อน implement
7. **pgvector lists parameter** ใน IVFFlat index — ใช้ `sqrt(จำนวนสินค้า)` เช่น สินค้า 100 รายการ ใช้ lists = 10
8. **Auth flow ต้องแยก purpose ของ OTP ชัดเจน** — register กับ login ใช้คนละ flow ห้ามปน ตรวจสอบสถานะ user ก่อนส่ง OTP เสมอ
9. **Refresh token ต้องเก็บเป็น SHA-256 hash ใน DB** — ห้ามเก็บ plaintext เด็ดขาด
10. **Phone validation ต้องทำทั้ง frontend และ backend** — frontend ใช้ `inputMode="numeric"` + regex, backend ใช้ Pydantic validator
11. **Auto-refresh token** — Axios interceptor ต้อง handle 401 แล้วขอ token ใหม่ด้วย refresh token อัตโนมัติ ถ้า refresh token ก็หมดอายุให้ logout
12. **ยกเลิก OTP เก่า** ทุกครั้งที่ขอ OTP ใหม่ ป้องกันปัญหา OTP ชุดเก่ายัง valid อยู่

### Environment Variables ที่ต้องตั้ง
```env
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# Auth & Security
JWT_SECRET=xxx                          # ใช้ random string 64+ chars
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60      # 1 ชั่วโมง
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
DEMO_MODE=true                          # true = OTP เป็น "123456" เสมอ
DEMO_OTP=123456
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_RATE_LIMIT=3                        # max OTP requests ต่อเบอร์
OTP_RATE_WINDOW_MINUTES=10

# SMS (Production only — ไม่ต้องตั้งถ้า DEMO_MODE=true)
SMS_PROVIDER=thaibulksms                # thaibulksms | twilio | smsmkt
SMS_API_KEY=xxx
SMS_API_SECRET=xxx
SMS_SENDER_NAME=A-COMMERCE

# AI
TYPHOON_API_KEY=xxx
TYPHOON_API_URL=https://api.opentyphoon.ai/v1/chat/completions
TYPHOON_MODEL=typhoon-v2.5-instruct
GEMINI_API_KEY=xxx

# Payment
OMISE_PUBLIC_KEY=pkey_xxx
OMISE_SECRET_KEY=skey_xxx

# App
FRONTEND_URL=http://localhost:5173
```

### Seed Data (ตัวอย่างหมวดหมู่)
```
Admin Account (สร้างใน seed.sql):
INSERT INTO users (phone_number, full_name, role, is_active, is_verified)
VALUES ('0999999999', 'ผู้ดูแลระบบ', 'admin', TRUE, TRUE);

หมวดหมู่สินค้า:
เครื่องดื่ม
├── น้ำอัดลม
├── น้ำผลไม้
├── นม
└── กาแฟ

ขนมขบเคี้ยว
├── มันฝรั่งทอด
├── ข้าวเกรียบ
└── ถั่ว

ของใช้ในบ้าน
├── ผงซักฟอก
├── น้ำยาล้างจาน
└── กระดาษทิชชู่

อาหารสำเร็จรูป
├── บะหมี่กึ่งสำเร็จรูป
├── อาหารกระป๋อง
└── เครื่องปรุงรส
```

### คำแนะนำสุดท้าย
- ทำ **core flow ให้เสร็จก่อน** แล้วค่อยเพิ่ม feature
- ใช้ **Supabase** ให้เต็มที่ — Auth, Storage, Realtime ช่วยลดเวลา dev มาก
- **AI feature เป็น wow factor** ของโปรเจกต์ แต่ต้องมี fallback เสมอ
- Demo ให้อาจารย์ ควรเตรียม **scenario สำเร็จรูป** ที่แน่ใจว่า AI ตอบได้ดี
- ใส่ **loading states** ทุกจุดที่เรียก AI — อย่าให้หน้าจอค้างโดยไม่มี feedback
