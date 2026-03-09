flowchart TD
    U(["👤 User"])
    SMS(["📱 SMS Gateway"])
    DS1[("users")]

    P11["1.1 รับเบอร์โทร\n& Validate Format"]
    P12["1.2 ตรวจสอบ User\nในระบบ"]
    P13["1.3 สร้าง OTP\n& กำหนด Expiry"]
    P14["1.4 ส่ง OTP\nผ่าน SMS"]
    P15["1.5 รับ OTP\n& ตรวจสอบ"]
    P16["1.6 ออก JWT Token\n(Role: user/admin)"]

    U -->|"เบอร์โทร"| P11
    P11 -->|"เบอร์ที่ valid"| P12
    P12 <-->|"ค้นหา user ด้วยเบอร์"| DS1
    P12 -->|"สร้าง/อัพเดต record"| P13
    P13 <-->|"บันทึก otp_hash + expiry"| DS1
    P13 -->|"OTP พร้อมส่ง"| P14
    P14 -->|"ขอส่ง OTP"| SMS
    SMS -->|"OTP 6 หลัก"| U
    U -->|"กรอก OTP"| P15
    P15 <-->|"ดึง otp_hash + expiry"| DS1
    P15 -->|"OTP ถูกต้อง + ยังไม่หมดอายุ"| P16
    P16 <-->|"อ่าน role จาก users"| DS1
    P16 -->|"JWT Token"| U

flowchart TD
    U(["👤 User"])
    DS2[("products + embeddings")]

    P21["2.1 รับ Request\n(Browse / Search)"]
    P22["2.2 Filter & Sort\n(ราคา / หมวดหมู่)"]
    P23["2.3 Pagination\n& จัดรูปแบบผลลัพธ์"]
    P24["2.4 ดูรายละเอียด\nสินค้าเดี่ยว"]

    U -->|"เปิดหน้า Catalog"| P21
    U -->|"กรอง / เรียงลำดับ"| P22
    P21 <-->|"GET /products"| DS2
    P22 <-->|"query พร้อม filter"| DS2
    P22 -->|"สินค้าที่กรองแล้ว"| P23
    P21 -->|"สินค้าทั้งหมด"| P23
    P23 -->|"รายการสินค้า + Pagination"| U
    U -->|"กดดูสินค้า"| P24
    P24 <-->|"GET /products/:id"| DS2
    P24 -->|"ข้อมูลสินค้าละเอียด"| U

flowchart TD
    U(["👤 User"])
    DS2[("products + embeddings")]
    DS3[("cart_items")]

    P31["3.1 เพิ่มสินค้า\nลง Cart"]
    P32["3.2 ตรวจสอบ Stock\n& ราคา"]
    P33["3.3 อัพเดต\nจำนวนสินค้า"]
    P34["3.4 ลบสินค้า\nออกจาก Cart"]
    P35["3.5 คำนวณ\nราคารวม"]
    P36["3.6 แสดง\nCart Summary"]

    U -->|"กด Add to Cart"| P31
    P31 <-->|"ตรวจสอบสินค้ามีอยู่"| DS2
    P31 -->|"product_id + qty"| P32
    P32 <-->|"ตรวจ stock"| DS2
    P32 -->|"ข้อมูลผ่าน"| P33
    P33 <-->|"INSERT / UPDATE cart_items"| DS3
    P33 -->|"Cart อัพเดตแล้ว"| P35

    U -->|"แก้ไขจำนวน"| P33
    U -->|"กดลบสินค้า"| P34
    P34 <-->|"DELETE cart_items"| DS3
    P34 -->|"Cart อัพเดตแล้ว"| P35

    P35 <-->|"อ่าน cart_items ทั้งหมด"| DS3
    P35 <-->|"ดึงราคาปัจจุบัน"| DS2
    P35 -->|"ราคารวม"| P36
    P36 -->|"Cart Summary"| U

flowchart TD
    U(["👤 User"])
    OMISE(["💳 Omise"])
    DS3[("cart_items")]
    DS4[("orders")]
    DS5[("payments")]

    P41["4.1 ตรวจสอบ Cart\n& คำนวณราคาสุดท้าย"]
    P42["4.2 รับ & Validate\nDelivery Info"]
    P43["4.3 เลือกวิธี\nชำระเงิน"]
    P44["4.4 PromptPay:\nขอ QR Code"]
    P45["4.5 COD:\nสร้าง Order ทันที"]
    P46["4.6 รอ & รับ\nWebhook Omise"]
    P47["4.7 สร้าง Order\n& ล้าง Cart"]
    P48["4.8 แจ้ง\nOrder Confirmation"]

    U -->|"กด Checkout"| P41
    P41 <-->|"อ่าน cart_items"| DS3
    P41 -->|"รายการ + ราคารวม"| P42
    U -->|"ชื่อ / ที่อยู่ / เบอร์"| P42
    P42 -->|"ข้อมูลครบและ valid"| P43
    U -->|"เลือก PromptPay / COD"| P43

    P43 -- PromptPay --> P44
    P44 -->|"สร้าง Charge Request"| OMISE
    OMISE -->|"QR Code URL"| P44
    P44 -->|"แสดง QR Code"| U
    OMISE -->|"Webhook: status=paid"| P46
    P46 --> P47

    P43 -- COD --> P45
    P45 --> P47

    P47 <-->|"INSERT orders"| DS4
    P47 <-->|"INSERT payments"| DS5
    P47 <-->|"DELETE cart_items"| DS3
    P47 --> P48
    P48 -->|"Order ID + สถานะ"| U

flowchart TD
    U(["👤 User"])
    GEMINI(["🧠 Gemini Embedding"])
    TYPHOON(["🤖 Typhoon 2.5"])
    DS2[("products + embeddings")]

    P51["5.1 รับข้อความ\n& Validate JWT"]
    P52["5.2 ส่งข้อความ\nไปสร้าง Embedding"]
    P53["5.3 Vector Similarity\nSearch (pgvector)"]
    P54["5.4 ดึงข้อมูลสินค้า\nที่เกี่ยวข้อง"]
    P55["5.5 สร้าง Prompt\n+ Context"]
    P56["5.6 ส่งไปยัง LLM\n& รับคำตอบ"]
    P57["5.7 Format Response\n& Return"]

    U -->|"ข้อความถาม + JWT"| P51
    P51 -->|"ข้อความที่ผ่าน auth"| P52
    P52 -->|"raw text"| GEMINI
    GEMINI -->|"Vector [1536 dims]"| P53
    P53 <-->|"cosine similarity query"| DS2
    P53 -->|"Top-K product IDs"| P54
    P54 <-->|"GET product details"| DS2
    P54 -->|"ข้อมูลสินค้าที่เกี่ยวข้อง"| P55
    P51 -->|"ข้อความต้นฉบับ"| P55
    P55 -->|"Structured Prompt"| P56
    P56 -->|"Prompt + Context"| TYPHOON
    TYPHOON -->|"Raw Response"| P57
    P57 -->|"คำตอบ + สินค้าแนะนำ"| U

flowchart TD
    A(["👨‍💼 Admin"])
    GEMINI(["🧠 Gemini Embedding"])
    DS2[("products + embeddings")]

    P61["6.1 รับข้อมูลสินค้า\n& Validate"]
    P62["6.2 สร้าง Embedding\nจากชื่อ + รายละเอียด"]
    P63["6.3 INSERT สินค้าใหม่\n+ Vector"]
    P64["6.4 แก้ไขข้อมูล\nสินค้า"]
    P65["6.5 Re-generate\nEmbedding (ถ้าแก้ text)"]
    P66["6.6 ลบสินค้า\n& Vector"]

    A -->|"ข้อมูลสินค้าใหม่"| P61
    P61 -->|"ข้อมูลที่ valid"| P62
    P62 -->|"ชื่อ + description"| GEMINI
    GEMINI -->|"Embedding Vector"| P62
    P62 -->|"ข้อมูล + Vector พร้อม"| P63
    P63 <-->|"INSERT products + embedding"| DS2
    P63 -->|"ยืนยันเพิ่มสำเร็จ"| A

    A -->|"ข้อมูลที่ต้องการแก้"| P64
    P64 <-->|"UPDATE products"| DS2
    P64 -->|"มีการแก้ text?"| P65
    P65 -->|"text ใหม่"| GEMINI
    GEMINI -->|"Vector ใหม่"| P65
    P65 <-->|"UPDATE embedding"| DS2
    P65 -->|"ยืนยันแก้ไขสำเร็จ"| A

    A -->|"product_id ที่ต้องการลบ"| P66
    P66 <-->|"DELETE product + embedding"| DS2
    P66 -->|"ยืนยันลบสำเร็จ"| A

flowchart TD
    A(["👨‍💼 Admin"])
    DS4[("orders")]
    DS5[("payments")]
    DS1[("users")]

    P71["7.1 ดู Orders\nทั้งหมด (+ Filter)"]
    P72["7.2 ดูรายละเอียด\nOrder เดี่ยว"]
    P73["7.3 อัพเดต\nOrder Status"]
    P74["7.4 ตรวจสอบ\nสถานะ Payment"]

    A -->|"เปิดหน้า Orders"| P71
    P71 <-->|"GET orders (filter/sort)"| DS4
    P71 -->|"รายการ Orders ทั้งหมด"| A

    A -->|"กดดู Order"| P72
    P72 <-->|"GET order by ID"| DS4
    P72 <-->|"GET payment by order_id"| DS5
    P72 <-->|"GET user info"| DS1
    P72 -->|"รายละเอียด Order ครบ"| A

    A -->|"เปลี่ยน Status"| P73
    P73 <-->|"UPDATE order status"| DS4
    P73 -->|"Status อัพเดตแล้ว"| A

    A -->|"ตรวจสอบการชำระ"| P74
    P74 <-->|"GET payment record"| DS5
    P74 -->|"สถานะ Payment"| A

flowchart TD
    A(["👨‍💼 Admin"])
    DS1[("users")]
    DS4[("orders")]

    P81["8.1 ดู Users\nทั้งหมด (+ Filter)"]
    P82["8.2 ดูประวัติ\nการสั่งซื้อ"]
    P83["8.3 Block /\nUnblock User"]
    P84["8.4 เปลี่ยน Role\n(user / admin)"]

    A -->|"เปิดหน้า Users"| P81
    P81 <-->|"GET users (filter)"| DS1
    P81 -->|"รายชื่อ Users"| A

    A -->|"กดดูประวัติ User"| P82
    P82 <-->|"GET orders by user_id"| DS4
    P82 <-->|"GET user detail"| DS1
    P82 -->|"ประวัติการสั่งซื้อ"| A

    A -->|"สั่ง Block / Unblock"| P83
    P83 <-->|"UPDATE user.is_active"| DS1
    P83 -->|"ยืนยันสำเร็จ"| A

    A -->|"เปลี่ยน Role"| P84
    P84 <-->|"UPDATE user.role"| DS1
    P84 -->|"ยืนยันสำเร็จ"| A

