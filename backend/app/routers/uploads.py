"""
Uploads Router
Handles file uploads to Supabase Storage
"""

import uuid
import httpx
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File

from app.config import settings
from app.middleware.auth import require_admin

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
BUCKET_NAME = "product-images"


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin),
):
    """Upload an image to Supabase Storage and return the public URL"""

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase Storage not configured")

    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_TYPES)}",
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    # Generate unique filename
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"

    # Upload to Supabase Storage
    upload_url = f"{settings.SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{filename}"

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            upload_url,
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                "Content-Type": file.content_type or "image/jpeg",
            },
            content=content,
        )

    if response.status_code not in (200, 201):
        print(f"[ERROR] Supabase Storage upload failed: {response.status_code} {response.text}")
        raise HTTPException(status_code=500, detail="Failed to upload image")

    # Return public URL
    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{filename}"

    return {"url": public_url, "filename": filename}
