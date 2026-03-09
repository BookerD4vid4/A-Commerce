"""
Authentication Middleware
จัดการการตรวจสอบ JWT และ authorization
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import asyncpg

from app.services import auth_service
from app.database import get_db

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: asyncpg.Connection = Depends(get_db)
) -> Dict[str, Any]:
    """
    Dependency สำหรับดึงข้อมูล user ปัจจุบันจาก JWT
    
    Args:
        credentials: JWT token จาก Authorization header
        db: Database connection
        
    Returns:
        dict: ข้อมูล user
        
    Raises:
        HTTPException: ถ้า token invalid หรือ user ไม่มีในระบบ
        
    Usage:
        @router.get("/profile")
        async def get_profile(user = Depends(get_current_user)):
            return {"user_id": user["id"], "name": user["name"]}
    """
    token = credentials.credentials
    
    # Decode JWT
    payload = auth_service.decode_token(token)
    
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ไม่ถูกต้องหรือหมดอายุ",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ไม่ถูกต้อง",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # ดึงข้อมูล user จาก database
    user = await db.fetchrow(
        """SELECT user_id, phone_number, full_name, role, is_active
           FROM users
           WHERE user_id = $1""",
        user_id
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบผู้ใช้งาน"
        )
    
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="บัญชีนี้ถูกระงับการใช้งาน"
        )
    
    # Return user data
    return {
        "user_id": user["user_id"],
        "id": user["user_id"],  # Keep both for compatibility
        "phone": user["phone_number"],
        "name": user["full_name"],
        "role": user["role"]
    }


async def get_current_active_user(
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Dependency สำหรับตรวจสอบว่า user active
    (เป็น wrapper ของ get_current_user)
    """
    return user


async def require_admin(
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Dependency สำหรับตรวจสอบว่า user เป็น admin
    
    Args:
        user: ข้อมูล user จาก get_current_user
        
    Returns:
        dict: ข้อมูล user (ถ้าเป็น admin)
        
    Raises:
        HTTPException: ถ้าไม่ใช่ admin
        
    Usage:
        @router.get("/admin/dashboard")
        async def admin_dashboard(user = Depends(require_admin)):
            return {"message": "Welcome admin!"}
    """
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ต้องมีสิทธิ์ admin เท่านั้น"
        )
    
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: asyncpg.Connection = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """
    Dependency สำหรับดึงข้อมูล user (optional - ไม่บังคับต้อง login)

    - ไม่มี token → return None (guest)
    - มี token แต่ invalid/expired → raise 401 (ให้ client refresh token)
    - มี token ถูกต้อง → return user data
    """
    if not credentials:
        return None

    try:
        token = credentials.credentials
        payload = auth_service.decode_token(token)

        if not payload or payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token ไม่ถูกต้องหรือหมดอายุ",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token ไม่ถูกต้อง",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = await db.fetchrow(
            """SELECT user_id, phone_number, full_name, role, is_active
               FROM users
               WHERE user_id = $1 AND is_active = TRUE""",
            user_id
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ไม่พบผู้ใช้งาน",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "user_id": user["user_id"],
            "id": user["user_id"],  # Keep both for compatibility
            "phone": user["phone_number"],
            "name": user["full_name"],
            "role": user["role"]
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ไม่ถูกต้อง",
            headers={"WWW-Authenticate": "Bearer"},
        )
