# Data Flow Diagram — Level 2: P4 คำสั่งซื้อและชำระเงิน (Order & Payment)

## คำอธิบาย

แตก Process P4 ออกเป็น **5 Sub-Process** แสดงรายละเอียดการสร้างคำสั่งซื้อ, สร้าง QR, ตรวจสอบการชำระ, และ COD

---

## รายการ Sub-Process

| Process | ชื่อ | คำอธิบาย |
|---------|------|----------|
| P4.1 | สร้างคำสั่งซื้อ | อ่านตะกร้า + สร้าง order + ล้างตะกร้า |
| P4.2 | สร้าง QR Code | เรียก Omise สร้าง PromptPay QR |
| P4.3 | ตรวจสอบการชำระ | Polling ตรวจสถานะจาก Omise |
| P4.4 | ยืนยัน COD | อัพเดทสถานะเป็น cod_pending |
| P4.5 | ดูประวัติคำสั่งซื้อ | ดึงรายการ order ของผู้ใช้ |

---

## แผนภาพ

```mermaid
graph TB
    Customer["ลูกค้า"]
    OmiseAPI["Omise\n(Payment Gateway)"]

    P4_1(("P4.1\nสร้าง\nคำสั่งซื้อ"))
    P4_2(("P4.2\nสร้าง\nQR Code"))
    P4_3(("P4.3\nตรวจสอบ\nการชำระ"))
    P4_4(("P4.4\nยืนยัน\nCOD"))
    P4_5(("P4.5\nดูประวัติ\nคำสั่งซื้อ"))

    D1_addr[("D1.4 user_addresses")]
    D3_items[("D3.2 cart_items")]
    D4_orders[("D4.1 orders")]
    D4_oitems[("D4.2 order_items")]
    D4_pay[("D4.3 payments")]
    D4_ship[("D4.4 shipments")]

    %% P4.1: Create Order
    Customer -->|"shipping_address_id,\npayment_method"| P4_1
    P4_1 -->|"ตรวจที่อยู่เป็นของ user"| D1_addr
    D1_addr -->|"address data"| P4_1
    P4_1 -->|"อ่านสินค้าในตะกร้า"| D3_items
    D3_items -->|"cart_items + variant info"| P4_1
    P4_1 -->|"INSERT order"| D4_orders
    P4_1 -->|"INSERT order_items"| D4_oitems
    P4_1 -->|"INSERT payment (pending)"| D4_pay
    P4_1 -->|"INSERT shipment (preparing)"| D4_ship
    P4_1 -->|"DELETE cart_items (ล้างตะกร้า)"| D3_items
    P4_1 -->|"order_id, total_amount, status"| Customer

    %% P4.2: Generate QR
    Customer -->|"payment_id"| P4_2
    P4_2 -->|"อ่าน payment"| D4_pay
    D4_pay -->|"amount, order_id"| P4_2
    P4_2 -->|"จำนวนเงิน, PromptPay"| OmiseAPI
    OmiseAPI -->|"QR Code URL, source_id"| P4_2
    P4_2 -->|"UPDATE: qr_code_url, source_id"| D4_pay
    P4_2 -->|"QR Code URL, amount"| Customer

    %% P4.3: Verify Payment
    Customer -->|"payment_id (polling ทุก 15s)"| P4_3
    P4_3 -->|"อ่าน payment"| D4_pay
    D4_pay -->|"source_id, status"| P4_3
    P4_3 -->|"ตรวจสถานะ charge"| OmiseAPI
    OmiseAPI -->|"paid / not paid"| P4_3
    P4_3 -->|"UPDATE: status=paid"| D4_pay
    P4_3 -->|"UPDATE: payment_status=paid,\nstatus=confirmed"| D4_orders
    P4_3 -->|"ผลการชำระ (paid/not yet)"| Customer

    %% P4.4: Confirm COD
    Customer -->|"payment_id"| P4_4
    P4_4 -->|"UPDATE: status=cod_pending"| D4_pay
    P4_4 -->|"UPDATE: payment_status=cod_pending,\nstatus=confirmed"| D4_orders
    P4_4 -->|"ยืนยัน: สั่งซื้อสำเร็จ, ชำระเมื่อรับ"| Customer

    %% P4.5: View Orders
    Customer -->|"(เปิดหน้า orders)"| P4_5
    P4_5 -->|"อ่าน orders ของ user"| D4_orders
    D4_orders -->|"order list"| P4_5
    P4_5 -->|"อ่าน order_items"| D4_oitems
    D4_oitems -->|"items + product info"| P4_5
    P4_5 -->|"อ่าน payment status"| D4_pay
    D4_pay -->|"payment info"| P4_5
    P4_5 -->|"รายการคำสั่งซื้อ + สถานะ"| Customer
```

---

## ตาราง Data Flow

### P4.1 — สร้างคำสั่งซื้อ
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| ลูกค้า | P4.1 | shipping_address_id, payment_method |
| P4.1 | D1.4 (addresses) | ตรวจ address เป็นของ user |
| P4.1 | D3.2 (cart_items) | อ่านสินค้าในตะกร้า |
| P4.1 | D4.1 (orders) | INSERT: user_id, address_id, total, method |
| P4.1 | D4.2 (order_items) | INSERT: order_id, variant_id, qty, price (ต่อรายการ) |
| P4.1 | D4.3 (payments) | INSERT: order_id, method, amount, status=pending |
| P4.1 | D4.4 (shipments) | INSERT: order_id, status=preparing |
| P4.1 | D3.2 | DELETE: ล้าง cart_items ทั้งหมด |
| P4.1 | ลูกค้า | order_id, total_amount, items[], status |

### P4.2 — สร้าง QR Code (PromptPay)
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| ลูกค้า | P4.2 | payment_id |
| D4.3 | P4.2 | amount, order_id |
| P4.2 | Omise | amount, type=promptpay |
| Omise | P4.2 | QR Code URL, source_id |
| P4.2 | D4.3 | UPDATE: qr_code_url, omise_source_id |
| P4.2 | ลูกค้า | QR Code URL, amount, demo_mode |

### P4.3 — ตรวจสอบการชำระ
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| ลูกค้า | P4.3 | payment_id (ทุก 15 วินาที, สูงสุด 40 ครั้ง) |
| D4.3 | P4.3 | omise_source_id, current status |
| P4.3 | Omise | source_id (ตรวจสถานะ) |
| Omise | P4.3 | charge status (paid/not paid) |
| P4.3 | D4.3 | UPDATE: status=paid |
| P4.3 | D4.1 | UPDATE: payment_status=paid, status=confirmed |
| P4.3 | ลูกค้า | {paid: true/false} |

### P4.4 — ยืนยัน COD
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| ลูกค้า | P4.4 | payment_id |
| P4.4 | D4.3 | UPDATE: status=cod_pending |
| P4.4 | D4.1 | UPDATE: payment_status=cod_pending, status=confirmed |
| P4.4 | ลูกค้า | ยืนยันสำเร็จ |
