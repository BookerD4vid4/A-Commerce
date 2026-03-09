# Data Flow Diagram — Level 2: P1 จัดการยืนยันตัวตน (Authentication)

## คำอธิบาย

แตก Process P1 ออกเป็น **4 Sub-Process** แสดงรายละเอียดการล็อกอินด้วย OTP และการจัดการ Token

---

## รายการ Sub-Process

| Process | ชื่อ | คำอธิบาย |
|---------|------|----------|
| P1.1 | ตรวจสอบเบอร์โทร | ตรวจว่าเป็นสมาชิกหรือยัง |
| P1.2 | ส่ง OTP | สร้างรหัส 6 หลัก + ส่ง SMS |
| P1.3 | ยืนยัน OTP + ออก Token | ตรวจ OTP + สร้าง JWT Token |
| P1.4 | ต่ออายุ Token | ใช้ Refresh Token ขอ Token ใหม่ |

---

## แผนภาพ

```mermaid
graph TB
    %% External Entities
    Customer["ลูกค้า"]
    SMSAPI["SMS Gateway"]

    %% Sub-Processes
    P1_1(("P1.1\nตรวจสอบ\nเบอร์โทร"))
    P1_2(("P1.2\nส่ง OTP"))
    P1_3(("P1.3\nยืนยัน OTP\nออก Token"))
    P1_4(("P1.4\nต่ออายุ\nToken"))

    %% Data Stores
    D1_users[("D1.1 users")]
    D1_otp[("D1.2 otp_requests")]
    D1_tokens[("D1.3 refresh_tokens")]

    %% === P1.1: Check Phone ===
    Customer -->|"เบอร์โทร"| P1_1
    P1_1 -->|"เบอร์โทร"| D1_users
    D1_users -->|"exists, ชื่อ (masked)"| P1_1
    P1_1 -->|"สถานะ: สมาชิก/ไม่ใช่สมาชิก"| Customer

    %% === P1.2: Send OTP ===
    Customer -->|"เบอร์โทร, purpose"| P1_2
    P1_2 -->|"ตรวจ rate limit"| D1_otp
    D1_otp -->|"จำนวน OTP ใน 10 นาที"| P1_2
    P1_2 -->|"เขียน OTP record"| D1_otp
    P1_2 -->|"เบอร์โทร + รหัส 6 หลัก"| SMSAPI
    SMSAPI -->|"สถานะส่ง"| P1_2
    P1_2 -->|"ผลการส่ง OTP"| Customer

    %% === P1.3: Verify OTP + Issue Token ===
    Customer -->|"เบอร์โทร, OTP Code"| P1_3
    P1_3 -->|"ตรวจ OTP"| D1_otp
    D1_otp -->|"OTP record (หมดอายุ?, ใช้แล้ว?, attempts)"| P1_3
    P1_3 -->|"mark OTP ใช้แล้ว"| D1_otp
    P1_3 -->|"สร้าง/อัพเดทผู้ใช้"| D1_users
    P1_3 -->|"เขียน refresh_token (hashed)"| D1_tokens
    P1_3 -->|"access_token, refresh_token, ข้อมูลผู้ใช้"| Customer

    %% === P1.4: Refresh Token ===
    Customer -->|"refresh_token (หมดอายุ)"| P1_4
    P1_4 -->|"ตรวจ refresh_token"| D1_tokens
    D1_tokens -->|"token record (valid?, revoked?)"| P1_4
    P1_4 -->|"ยกเลิก token เก่า"| D1_tokens
    P1_4 -->|"เขียน token ใหม่"| D1_tokens
    P1_4 -->|"access_token ใหม่, refresh_token ใหม่"| Customer
```

---

## ตาราง Data Flow

### P1.1 — ตรวจสอบเบอร์โทร
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| ลูกค้า | P1.1 | เบอร์โทร |
| P1.1 | D1.1 (users) | เบอร์โทร (query) |
| D1.1 | P1.1 | exists (bool), full_name (masked) |
| P1.1 | ลูกค้า | {exists, masked_name} |

### P1.2 — ส่ง OTP
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| ลูกค้า | P1.2 | เบอร์โทร, purpose (login/register) |
| P1.2 | D1.2 (otp_requests) | ตรวจ rate limit (count ใน 10 นาที) |
| D1.2 | P1.2 | จำนวน OTP ที่ส่งแล้ว |
| P1.2 | D1.2 | INSERT otp_request (phone, code, expires_at) |
| P1.2 | SMS Gateway | เบอร์โทร + รหัส OTP 6 หลัก |
| SMS Gateway | P1.2 | สถานะส่ง (success/fail) |
| P1.2 | ลูกค้า | ผลการส่ง OTP |

### P1.3 — ยืนยัน OTP + ออก Token
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| ลูกค้า | P1.3 | เบอร์โทร, OTP Code, purpose |
| P1.3 | D1.2 | ตรวจ OTP (ถูกต้อง? หมดอายุ? ใช้แล้ว?) |
| D1.2 | P1.3 | OTP record |
| P1.3 | D1.2 | UPDATE: mark used, เพิ่ม attempts |
| P1.3 | D1.1 | INSERT user ใหม่ หรือ UPDATE last_login_at |
| P1.3 | D1.3 | INSERT refresh_token (hashed) |
| P1.3 | ลูกค้า | access_token (JWT 60min), refresh_token (JWT 30d), user info |

### P1.4 — ต่ออายุ Token
| จาก | ไป | Data Flow |
|-----|-----|-----------|
| ลูกค้า | P1.4 | refresh_token |
| P1.4 | D1.3 | ตรวจ token (hash match, not revoked, not expired) |
| D1.3 | P1.4 | token record |
| P1.4 | D1.3 | UPDATE: revoke old token + INSERT new token |
| P1.4 | ลูกค้า | access_token ใหม่, refresh_token ใหม่ |
