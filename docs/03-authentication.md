# 3. ระบบยืนยันตัวตน (Authentication)

## วิธีการเข้าสู่ระบบ

ระบบใช้ **OTP (One-Time Password)** ผ่าน SMS แทนการใช้รหัสผ่าน เพื่อความสะดวกและปลอดภัย

---

## ขั้นตอนการเข้าสู่ระบบ / สมัครสมาชิก

### ขั้นตอนที่ 1: กรอกเบอร์โทร
- ผู้ใช้กรอกเบอร์โทรศัพท์
- ระบบตรวจสอบว่าเป็นสมาชิกอยู่แล้วหรือยัง
- ถ้าเป็นสมาชิก → แสดงชื่อ (ปิดบาง) เพื่อยืนยัน

### ขั้นตอนที่ 2: ส่ง OTP
- ระบบส่งรหัส 6 หลักไปทาง SMS
- จำกัดการส่ง OTP: **สูงสุด 3 ครั้ง ต่อ 10 นาที**
- **Demo Mode:** ใช้รหัส `123456` ไม่ต้องส่ง SMS จริง

### ขั้นตอนที่ 3: ยืนยัน OTP
- ผู้ใช้กรอกรหัส OTP
- ระบบตรวจสอบ: ยังไม่หมดอายุ, ยังไม่ถูกใช้, พยายามไม่เกิน 5 ครั้ง
- **สมาชิกใหม่:** สร้างบัญชีอัตโนมัติ
- **สมาชิกเดิม:** อัพเดทเวลาเข้าสู่ระบบล่าสุด

### ขั้นตอนที่ 4: รับ Token
- ระบบสร้าง **Access Token** (JWT, อายุ 60 นาที) สำหรับเรียก API
- ระบบสร้าง **Refresh Token** (JWT, อายุ 30 วัน) สำหรับต่ออายุ
- เก็บ Token ใน localStorage ของเบราว์เซอร์

---

## แผนภาพ Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (AuthPage)
    participant API as Backend (/api/auth)
    participant DB as Database
    participant SMS as SMS Gateway

    U->>FE: Enter phone number
    FE->>API: POST /check-phone {phone}
    API->>DB: SELECT FROM users WHERE phone = ?
    DB-->>API: exists / not exists
    API-->>FE: {exists, masked_name?}

    FE->>API: POST /request-otp {phone, purpose}
    API->>DB: Check rate limit (3 per 10min)
    API->>DB: INSERT INTO otp_requests
    alt DEMO_MODE = true
        API-->>FE: OTP = "123456" (skip SMS)
    else Production
        API->>SMS: Send OTP via SMS
        SMS-->>U: SMS with 6-digit code
    end

    U->>FE: Enter OTP code
    FE->>API: POST /verify-otp {phone, otp_code, purpose}
    API->>DB: Validate OTP (not expired, not used, attempts < 5)

    alt New User (register)
        API->>DB: INSERT INTO users
    else Existing User (login)
        API->>DB: UPDATE users SET last_login_at
    end

    API->>DB: Generate access_token (JWT, 60min)
    API->>DB: Generate refresh_token (JWT, 30days)
    API->>DB: INSERT INTO refresh_tokens (hashed)
    API-->>FE: {access_token, refresh_token, user}

    FE->>FE: authStore.setTokens() + setUser()
    FE->>FE: Redirect to HomePage
```

---

## ระบบต่ออายุ Token (Token Refresh)

เมื่อ Access Token หมดอายุ (60 นาที) ระบบจะต่ออายุอัตโนมัติโดยไม่ต้องล็อกอินใหม่

### ขั้นตอน:
1. Frontend เรียก API → ได้รับ 401 (Token หมดอายุ)
2. เก็บ Request ที่ล้มเหลวไว้ใน Queue
3. ใช้ Refresh Token ขอ Access Token ใหม่
4. ส่ง Request เดิมซ้ำพร้อม Token ใหม่

```mermaid
sequenceDiagram
    participant FE as Frontend (Axios Interceptor)
    participant API as Backend
    participant DB as Database

    FE->>API: API Request (expired access_token)
    API-->>FE: 401 Unauthorized

    FE->>FE: Queue failed request
    FE->>API: POST /api/auth/refresh {refresh_token}
    API->>DB: Validate refresh_token (hash match, not revoked, not expired)
    API->>DB: Revoke old refresh_token
    API->>DB: Create new refresh_token
    API-->>FE: {access_token, refresh_token}

    FE->>FE: authStore.setTokens()
    FE->>FE: Replay queued requests with new token
    FE->>API: Retry original request
    API-->>FE: Success response
```

---

## ความปลอดภัย

| มาตรการ | รายละเอียด |
|---------|-----------|
| Rate Limiting | จำกัด OTP 3 ครั้ง / 10 นาที |
| OTP Attempts | กรอก OTP ผิดได้สูงสุด 5 ครั้ง |
| Token Hashing | Refresh Token เก็บเป็น Hash ใน Database |
| Token Rotation | ทุกครั้งที่ Refresh จะสร้าง Token คู่ใหม่ + ยกเลิกอันเก่า |
| Short-lived Token | Access Token อายุ 60 นาทีเท่านั้น |
