# Data Flow Diagram — Level 2: P2+P3 สินค้าและตะกร้า (Product & Cart)

## คำอธิบาย

แตก Process P2 (จัดการสินค้า) และ P3 (จัดการตะกร้า) ออกเป็น Sub-Process ย่อย

---

## รายการ Sub-Process

### P2 — จัดการสินค้า
| Process | ชื่อ | คำอธิบาย |
|---------|------|----------|
| P2.1 | โหลดหมวดหมู่ | ดึงรายการหมวดหมู่สินค้า |
| P2.2 | ค้นหาสินค้า | ค้นหาตามชื่อ/หมวดหมู่ |
| P2.3 | โหลดรายละเอียดสินค้า | ดึงข้อมูล + Variant ของสินค้า |

### P3 — จัดการตะกร้า
| Process | ชื่อ | คำอธิบาย |
|---------|------|----------|
| P3.1 | เพิ่มสินค้าลงตะกร้า | จอง Stock + สร้าง cart_item |
| P3.2 | แก้ไข/ลบสินค้าในตะกร้า | เปลี่ยนจำนวน หรือ ลบออก |
| P3.3 | ดึงข้อมูลตะกร้า | โหลดรายการ + คำนวณยอดรวม |
| P3.4 | Sync ตะกร้า Guest | รวมสินค้าจาก Guest เข้า DB |
| P3.5 | คืน Stock หมดอายุ | Background task ทุก 60 วินาที |

---

## แผนภาพ P2 — จัดการสินค้า

```mermaid
graph TB
    Customer["ลูกค้า"]

    P2_1(("P2.1\nโหลด\nหมวดหมู่"))
    P2_2(("P2.2\nค้นหา\nสินค้า"))
    P2_3(("P2.3\nโหลดรายละเอียด\nสินค้า"))

    D2_cat[("D2.1 categories")]
    D2_prod[("D2.2 products")]
    D2_var[("D2.3 product_variants")]

    Customer -->|"(เปิดหน้าแรก)"| P2_1
    P2_1 -->|"อ่านหมวดหมู่"| D2_cat
    D2_cat -->|"category_id, name, product_count"| P2_1
    P2_1 -->|"รายการหมวดหมู่"| Customer

    Customer -->|"คำค้นหา, category_id"| P2_2
    P2_2 -->|"query + filter"| D2_prod
    D2_prod -->|"product_id, name, min_price, max_price, image_url"| P2_2
    P2_2 -->|"รายการสินค้า (ProductCard[])"| Customer

    Customer -->|"product_id"| P2_3
    P2_3 -->|"อ่านสินค้า"| D2_prod
    D2_prod -->|"name, description"| P2_3
    P2_3 -->|"อ่าน Variant"| D2_var
    D2_var -->|"variant_id, sku, price, stock, size, unit"| P2_3
    P2_3 -->|"รายละเอียดสินค้า + Variant[]"| Customer
```

---

## แผนภาพ P3 — จัดการตะกร้า

```mermaid
graph TB
    Customer["ลูกค้า"]
    Timer["Background Timer\n(ทุก 60 วินาที)"]

    P3_1(("P3.1\nเพิ่มสินค้า\nลงตะกร้า"))
    P3_2(("P3.2\nแก้ไข/ลบ\nสินค้า"))
    P3_3(("P3.3\nดึงข้อมูล\nตะกร้า"))
    P3_4(("P3.4\nSync ตะกร้า\nGuest"))
    P3_5(("P3.5\nคืน Stock\nหมดอายุ"))

    D3_cart[("D3.1 carts")]
    D3_items[("D3.2 cart_items")]
    D2_var2[("D2.3 product_variants")]

    %% P3.1: Add to cart
    Customer -->|"variant_id, quantity"| P3_1
    P3_1 -->|"ตรวจ stock"| D2_var2
    D2_var2 -->|"stock_quantity"| P3_1
    P3_1 -->|"หัก stock_quantity"| D2_var2
    P3_1 -->|"อ่าน/สร้าง cart"| D3_cart
    P3_1 -->|"INSERT cart_item (reserved_at=now)"| D3_items
    P3_1 -->|"ผลการเพิ่ม (สำเร็จ/stock ไม่พอ)"| Customer

    %% P3.2: Update/Remove
    Customer -->|"item_id, new_quantity / ลบ"| P3_2
    P3_2 -->|"อ่าน cart_item เดิม"| D3_items
    D3_items -->|"quantity เดิม, variant_id"| P3_2
    P3_2 -->|"ปรับ stock (คืน/หักส่วนต่าง)"| D2_var2
    P3_2 -->|"UPDATE/DELETE cart_item"| D3_items
    P3_2 -->|"ตะกร้าอัพเดท"| Customer

    %% P3.3: Fetch cart
    Customer -->|"(เปิดตะกร้า)"| P3_3
    P3_3 -->|"อ่าน cart ของ user"| D3_cart
    D3_cart -->|"cart_id"| P3_3
    P3_3 -->|"อ่าน items + variant info"| D3_items
    D3_items -->|"items + price + name"| P3_3
    P3_3 -->|"รายการตะกร้า, ยอดรวม"| Customer

    %% P3.4: Sync guest cart
    Customer -->|"guestCart[] (จาก localStorage)"| P3_4
    P3_4 -->|"สร้าง cart (ถ้ายังไม่มี)"| D3_cart
    P3_4 -->|"ตรวจ stock ทีละรายการ"| D2_var2
    P3_4 -->|"หัก stock + INSERT cart_items"| D3_items
    P3_4 -->|"ผล sync (สำเร็จ/บางรายการ stock ไม่พอ)"| Customer

    %% P3.5: Expire reservation
    Timer -->|"(trigger ทุก 60 วินาที)"| P3_5
    P3_5 -->|"หา items ที่ reserved_at > 30 นาที"| D3_items
    D3_items -->|"expired items + quantity"| P3_5
    P3_5 -->|"คืน stock_quantity"| D2_var2
    P3_5 -->|"DELETE expired items"| D3_items
```

---

## ตาราง Data Flow

### P3.1 — เพิ่มสินค้าลงตะกร้า
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| ลูกค้า | P3.1 | variant_id, quantity |
| P3.1 | D2.3 (variants) | ตรวจ stock_quantity |
| D2.3 | P3.1 | stock_quantity ปัจจุบัน |
| P3.1 | D2.3 | UPDATE: stock_quantity -= quantity |
| P3.1 | D3.1 (carts) | อ่าน/สร้าง cart สำหรับ user |
| P3.1 | D3.2 (cart_items) | INSERT: variant_id, quantity, reserved_at |
| P3.1 | ลูกค้า | ผลการเพิ่ม (สำเร็จ / stock ไม่พอ) |

### P3.5 — คืน Stock หมดอายุ (Background)
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| Timer | P3.5 | trigger ทุก 60 วินาที |
| P3.5 | D3.2 | SELECT: WHERE reserved_at < NOW() - 30min |
| D3.2 | P3.5 | expired items (variant_id, quantity) |
| P3.5 | D2.3 | UPDATE: stock_quantity += quantity (คืน stock) |
| P3.5 | D3.2 | DELETE: expired cart_items |
