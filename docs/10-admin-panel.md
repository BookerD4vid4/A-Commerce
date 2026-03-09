# 10. ระบบแอดมิน (Admin Panel)

## ภาพรวม

แอดมินสามารถจัดการร้านค้าทั้งหมดผ่านหน้าเว็บ `/admin/*` ซึ่งต้องล็อกอินด้วยบัญชีที่มี role = `admin`

---

## หน้าแอดมินทั้งหมด

### 1. Dashboard (`/admin`)
หน้าแรกของแอดมิน แสดงข้อมูลสรุป:
- จำนวนผู้ใช้ทั้งหมด
- จำนวนคำสั่งซื้อ
- ยอดรายได้
- สินค้าที่ใกล้หมด Stock (Low Stock Alerts)

---

### 2. จัดการสินค้า (`/admin/products`)

| ฟีเจอร์ | คำอธิบาย |
|---------|----------|
| ดูรายการ | แสดงสินค้าทั้งหมด + ค้นหา + กรองหมวด |
| เพิ่มสินค้า | กรอกชื่อ, คำอธิบาย, หมวดหมู่ |
| แก้ไขสินค้า | อัพเดทรายละเอียด |
| จัดการ Variant | เพิ่ม/แก้ไขขนาด, ราคา, Stock, รูปภาพ |
| สร้าง AI Embedding | กดปุ่มสร้าง Embedding สำหรับค้นหาด้วย AI |

**สำคัญ:** หลังเพิ่ม/แก้ไขสินค้า ต้อง **สร้าง Embedding ใหม่** เพื่อให้ Chatbot ค้นเจอสินค้านั้นๆ

---

### 3. จัดการคำสั่งซื้อ (`/admin/orders`)

| ฟีเจอร์ | คำอธิบาย |
|---------|----------|
| ดูรายการ | คำสั่งซื้อทั้งหมด + กรองตามสถานะ |
| ดูรายละเอียด | สินค้า, ที่อยู่, การชำระเงิน |
| อัพเดทสถานะ | `pending → confirmed → preparing → shipping → delivered` |

---

### 4. จัดการสมาชิก (`/admin/members`)

| ฟีเจอร์ | คำอธิบาย |
|---------|----------|
| ดูรายการ | สมาชิกทั้งหมด + ค้นหา |
| เปลี่ยน Role | `user` ↔ `admin` |
| เปิด/ปิดบัญชี | `is_active` true/false |

---

### 5. ตั้งค่า Chatbot (`/admin/chatbot`)

| ฟีเจอร์ | คำอธิบาย |
|---------|----------|
| ดู System Prompt | ดูคำสั่งที่ใช้กำกับ AI |
| แก้ไข Prompt | ปรับแต่งพฤติกรรม AI (น้ำเสียง, การตอบ) |
| สร้าง Embedding | อัพเดทข้อมูล AI สำหรับค้นหาสินค้า |

---

### 6. รายงาน (`/admin/reports`)

| ฟีเจอร์ | คำอธิบาย |
|---------|----------|
| ยอดขายตามช่วงเวลา | รายวัน / รายสัปดาห์ / รายเดือน |
| สินค้าขายดี | Top selling products |
| แนวโน้มคำสั่งซื้อ | กราฟแสดง Order Trends |

---

## แผนภาพ

```mermaid
flowchart TB
    AdminLogin([Admin Login]) --> Dashboard

    subgraph Dashboard["Dashboard (/admin)"]
        Stats["Total Users / Orders / Revenue\nLow Stock Alerts"]
    end

    subgraph ProductMgmt["Product Management (/admin/products)"]
        ListProducts["List all products\n+ search + filter"]
        ListProducts --> CreateProduct["Create product\n(name, description, category)"]
        ListProducts --> EditProduct["Edit product\n(update details)"]
        ListProducts --> ManageVariants["Manage variants\n(size, price, stock, image)"]
        ManageVariants --> RegenEmbeddings["Regenerate AI embeddings\n(Gemini API)"]
    end

    subgraph OrderMgmt["Order Management (/admin/orders)"]
        ListOrders["List all orders\n+ status filter"]
        ListOrders --> ViewOrder["View order detail\n(items, address, payment)"]
        ViewOrder --> UpdateStatus["Update status:\npending → confirmed → preparing\n→ shipping → delivered"]
    end

    subgraph UserMgmt["User Management (/admin/members)"]
        ListUsers["List all users\n+ search"]
        ListUsers --> EditUser["Edit user:\nrole (user/admin)\nis_active (true/false)"]
    end

    subgraph ChatbotMgmt["Chatbot Settings (/admin/chatbot)"]
        ViewPrompt["View system prompt"]
        ViewPrompt --> EditPrompt["Edit/Create prompt\n(custom AI instructions)"]
        EditPrompt --> RegenEmbed2["Regenerate embeddings\n(update product search)"]
    end

    subgraph ReportsMgmt["Reports (/admin/reports)"]
        SalesReport["Revenue by period\n(daily/weekly/monthly)"]
        TopProducts["Top selling products"]
        OrderTrends["Order trends chart"]
    end

    Dashboard --> ProductMgmt
    Dashboard --> OrderMgmt
    Dashboard --> UserMgmt
    Dashboard --> ChatbotMgmt
    Dashboard --> ReportsMgmt
```
