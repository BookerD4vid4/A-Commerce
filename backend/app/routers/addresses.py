"""
User Address Management API
Handles CRUD operations for user shipping addresses
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field

from app.middleware.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/addresses", tags=["Addresses"])


# =============================================
# Pydantic Models
# =============================================

class AddressCreate(BaseModel):
    recipient_name: str = Field(..., min_length=1, max_length=200)
    phone_number: str = Field(..., pattern=r"^0\d{9}$")
    address_line: str = Field(..., min_length=1)
    subdistrict: Optional[str] = None
    district: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = Field(None, pattern=r"^\d{5}$")
    is_default: bool = False


class AddressUpdate(BaseModel):
    recipient_name: Optional[str] = Field(None, min_length=1, max_length=200)
    phone_number: Optional[str] = Field(None, pattern=r"^0\d{9}$")
    address_line: Optional[str] = None
    subdistrict: Optional[str] = None
    district: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = Field(None, pattern=r"^\d{5}$")
    is_default: Optional[bool] = None


class AddressResponse(BaseModel):
    address_id: int
    recipient_name: str
    phone_number: str
    address_line: str
    subdistrict: Optional[str]
    district: Optional[str]
    province: Optional[str]
    postal_code: Optional[str]
    is_default: bool

    class Config:
        from_attributes = True


# =============================================
# Endpoints
# =============================================

@router.post("/", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    address: AddressCreate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create new shipping address"""
    user_id = current_user["user_id"]

    async with db.transaction():
        # If setting as default, unset other defaults
        if address.is_default:
            await db.execute(
                "UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1",
                user_id
            )

        # Insert new address
        result = await db.fetchrow(
            """
            INSERT INTO user_addresses
            (user_id, recipient_name, phone_number, address_line,
             subdistrict, district, province, postal_code, is_default)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING address_id, recipient_name, phone_number, address_line,
                      subdistrict, district, province, postal_code, is_default
            """,
            user_id,
            address.recipient_name,
            address.phone_number,
            address.address_line,
            address.subdistrict,
            address.district,
            address.province,
            address.postal_code,
            address.is_default
        )

    return AddressResponse(**dict(result))


@router.get("/", response_model=List[AddressResponse])
async def get_addresses(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get all user addresses"""
    user_id = current_user["user_id"]

    addresses = await db.fetch(
        """
        SELECT address_id, recipient_name, phone_number, address_line,
               subdistrict, district, province, postal_code, is_default
        FROM user_addresses
        WHERE user_id = $1
        ORDER BY is_default DESC, created_at DESC
        """,
        user_id
    )

    return [AddressResponse(**dict(addr)) for addr in addresses]


@router.get("/{address_id}", response_model=AddressResponse)
async def get_address(
    address_id: int,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get specific address"""
    user_id = current_user["user_id"]

    address = await db.fetchrow(
        """
        SELECT address_id, recipient_name, phone_number, address_line,
               subdistrict, district, province, postal_code, is_default
        FROM user_addresses
        WHERE address_id = $1 AND user_id = $2
        """,
        address_id, user_id
    )

    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )

    return AddressResponse(**dict(address))


@router.put("/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: int,
    address_update: AddressUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update address"""
    user_id = current_user["user_id"]

    # Check address exists
    existing = await db.fetchrow(
        "SELECT address_id FROM user_addresses WHERE address_id = $1 AND user_id = $2",
        address_id, user_id
    )

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )

    # Build update query dynamically
    update_fields = []
    values = []
    param_count = 1

    for field, value in address_update.dict(exclude_unset=True).items():
        if value is not None:
            update_fields.append(f"{field} = ${param_count}")
            values.append(value)
            param_count += 1

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    async with db.transaction():
        # If setting as default, unset other defaults
        if address_update.is_default:
            await db.execute(
                "UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1",
                user_id
            )

        # Update address
        query = f"""
            UPDATE user_addresses
            SET {', '.join(update_fields)}
            WHERE address_id = ${param_count} AND user_id = ${param_count + 1}
            RETURNING address_id, recipient_name, phone_number, address_line,
                      subdistrict, district, province, postal_code, is_default
        """
        values.extend([address_id, user_id])

        result = await db.fetchrow(query, *values)

    return AddressResponse(**dict(result))


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: int,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Delete address"""
    user_id = current_user["user_id"]

    result = await db.execute(
        "DELETE FROM user_addresses WHERE address_id = $1 AND user_id = $2",
        address_id, user_id
    )

    if result == "DELETE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )

    return None


@router.post("/{address_id}/set-default", response_model=AddressResponse)
async def set_default_address(
    address_id: int,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Set address as default"""
    user_id = current_user["user_id"]

    async with db.transaction():
        # Check address exists
        existing = await db.fetchrow(
            "SELECT address_id FROM user_addresses WHERE address_id = $1 AND user_id = $2",
            address_id, user_id
        )

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )

        # Unset all defaults
        await db.execute(
            "UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1",
            user_id
        )

        # Set this as default
        result = await db.fetchrow(
            """
            UPDATE user_addresses
            SET is_default = TRUE
            WHERE address_id = $1 AND user_id = $2
            RETURNING address_id, recipient_name, phone_number, address_line,
                      subdistrict, district, province, postal_code, is_default
            """,
            address_id, user_id
        )

    return AddressResponse(**dict(result))
