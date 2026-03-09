-- =============================================
-- A-Commerce Database Schema
-- PostgreSQL with pgvector extension
-- =============================================

-- Enable pgvector extension for AI semantic search
CREATE EXTENSION IF NOT EXISTS vector;

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
    reserved_at TIMESTAMPTZ DEFAULT NOW(),  -- stock reservation TTL (30 min)
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


-- =============================================
-- 7. LIVE SUPPORT CHAT
-- =============================================

CREATE TABLE support_sessions (
    session_id        SERIAL PRIMARY KEY,
    user_id           INT REFERENCES users(user_id) ON DELETE SET NULL,
    session_token     VARCHAR(64) NOT NULL,
    customer_name     VARCHAR(100),
    status            VARCHAR(20) NOT NULL DEFAULT 'waiting'
                      CHECK (status IN ('waiting', 'active', 'closed')),
    assigned_admin_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at         TIMESTAMPTZ
);

CREATE INDEX idx_support_sessions_status ON support_sessions(status);
CREATE INDEX idx_support_sessions_token ON support_sessions(session_token);

CREATE TABLE support_messages (
    message_id  SERIAL PRIMARY KEY,
    session_id  INT NOT NULL REFERENCES support_sessions(session_id) ON DELETE CASCADE,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('customer', 'admin', 'system')),
    sender_id   INT,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_messages_session ON support_messages(session_id, created_at);
CREATE INDEX idx_support_messages_cleanup ON support_messages(created_at);
