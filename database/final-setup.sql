-- =============================================
-- A-Commerce Final Setup
-- รันไฟล์นี้หลังจากลบ tables ทั้งหมดแล้ว
-- =============================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. USERS & AUTH
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(200),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE otp_requests (
    otp_id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('register', 'login', 'reset')),
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_phone_created ON otp_requests(phone_number, created_at DESC);

CREATE TABLE refresh_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
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

-- 2. PRODUCTS & CATALOG
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    parent_id INT REFERENCES categories(category_id) ON DELETE SET NULL,
    prompt_template TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    marketing_copy TEXT,
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
    unit VARCHAR(50),
    size VARCHAR(50),
    color VARCHAR(50),
    low_stock_threshold INT DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_embeddings (
    embedding_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    embedding vector(768),
    text_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CART
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
    reserved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cart_id, variant_id)
);

-- 4. ORDERS & PAYMENTS
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
    product_name VARCHAR(200),
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL
);

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    method VARCHAR(100) NOT NULL CHECK (method IN ('promptpay_qr', 'cod')),
    amount DECIMAL(10,2) NOT NULL,
    transaction_ref TEXT,
    omise_source_id TEXT,
    paid_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'successful', 'failed', 'expired'))
);

CREATE TABLE shipments (
    shipment_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    address_snapshot TEXT,
    tracking_number VARCHAR(150),
    carrier VARCHAR(100),
    status VARCHAR(50) DEFAULT 'preparing'
        CHECK (status IN ('preparing', 'shipped', 'delivered', 'failed')),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- 5. CHATBOT
CREATE TABLE chat_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    session_token VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
    message_id SERIAL PRIMARY KEY,
    session_id INT REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 6. INDEXES
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

CREATE INDEX idx_product_embedding_vector
    ON product_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);

-- ===== SEED DATA =====

-- Admin user
INSERT INTO users (phone_number, full_name, role, is_active, is_verified)
VALUES ('0999999999', 'ผู้ดูแลระบบ', 'admin', TRUE, TRUE);

-- Categories
INSERT INTO categories (name, parent_id) VALUES
('เครื่องดื่ม', NULL),
('ขนมขบเคี้ยว', NULL),
('ของใช้ในบ้าน', NULL),
('อาหารสำเร็จรูป', NULL),
('น้ำอัดลม', 1),
('น้ำผลไม้', 1),
('นม', 1),
('น้ำดื่ม', 1),
('เครื่องดื่มชูกำลัง', 1),
('มันฝรั่งทอด', 2),
('ขนมกรุบกรอบ', 2),
('ช็อคโกแลต', 2),
('ขนมหวาน', 2),
('ผงซักฟอก', 3),
('น้ำยาล้างจาน', 3),
('กระดาษทิชชู่', 3),
('บะหมี่กึ่งสำเร็จรูป', 4),
('อาหารกระป๋อง', 4);

-- Products (30 items)
INSERT INTO products (name, description, category_id, marketing_copy) VALUES
('โค้ก', 'น้ำอัดลมรสดั้งเดิม', 5, 'น้ำอัดลมรสชาติดั้งเดิมที่คุ้นเคย ดื่มเย็นๆ สดชื่นตลอดวัน'),
('เป๊ปซี่', 'น้ำอัดลมรสโคลา', 5, 'รสชาติโคลาที่ทุกคนชื่นชอบ'),
('สไปรท์', 'น้ำอัดลมรสเลมอน', 5, 'สดชื่นด้วยรสเลมอนไลม์'),
('ฟันต้า', 'น้ำอัดลมรสส้ม', 5, 'รสส้มสดใหม่ หวานชื่นใจ'),
('มินิทเมด พัลพี่', 'น้ำส้มมีเนื้อ', 6, 'น้ำส้มสดใหม่มีเนื้อส้มแท้'),
('โออิชิ กรีนที', 'ชาเขียวน้ำผึ้ง', 6, 'ชาเขียวรสหวานนุ่ม ผสมน้ำผึ้ง'),
('ดัชมิลล์ นมสด', 'นมสดพาสเจอร์ไรส์', 7, 'นมสดคุณภาพดี โปรตีนสูง'),
('ไฮโล สูตรทอฬด์', 'นมUHT สูตรทอฬด์', 7, 'นมUHT รสหวานมัน เหมาะสำหรับทุกวัย'),
('สิงห์ น้ำดื่ม', 'น้ำดื่มบรรจุขวด', 8, 'น้ำดื่มสะอาด ผ่านกระบวนการกรองคุณภาพ'),
('คริสตัล น้ำดื่ม', 'น้ำดื่มบรรจุขวด', 8, 'น้ำดื่มคุณภาพ สะอาดปลอดภัย'),
('เรดบูล', 'เครื่องดื่มชูกำลัง', 9, 'เติมพลังให้คุณตลอดวัน'),
('คาราบาว แดง', 'เครื่องดื่มชูกำลัง', 9, 'ชูกำลังสูตรไทย รสชาติดั้งเดิม'),
('เลย์ คลาสสิค', 'มันฝรั่งทอดรสธรรมชาติ', 10, 'กรุบกรอบ อร่อยทุกคำ'),
('เลย์ บาร์บีคิว', 'มันฝรั่งทอดรสบาร์บีคิว', 10, 'รสบาร์บีคิวเข้มข้น หอมหวาน'),
('ทาโร้ รสต้นตำรับ', 'มันฝรั่งทอดรสดั้งเดิม', 10, 'กรุบกรอบ รสชาติดั้งเดิม'),
('ปังปอนด์', 'ขนมปังกรอบรสโรสต์บาร์บีคิว', 11, 'ขนมปังกรอบ อร่อยทุกคำ'),
('โปเต้โรสต์', 'เกลือและพริกไทย', 11, 'กรุบกรอบ รสชาติกลมกล่อม'),
('คิทแคท', 'เวเฟอร์เคลือบช็อคโกแลต', 12, 'Have a break, have a KitKat'),
('สนิกเกอร์', 'ช็อคโกแลตบาร์', 12, 'อร่อยเต็มคำ เต็มพลัง'),
('ไทด์ ผงซักฟอก', 'ผงซักฟอกซักผ้าขาว', 14, 'ซักผ้าสะอาด ขาวสะอาด หอมสดชื่น'),
('แอทแทค ผงซักฟอก', 'ผงซักฟอกกลิ่นหอม', 14, 'ซักสะอาด หอมยาวนาน'),
('ซันไลท์ น้ำยาล้างจาน', 'น้ำยาล้างจานขจัดคราบมัน', 15, 'ล้างจานสะอาดเอี่ยม ขจัดคราบมัน'),
('ไลฟ์บอย น้ำยาล้างจาน', 'น้ำยาล้างจานสูตรมะนาว', 15, 'สะอาดทันใจ กลิ่นมะนาวสดชื่น'),
('สก็อตต์ ทิชชู่', 'กระดาษทิชชู่แบบกล่อง', 16, 'นุ่มพิเศษ แข็งแรง'),
('เคลเนกซ์ ทิชชู่', 'กระดาษทิชชู่พกพา', 16, 'พกพาสะดวก ใช้งานง่าย'),
('มาม่า ต้มยำกุ้ง', 'บะหมี่กึ่งสำเร็จรูปรสต้มยำกุ้ง', 17, 'รสต้มยำกุ้งต้นตำรับ เผ็ดจี๊ด'),
('มาม่า หมูสับ', 'บะหมี่กึ่งสำเร็จรูปรสหมูสับ', 17, 'รสหมูสับ อร่อยคลาสสิค'),
('ยำยำ จัมบ้อกุ้ง', 'บะหมี่กึ่งสำเร็จรูปรสจัมบ้อ', 17, 'รสจัมบ้อกุ้งแซ่บนัว'),
('ทูน่า ซีเล็คท์', 'ทูน่ากระป๋องน้ำมัน', 18, 'ทูน่าคุณภาพดี เนื้อนุ่ม'),
('ซาร์ดีน ทิปโก้', 'ปลาซาร์ดีนกระป๋อง', 18, 'ปลาซาร์ดีนซอสมะเขือเทศ อร่อยพร้อมทาน');

-- Product Variants (45+ items)
INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(1, 'COKE-330', 15.00, 100, 'ขวด', '330ml', 'https://placehold.co/400x400/red/white?text=Coke'),
(1, 'COKE-500', 22.00, 80, 'ขวด', '500ml', 'https://placehold.co/400x400/red/white?text=Coke'),
(1, 'COKE-1.5L', 35.00, 50, 'ขวด', '1.5L', 'https://placehold.co/400x400/red/white?text=Coke'),
(2, 'PEPSI-330', 15.00, 80, 'ขวด', '330ml', 'https://placehold.co/400x400/blue/white?text=Pepsi'),
(2, 'PEPSI-500', 22.00, 60, 'ขวด', '500ml', 'https://placehold.co/400x400/blue/white?text=Pepsi'),
(3, 'SPRITE-330', 15.00, 70, 'ขวด', '330ml', 'https://placehold.co/400x400/green/white?text=Sprite'),
(3, 'SPRITE-1.5L', 35.00, 40, 'ขวด', '1.5L', 'https://placehold.co/400x400/green/white?text=Sprite'),
(4, 'FANTA-330', 15.00, 60, 'ขวด', '330ml', 'https://placehold.co/400x400/orange/white?text=Fanta'),
(5, 'MINUTE-350', 18.00, 60, 'กล่อง', '350ml', 'https://placehold.co/400x400/orange/white?text=Minute'),
(5, 'MINUTE-1L', 38.00, 30, 'กล่อง', '1L', 'https://placehold.co/400x400/orange/white?text=Minute'),
(6, 'OISHI-350', 12.00, 100, 'ขวด', '350ml', 'https://placehold.co/400x400/green/white?text=Oishi'),
(6, 'OISHI-500', 15.00, 80, 'ขวด', '500ml', 'https://placehold.co/400x400/green/white?text=Oishi'),
(7, 'DUTCH-180', 10.00, 90, 'กล่อง', '180ml', 'https://placehold.co/400x400/f0f0f0/333?text=Dutch'),
(7, 'DUTCH-1L', 48.00, 40, 'กล่อง', '1L', 'https://placehold.co/400x400/f0f0f0/333?text=Dutch'),
(8, 'HILO-200', 12.00, 70, 'กล่อง', '200ml', 'https://placehold.co/400x400/blue/white?text=HiLo'),
(8, 'HILO-1L', 52.00, 35, 'กล่อง', '1L', 'https://placehold.co/400x400/blue/white?text=HiLo'),
(9, 'SING-600', 7.00, 150, 'ขวด', '600ml', 'https://placehold.co/400x400/skyblue/white?text=Sing'),
(9, 'SING-1.5L', 12.00, 80, 'ขวด', '1.5L', 'https://placehold.co/400x400/skyblue/white?text=Sing'),
(10, 'CRYS-600', 7.00, 120, 'ขวด', '600ml', 'https://placehold.co/400x400/lightblue/white?text=Crystal'),
(11, 'REDBULL-150', 10.00, 100, 'กระป๋อง', '150ml', 'https://placehold.co/400x400/blue/silver?text=RedBull'),
(12, 'CARABAO-150', 10.00, 120, 'กระป๋อง', '150ml', 'https://placehold.co/400x400/red/white?text=Carabao'),
(12, 'CARABAO-330', 15.00, 80, 'กระป๋อง', '330ml', 'https://placehold.co/400x400/red/white?text=Carabao'),
(13, 'LAYS-CLS-48', 22.00, 60, 'ถุง', '48g', 'https://placehold.co/400x400/yellow/red?text=Lays'),
(13, 'LAYS-CLS-95', 35.00, 40, 'ถุง', '95g', 'https://placehold.co/400x400/yellow/red?text=Lays'),
(14, 'LAYS-BBQ-48', 22.00, 50, 'ถุง', '48g', 'https://placehold.co/400x400/brown/white?text=Lays'),
(15, 'TARO-48', 15.00, 70, 'ถุง', '48g', 'https://placehold.co/400x400/green/white?text=Taro'),
(16, 'PUNG-53', 12.00, 80, 'ถุง', '53g', 'https://placehold.co/400x400/red/yellow?text=Pung'),
(17, 'POTE-65', 15.00, 60, 'กล่อง', '65g', 'https://placehold.co/400x400/orange/white?text=Pote'),
(18, 'KITKAT-17', 10.00, 90, 'แท่ง', '17g', 'https://placehold.co/400x400/red/white?text=KitKat'),
(18, 'KITKAT-PACK4', 35.00, 40, 'แพ็ค', '4 แท่ง', 'https://placehold.co/400x400/red/white?text=KitKat'),
(19, 'SNICKERS-50', 15.00, 70, 'แท่ง', '50g', 'https://placehold.co/400x400/brown/white?text=Snickers'),
(20, 'TIDE-450', 45.00, 50, 'ถุง', '450g', 'https://placehold.co/400x400/orange/white?text=Tide'),
(20, 'TIDE-900', 85.00, 30, 'ถุง', '900g', 'https://placehold.co/400x400/orange/white?text=Tide'),
(21, 'ATTACK-450', 42.00, 55, 'ถุง', '450g', 'https://placehold.co/400x400/purple/white?text=Attack'),
(22, 'SUNLT-400', 28.00, 60, 'ขวด', '400ml', 'https://placehold.co/400x400/yellow/green?text=Sunlight'),
(22, 'SUNLT-900', 55.00, 35, 'ขวด', '900ml', 'https://placehold.co/400x400/yellow/green?text=Sunlight'),
(23, 'LIFEBOY-500', 32.00, 50, 'ขวด', '500ml', 'https://placehold.co/400x400/green/white?text=Lifebuoy'),
(24, 'SCOTT-BOX', 35.00, 45, 'กล่อง', '150 แผ่น', 'https://placehold.co/400x400/blue/white?text=Scott'),
(25, 'KLEENEX-PACK', 12.00, 80, 'แพ็ค', '50 แผ่น', 'https://placehold.co/400x400/lightblue/white?text=Kleenex'),
(26, 'MAMA-TY-60', 6.00, 150, 'ซอง', '60g', 'https://placehold.co/400x400/red/yellow?text=Mama'),
(26, 'MAMA-TY-PACK5', 28.00, 70, 'แพ็ค', '5 ซอง', 'https://placehold.co/400x400/red/yellow?text=Mama'),
(27, 'MAMA-PK-60', 6.00, 140, 'ซอง', '60g', 'https://placehold.co/400x400/orange/white?text=Mama'),
(28, 'YUMYUM-60', 7.00, 100, 'ซอง', '60g', 'https://placehold.co/400x400/green/white?text=YumYum'),
(29, 'TUNA-150', 28.00, 60, 'กระป๋อง', '150g', 'https://placehold.co/400x400/navy/white?text=Tuna'),
(30, 'SARDINE-155', 18.00, 70, 'กระป๋อง', '155g', 'https://placehold.co/400x400/red/white?text=Sardine');
