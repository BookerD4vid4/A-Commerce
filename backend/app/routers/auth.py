"""
Authentication Router
จัดการ endpoints ทั้งหมดเกี่ยวกับการยืนยันตัวตน OTP และ JWT
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import asyncpg

from app.database import get_db
from app.services import auth_service
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# =============================================
# Request/Response Models
# =============================================

class CheckPhoneRequest(BaseModel):
    phone_number: str
    
    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """ตรวจสอบเบอร์โทรศัพท์ไทย"""
        is_valid, cleaned = auth_service.validate_phone_number(v)
        if not is_valid:
            raise ValueError("เบอร์โทรศัพท์ไม่ถูกต้อง กรุณากรอกเบอร์ 10 หลัก ขึ้นต้นด้วย 0")
        return cleaned


class CheckPhoneResponse(BaseModel):
    exists: bool
    masked_name: Optional[str] = None


class RequestOTPRequest(BaseModel):
    phone_number: str
    purpose: str  # 'register' | 'login'
    
    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        is_valid, cleaned = auth_service.validate_phone_number(v)
        if not is_valid:
            raise ValueError("เบอร์โทรศัพท์ไม่ถูกต้อง")
        return cleaned
    
    @field_validator('purpose')
    @classmethod
    def validate_purpose(cls, v: str) -> str:
        if v not in ('register', 'login', 'reset'):
            raise ValueError("purpose ต้องเป็น register, login หรือ reset")
        return v


class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp_code: str
    purpose: str
    
    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        is_valid, cleaned = auth_service.validate_phone_number(v)
        if not is_valid:
            raise ValueError("เบอร์โทรศัพท์ไม่ถูกต้อง")
        return cleaned
    
    @field_validator('otp_code')
    @classmethod
    def validate_otp(cls, v: str) -> str:
        if len(v) != 6 or not v.isdigit():
            raise ValueError("OTP ต้องเป็นตัวเลข 6 หลัก")
        return v


class RegisterProfileRequest(BaseModel):
    full_name: str
    address: Optional[Dict[str, Any]] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    is_new_user: bool
    user: Optional[Dict[str, Any]] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# =============================================
# Endpoints
# =============================================

@router.post("/check-phone", response_model=CheckPhoneResponse)
async def check_phone(
    req: CheckPhoneRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    """
    ตรวจสอบว่าเบอร์โทรศัพท์มีในระบบหรือไม่
    
    - ถ้ามี: return exists=true + masked_name
    - ถ้าไม่มี: return exists=false
    """
    user = await db.fetchrow(
        "SELECT user_id, full_name, is_active FROM users WHERE phone_number = $1",
        req.phone_number
    )
    
    if user and not user["is_active"]:
        raise HTTPException(
            status_code=403,
            detail="บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
        )
    
    return CheckPhoneResponse(
        exists=user is not None,
        masked_name=auth_service.mask_name(user["full_name"]) if user else None
    )


@router.post("/request-otp")
async def request_otp(
    req: RequestOTPRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    """
    ส่ง OTP ไปยังเบอร์โทรศัพท์
    
    ตรวจสอบ:
    - Rate limit: ไม่เกิน 3 OTP ต่อเบอร์ ใน 10 นาที
    - Purpose กับสถานะ user:
      * register: เบอร์ต้องยังไม่มีในระบบ
      * login: เบอร์ต้องมีในระบบแล้ว
    """
    # ตรวจ rate limit
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.OTP_RATE_WINDOW_MINUTES)
    recent_count = await db.fetchval(
        """SELECT COUNT(*) FROM otp_requests
           WHERE phone_number = $1 AND created_at > $2""",
        req.phone_number, cutoff
    )
    
    if recent_count >= settings.OTP_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"ส่ง OTP ได้ไม่เกิน {settings.OTP_RATE_LIMIT} ครั้งใน {settings.OTP_RATE_WINDOW_MINUTES} นาที กรุณารอสักครู่"
        )
    
    # ตรวจสอบ purpose กับสถานะ user
    user = await db.fetchrow(
        "SELECT user_id FROM users WHERE phone_number = $1",
        req.phone_number
    )
    
    if req.purpose == "register" and user:
        raise HTTPException(
            status_code=409,
            detail="เบอร์โทรศัพท์นี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ"
        )
    
    if req.purpose == "login" and not user:
        raise HTTPException(
            status_code=404,
            detail="ไม่พบบัญชีที่ใช้เบอร์นี้ กรุณาสมัครสมาชิก"
        )
    
    # ยกเลิก OTP เก่าที่ยังไม่ใช้
    await db.execute(
        """UPDATE otp_requests SET is_used = TRUE
           WHERE phone_number = $1 AND is_used = FALSE AND purpose = $2""",
        req.phone_number, req.purpose
    )
    
    # สร้าง OTP ใหม่
    otp = auth_service.generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    
    await db.execute(
        """INSERT INTO otp_requests (phone_number, otp_code, purpose, expires_at)
           VALUES ($1, $2, $3, $4)""",
        req.phone_number, otp, req.purpose, expires_at
    )
    
    # ส่ง OTP
    message = f"รหัส OTP ของคุณคือ {otp} (หมดอายุใน {settings.OTP_EXPIRY_MINUTES} นาที)"
    await auth_service.send_sms(req.phone_number, message)
    
    return {
        "message": "ส่งรหัส OTP เรียบร้อยแล้ว",
        "expires_in": settings.OTP_EXPIRY_MINUTES * 60,  # วินาที
        "phone_masked": auth_service.mask_phone(req.phone_number)
    }


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(
    req: VerifyOTPRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    """
    ยืนยัน OTP และออก JWT tokens
    
    ผลลัพธ์:
    - register: สร้าง user ใหม่ + return JWT + is_new_user=true
    - login: return JWT + is_new_user=false
    """
    # ค้นหา OTP ล่าสุดที่ยังไม่ใช้
    otp_record = await db.fetchrow(
        """SELECT otp_id, otp_code, expires_at, attempts
           FROM otp_requests
           WHERE phone_number = $1
             AND purpose = $2
             AND is_used = FALSE
           ORDER BY created_at DESC
           LIMIT 1""",
        req.phone_number, req.purpose
    )
    
    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="ไม่พบรหัส OTP กรุณาขอรหัสใหม่"
        )
    
    # ตรวจสอบว่าหมดอายุหรือไม่
    if otp_record["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่"
        )
    
    # ตรวจสอบจำนวนครั้งที่กรอกผิด
    if otp_record["attempts"] >= 5:
        raise HTTPException(
            status_code=400,
            detail="กรอกรหัส OTP ผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่"
        )
    
    # ตรวจสอบ OTP
    if otp_record["otp_code"] != req.otp_code:
        # เพิ่ม attempts
        await db.execute(
            "UPDATE otp_requests SET attempts = attempts + 1 WHERE otp_id = $1",
            otp_record["otp_id"]
        )
        
        remaining = 5 - (otp_record["attempts"] + 1)
        raise HTTPException(
            status_code=400,
            detail=f"รหัส OTP ไม่ถูกต้อง (เหลืออีก {remaining} ครั้ง)"
        )
    
    # OTP ถูกต้อง → mark as used
    await db.execute(
        "UPDATE otp_requests SET is_used = TRUE WHERE otp_id = $1",
        otp_record["otp_id"]
    )
    
    # ตรวจสอบว่ามี user หรือยัง
    user = await db.fetchrow(
        "SELECT user_id, full_name, role, is_active FROM users WHERE phone_number = $1",
        req.phone_number
    )
    
    is_new_user = False
    
    if not user:
        # สร้าง user ใหม่ (สำหรับ register)
        user = await db.fetchrow(
            """INSERT INTO users (phone_number, is_verified)
               VALUES ($1, TRUE)
               RETURNING user_id, full_name, role, is_active""",
            req.phone_number
        )
        is_new_user = True
    else:
        # Update last login
        await db.execute(
            "UPDATE users SET last_login_at = NOW(), is_verified = TRUE WHERE user_id = $1",
            user["user_id"]
        )
    
    # สร้าง JWT tokens
    access_token = auth_service.create_access_token(user["user_id"], user["role"])
    refresh_token = auth_service.create_refresh_token(user["user_id"])
    
    # เก็บ refresh token ใน DB (hash)
    token_hash = auth_service.hash_token(refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    await db.execute(
        """INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, $3)""",
        user["user_id"], token_hash, expires_at
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        is_new_user=is_new_user,
        user={
            "id": user["user_id"],
            "phone": req.phone_number,
            "name": user["full_name"],
            "role": user["role"]
        }
    )


@router.post("/register-profile")
async def register_profile(
    req: RegisterProfileRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(lambda: None)  # TODO: add auth middleware
):
    """
    กรอกข้อมูลโปรไฟล์หลังจาก verify OTP (สำหรับ user ใหม่)
    """
    # TODO: Implement get_current_user dependency
    # For now, this is a placeholder
    raise HTTPException(
        status_code=501,
        detail="Endpoint ยังไม่พร้อมใช้งาน รอ middleware auth"
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    req: RefreshTokenRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    """
    ใช้ refresh token เพื่อขอ access token ใหม่
    """
    # Decode refresh token
    payload = auth_service.decode_token(req.refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=401,
            detail="Refresh token ไม่ถูกต้อง"
        )
    
    user_id = payload.get("user_id")
    
    # ตรวจสอบว่า refresh token ยังไม่ถูก revoke
    token_hash = auth_service.hash_token(req.refresh_token)
    token_record = await db.fetchrow(
        """SELECT token_id FROM refresh_tokens
           WHERE user_id = $1
             AND token_hash = $2
             AND is_revoked = FALSE
             AND expires_at > NOW()""",
        user_id, token_hash
    )
    
    if not token_record:
        raise HTTPException(
            status_code=401,
            detail="Refresh token หมดอายุหรือถูกยกเลิกแล้ว"
        )
    
    # ดึงข้อมูล user
    user = await db.fetchrow(
        "SELECT user_id, phone_number, full_name, role FROM users WHERE user_id = $1",
        user_id
    )
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="ไม่พบผู้ใช้งาน"
        )
    
    # สร้าง access token ใหม่
    new_access_token = auth_service.create_access_token(user["user_id"], user["role"])
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=req.refresh_token,  # ใช้ refresh token เดิม
        token_type="Bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        is_new_user=False,
        user={
            "id": user["user_id"],
            "phone": user["phone_number"],
            "name": user["full_name"],
            "role": user["role"]
        }
    )


@router.post("/logout")
async def logout(
    req: RefreshTokenRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    """
    ออกจากระบบ (revoke refresh token)
    """
    token_hash = auth_service.hash_token(req.refresh_token)
    
    result = await db.execute(
        """UPDATE refresh_tokens
           SET is_revoked = TRUE
           WHERE token_hash = $1""",
        token_hash
    )
    
    return {"message": "ออกจากระบบเรียบร้อยแล้ว"}
