-- =============================================
-- A-Commerce Seed Data (Demo) - Safe Version
-- ข้อมูลทดสอบสำหรับ development
-- เวอร์ชันนี้จะลบข้อมูลเก่าก่อนใส่ข้อมูลใหม่
-- =============================================

-- ลบข้อมูลเดิมทั้งหมด (เรียงตาม dependency)
DELETE FROM chat_messages;
DELETE FROM chat_sessions;
DELETE FROM chatbot_prompts;
DELETE FROM shipments;
DELETE FROM payments;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM cart_items;
DELETE FROM carts;
DELETE FROM product_embeddings;
DELETE FROM product_variants;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM user_addresses;
DELETE FROM refresh_tokens;
DELETE FROM otp_requests;
DELETE FROM users;

-- Reset sequences
ALTER SEQUENCE users_user_id_seq RESTART WITH 1;
ALTER SEQUENCE categories_category_id_seq RESTART WITH 1;
ALTER SEQUENCE products_product_id_seq RESTART WITH 1;
ALTER SEQUENCE product_variants_variant_id_seq RESTART WITH 1;
ALTER SEQUENCE carts_cart_id_seq RESTART WITH 1;
ALTER SEQUENCE cart_items_id_seq RESTART WITH 1;

-- =============================================
-- 1. ADMIN USER
-- =============================================
-- เบอร์: 0999999999, รหัส OTP: 123456 (DEMO_MODE)
INSERT INTO users (phone_number, full_name, role, is_active, is_verified)
VALUES ('0999999999', 'ผู้ดูแลระบบ', 'admin', TRUE, TRUE);

-- =============================================
-- 2. CATEGORIES (4 หมวดหลัก + หมวดย่อย)
-- =============================================

-- หมวดหมู่หลัก
INSERT INTO categories (category_id, name, parent_id) VALUES
(1, 'เครื่องดื่ม', NULL),
(2, 'ขนมขบเคี้ยว', NULL),
(3, 'ของใช้ในบ้าน', NULL),
(4, 'อาหารสำเร็จรูป', NULL);

-- หมวดหมู่ย่อย - เครื่องดื่ม
INSERT INTO categories (name, parent_id) VALUES
('น้ำอัดลม', 1),
('น้ำผลไม้', 1),
('นม', 1),
('น้ำดื่ม', 1),
('เครื่องดื่มชูกำลัง', 1);

-- หมวดหมู่ย่อย - ขนมขบเคี้ยว
INSERT INTO categories (name, parent_id) VALUES
('มันฝรั่งทอด', 2),
('ขนมกรุบกรอบ', 2),
('ช็อคโกแลต', 2),
('ขนมหวาน', 2);

-- หมวดหมู่ย่อย - ของใช้ในบ้าน
INSERT INTO categories (name, parent_id) VALUES
('ผงซักฟอก', 3),
('น้ำยาล้างจาน', 3),
('กระดาษทิชชู่', 3);

-- หมวดหมู่ย่อย - อาหารสำเร็จรูป
INSERT INTO categories (name, parent_id) VALUES
('บะหมี่กึ่งสำเร็จรูป', 4),
('อาหารกระป๋อง', 4);

-- =============================================
-- 3. สินค้าและ VARIANTS (30+ รายการ)
-- =============================================

-- เครื่องดื่ม - น้ำอัดลม
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(1, 'โค้ก', 'น้ำอัดลมรสดั้งเดิม', 5, 'น้ำอัดลมรสชาติดั้งเดิมที่คุ้นเคย ดื่มเย็นๆ สดชื่นตลอดวัน'),
(2, 'เป๊ปซี่', 'น้ำอัดลมรสโคลา', 5, 'รสชาติโคลาที่ทุกคนชื่นชอบ'),
(3, 'สไปรท์', 'น้ำอัดลมรสเลมอน', 5, 'สดชื่นด้วยรสเลมอนไลม์'),
(4, 'ฟันต้า', 'น้ำอัดลมรสส้ม', 5, 'รสส้มสดใหม่ หวานชื่นใจ');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(1, 'COKE-330', 15.00, 100, 'ขวด', '330ml', 'https://placehold.co/400x400/red/white?text=Coke'),
(1, 'COKE-500', 22.00, 80, 'ขวด', '500ml', 'https://placehold.co/400x400/red/white?text=Coke'),
(1, 'COKE-1.5L', 35.00, 50, 'ขวด', '1.5L', 'https://placehold.co/400x400/red/white?text=Coke'),
(2, 'PEPSI-330', 15.00, 80, 'ขวด', '330ml', 'https://placehold.co/400x400/blue/white?text=Pepsi'),
(2, 'PEPSI-500', 22.00, 60, 'ขวด', '500ml', 'https://placehold.co/400x400/blue/white?text=Pepsi'),
(3, 'SPRITE-330', 15.00, 70, 'ขวด', '330ml', 'https://placehold.co/400x400/green/white?text=Sprite'),
(3, 'SPRITE-1.5L', 35.00, 40, 'ขวด', '1.5L', 'https://placehold.co/400x400/green/white?text=Sprite'),
(4, 'FANTA-330', 15.00, 60, 'ขวด', '330ml', 'https://placehold.co/400x400/orange/white?text=Fanta');

-- เครื่องดื่ม - น้ำผลไม้
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(5, 'มินิทเมด พัลพี่', 'น้ำส้มมีเนื้อ', 6, 'น้ำส้มสดใหม่มีเนื้อส้มแท้'),
(6, 'โออิชิ กรีนที', 'ชาเขียวน้ำผึ้ง', 6, 'ชาเขียวรสหวานนุ่ม ผสมน้ำผึ้ง');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(5, 'MINUTE-350', 18.00, 60, 'กล่อง', '350ml', 'https://placehold.co/400x400/orange/white?text=Minute'),
(5, 'MINUTE-1L', 38.00, 30, 'กล่อง', '1L', 'https://placehold.co/400x400/orange/white?text=Minute'),
(6, 'OISHI-350', 12.00, 100, 'ขวด', '350ml', 'https://placehold.co/400x400/green/white?text=Oishi'),
(6, 'OISHI-500', 15.00, 80, 'ขวด', '500ml', 'https://placehold.co/400x400/green/white?text=Oishi');

-- เครื่องดื่ม - นม
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(7, 'ดัชมิลล์ นมสด', 'นมสดพาสเจอร์ไรส์', 7, 'นมสดคุณภาพดี โปรตีนสูง'),
(8, 'ไฮโล สูตรทอฬด์', 'นมUHT สูตรทอฬด์', 7, 'นมUHT รสหวานมัน เหมาะสำหรับทุกวัย');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(7, 'DUTCH-180', 10.00, 90, 'กล่อง', '180ml', 'https://placehold.co/400x400/f0f0f0/333?text=Dutch'),
(7, 'DUTCH-1L', 48.00, 40, 'กล่อง', '1L', 'https://placehold.co/400x400/f0f0f0/333?text=Dutch'),
(8, 'HILO-200', 12.00, 70, 'กล่อง', '200ml', 'https://placehold.co/400x400/blue/white?text=HiLo'),
(8, 'HILO-1L', 52.00, 35, 'กล่อง', '1L', 'https://placehold.co/400x400/blue/white?text=HiLo');

-- เครื่องดื่ม - น้ำดื่ม
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(9, 'สิงห์ น้ำดื่ม', 'น้ำดื่มบรรจุขวด', 8, 'น้ำดื่มสะอาด ผ่านกระบวนการกรองคุณภาพ'),
(10, 'คริสตัล น้ำดื่ม', 'น้ำดื่มบรรจุขวด', 8, 'น้ำดื่มคุณภาพ สะอาดปลอดภัย');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(9, 'SING-600', 7.00, 150, 'ขวด', '600ml', 'https://placehold.co/400x400/skyblue/white?text=Sing'),
(9, 'SING-1.5L', 12.00, 80, 'ขวด', '1.5L', 'https://placehold.co/400x400/skyblue/white?text=Sing'),
(10, 'CRYS-600', 7.00, 120, 'ขวด', '600ml', 'https://placehold.co/400x400/lightblue/white?text=Crystal');

-- เครื่องดื่ม - เครื่องดื่มชูกำลัง
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(11, 'เรดบูล', 'เครื่องดื่มชูกำลัง', 9, 'เติมพลังให้คุณตลอดวัน'),
(12, 'คาราบาว แดง', 'เครื่องดื่มชูกำลัง', 9, 'ชูกำลังสูตรไทย รสชาติดั้งเดิม');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(11, 'REDBULL-150', 10.00, 100, 'กระป๋อง', '150ml', 'https://placehold.co/400x400/blue/silver?text=RedBull'),
(12, 'CARABAO-150', 10.00, 120, 'กระป๋อง', '150ml', 'https://placehold.co/400x400/red/white?text=Carabao'),
(12, 'CARABAO-330', 15.00, 80, 'กระป๋อง', '330ml', 'https://placehold.co/400x400/red/white?text=Carabao');

-- ขนมขบเคี้ยว - มันฝรั่งทอด
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(13, 'เลย์ คลาสสิค', 'มันฝรั่งทอดรสธรรมชาติ', 10, 'กรุบกรอบ อร่อยทุกคำ'),
(14, 'เลย์ บาร์บีคิว', 'มันฝรั่งทอดรสบาร์บีคิว', 10, 'รสบาร์บีคิวเข้มข้น หอมหวาน'),
(15, 'ทาโร้ รสต้นตำรับ', 'มันฝรั่งทอดรสดั้งเดิม', 10, 'กรุบกรอบ รสชาติดั้งเดิม');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(13, 'LAYS-CLS-48', 22.00, 60, 'ถุง', '48g', 'https://placehold.co/400x400/yellow/red?text=Lays'),
(13, 'LAYS-CLS-95', 35.00, 40, 'ถุง', '95g', 'https://placehold.co/400x400/yellow/red?text=Lays'),
(14, 'LAYS-BBQ-48', 22.00, 50, 'ถุง', '48g', 'https://placehold.co/400x400/brown/white?text=Lays'),
(15, 'TARO-48', 15.00, 70, 'ถุง', '48g', 'https://placehold.co/400x400/green/white?text=Taro');

-- ขนมขบเคี้ยว - ขนมกรุบกรอบ
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(16, 'ปังปอนด์', 'ขนมปังกรอบรสโรสต์บาร์บีคิว', 11, 'ขนมปังกรอบ อร่อยทุกคำ'),
(17, 'โปเต้โรสต์', 'เกลือและพริกไทย', 11, 'กรุบกรอบ รสชาติกลมกล่อม');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(16, 'PUNG-53', 12.00, 80, 'ถุง', '53g', 'https://placehold.co/400x400/red/yellow?text=Pung'),
(17, 'POTE-65', 15.00, 60, 'กล่อง', '65g', 'https://placehold.co/400x400/orange/white?text=Pote');

-- ขนมขบเคี้ยว - ช็อคโกแลต
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(18, 'คิทแคท', 'เวเฟอร์เคลือบช็อคโกแลต', 12, 'Have a break, have a KitKat'),
(19, 'สนิกเกอร์', 'ช็อคโกแลตบาร์', 12, 'อร่อยเต็มคำ เต็มพลัง');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(18, 'KITKAT-17', 10.00, 90, 'แท่ง', '17g', 'https://placehold.co/400x400/red/white?text=KitKat'),
(18, 'KITKAT-PACK4', 35.00, 40, 'แพ็ค', '4 แท่ง', 'https://placehold.co/400x400/red/white?text=KitKat'),
(19, 'SNICKERS-50', 15.00, 70, 'แท่ง', '50g', 'https://placehold.co/400x400/brown/white?text=Snickers');

-- ของใช้ในบ้าน - ผงซักฟอก
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(20, 'ไทด์ ผงซักฟอก', 'ผงซักฟอกซักผ้าขาว', 14, 'ซักผ้าสะอาด ขาวสะอาด หอมสดชื่น'),
(21, 'แอทแทค ผงซักฟอก', 'ผงซักฟอกกลิ่นหอม', 14, 'ซักสะอาด หอมยาวนาน');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(20, 'TIDE-450', 45.00, 50, 'ถุง', '450g', 'https://placehold.co/400x400/orange/white?text=Tide'),
(20, 'TIDE-900', 85.00, 30, 'ถุง', '900g', 'https://placehold.co/400x400/orange/white?text=Tide'),
(21, 'ATTACK-450', 42.00, 55, 'ถุง', '450g', 'https://placehold.co/400x400/purple/white?text=Attack');

-- ของใช้ในบ้าน - น้ำยาล้างจาน
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(22, 'ซันไลท์ น้ำยาล้างจาน', 'น้ำยาล้างจานขจัดคราบมัน', 15, 'ล้างจานสะอาดเอี่ยม ขจัดคราบมัน'),
(23, 'ไลฟ์บอย น้ำยาล้างจาน', 'น้ำยาล้างจานสูตรมะนาว', 15, 'สะอาดทันใจ กลิ่นมะนาวสดชื่น');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(22, 'SUNLT-400', 28.00, 60, 'ขวด', '400ml', 'https://placehold.co/400x400/yellow/green?text=Sunlight'),
(22, 'SUNLT-900', 55.00, 35, 'ขวด', '900ml', 'https://placehold.co/400x400/yellow/green?text=Sunlight'),
(23, 'LIFEBOY-500', 32.00, 50, 'ขวด', '500ml', 'https://placehold.co/400x400/green/white?text=Lifebuoy');

-- ของใช้ในบ้าน - กระดาษทิชชู่
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(24, 'สก็อตต์ ทิชชู่', 'กระดาษทิชชู่แบบกล่อง', 16, 'นุ่มพิเศษ แข็งแรง'),
(25, 'เคลเนกซ์ ทิชชู่', 'กระดาษทิชชู่พกพา', 16, 'พกพาสะดวก ใช้งานง่าย');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(24, 'SCOTT-BOX', 35.00, 45, 'กล่อง', '150 แผ่น', 'https://placehold.co/400x400/blue/white?text=Scott'),
(25, 'KLEENEX-PACK', 12.00, 80, 'แพ็ค', '50 แผ่น', 'https://placehold.co/400x400/lightblue/white?text=Kleenex');

-- อาหารสำเร็จรูป - บะหมี่กึ่งสำเร็จรูป
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(26, 'มาม่า ต้มยำกุ้ง', 'บะหมี่กึ่งสำเร็จรูปรสต้มยำกุ้ง', 17, 'รสต้มยำกุ้งต้นตำรับ เผ็ดจี๊ด'),
(27, 'มาม่า หมูสับ', 'บะหมี่กึ่งสำเร็จรูปรสหมูสับ', 17, 'รสหมูสับ อร่อยคลาสสิค'),
(28, 'ยำยำ จัมบ้อกุ้ง', 'บะหมี่กึ่งสำเร็จรูปรสจัมบ้อ', 17, 'รสจัมบ้อกุ้งแซ่บนัว');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(26, 'MAMA-TY-60', 6.00, 150, 'ซอง', '60g', 'https://placehold.co/400x400/red/yellow?text=Mama'),
(26, 'MAMA-TY-PACK5', 28.00, 70, 'แพ็ค', '5 ซอง', 'https://placehold.co/400x400/red/yellow?text=Mama'),
(27, 'MAMA-PK-60', 6.00, 140, 'ซอง', '60g', 'https://placehold.co/400x400/orange/white?text=Mama'),
(28, 'YUMYUM-60', 7.00, 100, 'ซอง', '60g', 'https://placehold.co/400x400/green/white?text=YumYum');

-- อาหารสำเร็จรูป - อาหารกระป๋อง
INSERT INTO products (product_id, name, description, category_id, marketing_copy) VALUES
(29, 'ทูน่า ซีเล็คท์', 'ทูน่ากระป๋องน้ำมัน', 18, 'ทูน่าคุณภาพดี เนื้อนุ่ม'),
(30, 'ซาร์ดีน ทิปโก้', 'ปลาซาร์ดีนกระป๋อง', 18, 'ปลาซาร์ดีนซอสมะเขือเทศ อร่อยพร้อมทาน');

INSERT INTO product_variants (product_id, sku, price, stock_quantity, unit, size, image_url) VALUES
(29, 'TUNA-150', 28.00, 60, 'กระป๋อง', '150g', 'https://placehold.co/400x400/navy/white?text=Tuna'),
(30, 'SARDINE-155', 18.00, 70, 'กระป๋อง', '155g', 'https://placehold.co/400x400/red/white?text=Sardine');

-- ตั้งค่า sequence ให้ถูกต้อง
SELECT setval('categories_category_id_seq', (SELECT MAX(category_id) FROM categories));
SELECT setval('products_product_id_seq', (SELECT MAX(product_id) FROM products));
