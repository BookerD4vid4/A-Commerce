# Data Flow Diagram — Level 2: P5 แชท AI (AI Chatbot)

## คำอธิบาย

แตก Process P5 ออกเป็น **6 Sub-Process** แสดงรายละเอียดการสนทนากับ AI, การค้นหาสินค้าด้วย Semantic Search, และการสั่งซื้อผ่านแชท

---

## รายการ Sub-Process

| Process | ชื่อ | คำอธิบาย |
|---------|------|----------|
| P5.1 | สร้าง/โหลด Session | สร้าง Session ใหม่ หรือ โหลดประวัติ |
| P5.2 | ตรวจจับเจตนา | วิเคราะห์ข้อความว่าต้องการอะไร |
| P5.3 | ค้นหาสินค้า (Semantic) | แปลงข้อความเป็น Embedding + ค้นด้วย pgvector |
| P5.4 | ดึงข้อมูลตะกร้าจริง | อ่านตะกร้าจาก DB สำหรับ Checkout/Cart queries |
| P5.5 | สร้างคำตอบ (LLM) | รวม Context + เรียก Typhoon LLM |
| P5.6 | ประมวลผล Action | เพิ่มตะกร้า, แสดง UI Components |

---

## แผนภาพ

```mermaid
graph TB
    Customer["ลูกค้า"]
    TyphoonAPI["Typhoon LLM"]
    GeminiAPI["Gemini API"]

    P5_1(("P5.1\nสร้าง/โหลด\nSession"))
    P5_2(("P5.2\nตรวจจับ\nเจตนา"))
    P5_3(("P5.3\nค้นหาสินค้า\nSemantic"))
    P5_4(("P5.4\nดึงข้อมูล\nตะกร้าจริง"))
    P5_5(("P5.5\nสร้างคำตอบ\nLLM"))
    P5_6(("P5.6\nประมวลผล\nAction"))

    D5_sess[("D5.1 chat_sessions")]
    D5_msg[("D5.2 chat_messages")]
    D5_prompt[("D5.3 chatbot_prompts")]
    D6_embed[("D6 product_embeddings")]
    D2_prod[("D2 products + variants")]
    D3_cart[("D3 carts + cart_items")]

    %% P5.1: Session Management
    Customer -->|"session_token / user_id"| P5_1
    P5_1 -->|"อ่าน/สร้าง session"| D5_sess
    D5_sess -->|"session_id"| P5_1
    P5_1 -->|"อ่านประวัติ"| D5_msg
    D5_msg -->|"ข้อความเก่า"| P5_1
    P5_1 -->|"session_id, ประวัติแชท"| Customer

    %% P5.2: Intent Detection
    Customer -->|"ข้อความแชท"| P5_2
    P5_2 -->|"เขียน user message"| D5_msg
    P5_2 -->|"intent: search/order/checkout/\nnegation/general"| P5_3
    P5_2 -->|"intent: checkout/cart query"| P5_4

    %% P5.3: Semantic Search
    P5_2 -->|"ข้อความค้นหา"| P5_3
    P5_3 -->|"ข้อความ"| GeminiAPI
    GeminiAPI -->|"query embedding (768 มิติ)"| P5_3
    P5_3 -->|"cosine similarity search"| D6_embed
    D6_embed -->|"product_ids ที่คล้ายกัน (>0.55)"| P5_3
    P5_3 -->|"อ่านข้อมูลสินค้า"| D2_prod
    D2_prod -->|"ชื่อ, ราคา, stock, variant"| P5_3
    P5_3 -->|"สินค้าที่ค้นเจอ + variant info"| P5_5

    %% P5.4: Cart Summary
    P5_4 -->|"อ่านตะกร้าของ user"| D3_cart
    D3_cart -->|"cart_items + variant + price"| P5_4
    P5_4 -->|"ข้อมูลตะกร้าจริง\n(ชื่อ, จำนวน, ราคา, ยอดรวม)"| P5_5

    %% P5.5: LLM Response Generation
    P5_5 -->|"อ่าน System Prompt"| D5_prompt
    D5_prompt -->|"system prompt"| P5_5
    P5_5 -->|"อ่านประวัติ 6 ข้อความล่าสุด"| D5_msg
    D5_msg -->|"chat history"| P5_5
    P5_5 -->|"system prompt + intent hint\n+ products + cart + history"| TyphoonAPI
    TyphoonAPI -->|"คำตอบภาษาไทย + metadata"| P5_5
    P5_5 -->|"เขียน assistant message"| D5_msg
    P5_5 -->|"content, products[], action,\nvariants[], orderProduct"| P5_6

    %% P5.6: Action Processing
    P5_6 -->|"คำตอบ + สินค้าแนะนำ +\nAction UI Component"| Customer
```

---

## ตาราง Data Flow

### P5.1 — สร้าง/โหลด Session
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| ลูกค้า | P5.1 | session_token (guest) หรือ user_id (logged-in) |
| P5.1 | D5.1 (sessions) | SELECT/INSERT session |
| D5.1 | P5.1 | session_id |
| P5.1 | D5.2 (messages) | SELECT messages WHERE session_id |
| D5.2 | P5.1 | ประวัติข้อความ |
| P5.1 | ลูกค้า | session_id, messages[] |

### P5.2 — ตรวจจับเจตนา (Intent Detection)
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| ลูกค้า | P5.2 | ข้อความแชท |
| P5.2 | D5.2 | INSERT user message |
| P5.2 | P5.3 | ข้อความ + intent (ถ้าเป็น search/order) |
| P5.2 | P5.4 | user_id + intent (ถ้าเป็น checkout/cart query) |

**วิธีตรวจจับ:**
| เจตนา | Keywords ที่จับ |
|--------|----------------|
| NEGATION | ไม่เอา, ไม่ต้อง, ยกเลิก |
| CHECKOUT | ชำระเงิน, สั่งซื้อ, จ่ายเงิน, เช็คเอาท์ |
| ORDER | เอา, ขอ, ต้องการ, สั่ง + ชื่อสินค้า |
| SEARCH | มีอะไร, แนะนำ, หา, ค้นหา |
| GENERAL | (ทุกอย่างที่ไม่ตรงข้างบน) |

### P5.3 — ค้นหาสินค้า (Semantic Search)
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| P5.2 | P5.3 | ข้อความค้นหา |
| P5.3 | Gemini | ข้อความ (สำหรับสร้าง query embedding) |
| Gemini | P5.3 | embedding vector (768 มิติ) |
| P5.3 | D6 (embeddings) | query vector (cosine similarity search) |
| D6 | P5.3 | product_ids ที่มี similarity > 0.55 |
| P5.3 | D2 (products) | อ่านข้อมูลสินค้า + variant ตาม product_ids |
| D2 | P5.3 | name, price, stock, size, unit, image |
| P5.3 | P5.5 | สินค้าที่ค้นเจอ + variant info |

### P5.4 — ดึงข้อมูลตะกร้าจริง
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| P5.2 | P5.4 | user_id |
| P5.4 | D3 (carts + items) | SELECT cart_items JOIN variants JOIN products WHERE user_id |
| D3 | P5.4 | ชื่อสินค้า, ขนาด, จำนวน, ราคา |
| P5.4 | P5.5 | ข้อความสรุปตะกร้าจริง (ห้าม AI แต่งเอง) |

### P5.5 — สร้างคำตอบ (LLM)
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| P5.3 | P5.5 | สินค้าที่ค้นเจอ |
| P5.4 | P5.5 | ข้อมูลตะกร้าจริง |
| P5.5 | D5.3 (prompts) | อ่าน System Prompt |
| P5.5 | D5.2 (messages) | อ่านประวัติ 6 ข้อความล่าสุด |
| P5.5 | Typhoon | Prompt รวม: system + intent + products + cart + history |
| Typhoon | P5.5 | คำตอบภาษาไทย |
| P5.5 | D5.2 | INSERT assistant message + metadata |
| P5.5 | P5.6 | content, products[], action, variants[], orderProduct |

### P5.6 — ประมวลผล Action (Frontend)
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| P5.5 | P5.6 | action type + data |
| P5.6 | ลูกค้า | UI Component ตาม action: |

**Action → Data ที่ส่งให้ลูกค้า:**
| Action | Data Flow ไปลูกค้า |
|--------|-------------------|
| add_to_cart | orderProduct (variant_id, qty) → เพิ่มตะกร้าอัตโนมัติ |
| select_variant | variants[] → แสดง Variant Selector |
| show_addresses | (trigger) → แสดง Address Selector |
| show_payment_method | address_id → แสดง Payment Selector |
| show_qr | order_id, payment_id → แสดง QR + polling |
| show_cod_confirm | order_id → แสดงยืนยัน COD |
| (ไม่มี) | products[] → แสดง Product Cards |
