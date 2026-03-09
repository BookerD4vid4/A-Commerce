"""
Authentication Service
จัดการ OTP, JWT, และการยืนยันตัวตน
"""

import random
import hashlib
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from app.config import settings


def generate_otp() -> str:
    """
    สร้าง OTP 6 หลัก
    
    Returns:
        str: OTP 6 หลัก (DEMO_MODE จะ return "123456" เสมอ)
    """
    if settings.DEMO_MODE:
        return "123456"
    
    return str(random.randint(100000, 999999))


def mask_name(name: str) -> str:
    """
    ซ่อนชื่อบางส่วนเพื่อความเป็นส่วนตัว
    
    Args:
        name: ชื่อเต็ม
        
    Returns:
        str: ชื่อที่ซ่อนแล้ว เช่น "สมชาย" -> "สม***"
    """
    if not name or len(name) <= 2:
        return name
    
    return name[:2] + "***"


def mask_phone(phone: str) -> str:
    """
    ซ่อนเบอร์โทรศัพท์บางส่วน
    
    Args:
        phone: เบอร์โทรศัพท์
        
    Returns:
        str: เบอร์ที่ซ่อนแล้ว เช่น "0812345678" -> "081****678"
    """
    if not phone or len(phone) < 6:
        return phone
    
    return phone[:3] + "****" + phone[-3:]


def create_access_token(user_id: int, role: str) -> str:
    """
    สร้าง JWT access token
    
    Args:
        user_id: ID ของ user
        role: บทบาทของ user (user, admin)
        
    Returns:
        str: JWT token
    """
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.utcnow(),
        "type": "access"
    }
    
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    """
    สร้าง JWT refresh token
    
    Args:
        user_id: ID ของ user
        
    Returns:
        str: JWT refresh token
    """
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "iat": datetime.utcnow(),
        "type": "refresh"
    }
    
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        dict: Token payload หรือ None ถ้า invalid
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def hash_token(token: str) -> str:
    """
    Hash token สำหรับเก็บใน database
    
    Args:
        token: Token string
        
    Returns:
        str: SHA-256 hash
    """
    return hashlib.sha256(token.encode()).hexdigest()


def validate_phone_number(phone: str) -> tuple[bool, Optional[str]]:
    """
    ตรวจสอบความถูกต้องของเบอร์โทรศัพท์ไทย
    
    Args:
        phone: เบอร์โทรศัพท์
        
    Returns:
        tuple: (is_valid: bool, cleaned_phone: str or None)
    """
    # Clean phone number
    cleaned = phone.replace("-", "").replace(" ", "").strip()
    
    # Thai phone: 0 + 9 digits = 10 digits
    if not cleaned.startswith("0"):
        return False, None
    
    if len(cleaned) != 10:
        return False, None
    
    if not cleaned.isdigit():
        return False, None
    
    return True, cleaned


async def send_sms(phone: str, message: str) -> bool:
    """
    ส่ง SMS ไปยังเบอร์โทรศัพท์
    
    Args:
        phone: เบอร์โทรศัพท์
        message: ข้อความที่ต้องการส่ง
        
    Returns:
        bool: สำเร็จหรือไม่
        
    Note:
        ในโหมด DEMO จะแสดงข้อความใน console
        ในโหมด production ต้องเชื่อมต่อกับ SMS gateway
    """
    if settings.DEMO_MODE:
        print(f"[DEMO SMS] To: {phone}")
        print("[DEMO SMS] OTP message sent (demo mode)")
        return True
    
    # TODO: เชื่อมต่อกับ SMS API (Twilio, ThaiBulkSMS, SMSMKT, etc.)
    # Example:
    # import httpx
    # async with httpx.AsyncClient() as client:
    #     response = await client.post(
    #         settings.SMS_API_URL,
    #         json={"to": phone, "message": message},
    #         headers={"Authorization": f"Bearer {settings.SMS_API_KEY}"}
    #     )
    #     return response.status_code == 200
    
    return True
