"""
Payment utilities for Omise integration
Handles PromptPay QR code generation and payment verification
"""

import httpx
import base64
from typing import Optional, Dict
from decimal import Decimal

from app.config import settings


class OmisePaymentService:
    """Omise payment service for PromptPay QR generation"""

    def __init__(self):
        self.public_key = settings.OMISE_PUBLIC_KEY
        self.secret_key = settings.OMISE_SECRET_KEY
        self.api_url = "https://api.omise.co"

    def _get_auth_header(self) -> str:
        """Generate Basic Auth header"""
        credentials = f"{self.secret_key}:"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"

    async def create_promptpay_source(
        self,
        amount: Decimal,
        order_id: int
    ) -> Dict:
        """
        Create PromptPay QR code source

        Args:
            amount: Payment amount in THB
            order_id: Order ID for reference

        Returns:
            Dict with source_id and qr_code_url

        Raises:
            Exception if Omise API call fails
        """
        # Convert to satang (1 THB = 100 satang)
        amount_satang = int(amount * 100)

        payload = {
            "amount": amount_satang,
            "currency": "THB",
            "type": "promptpay",
            "flow": "online"
        }

        headers = {
            "Authorization": self._get_auth_header(),
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/sources",
                json=payload,
                headers=headers,
                timeout=30.0
            )

            if response.status_code != 200:
                raise Exception(f"Omise API error: {response.text}")

            data = response.json()

            return {
                "source_id": data["id"],
                "qr_code_url": data.get("scannable_code", {}).get("image", {}).get("download_uri"),
                "expires_at": data.get("expires_at"),
                "amount": amount
            }

    async def create_charge(
        self,
        source_id: str,
        amount: Decimal,
        description: str = "A-Commerce Order Payment"
    ) -> Dict:
        """
        Create charge from PromptPay source

        Args:
            source_id: Source ID from create_promptpay_source
            amount: Payment amount in THB
            description: Payment description

        Returns:
            Dict with charge details
        """
        amount_satang = int(amount * 100)

        payload = {
            "amount": amount_satang,
            "currency": "THB",
            "source": source_id,
            "description": description,
            "return_uri": f"{settings.FRONTEND_URL}/orders/payment-callback"
        }

        headers = {
            "Authorization": self._get_auth_header(),
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/charges",
                json=payload,
                headers=headers,
                timeout=30.0
            )

            if response.status_code != 200:
                raise Exception(f"Omise charge error: {response.text}")

            data = response.json()

            return {
                "charge_id": data["id"],
                "status": data["status"],
                "paid": data["paid"],
                "transaction_id": data.get("transaction"),
                "authorize_uri": data.get("authorize_uri")
            }

    async def get_charge(self, charge_id: str) -> Dict:
        """
        Get charge status

        Args:
            charge_id: Charge ID to check

        Returns:
            Dict with charge details
        """
        headers = {
            "Authorization": self._get_auth_header()
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/charges/{charge_id}",
                headers=headers,
                timeout=30.0
            )

            if response.status_code != 200:
                raise Exception(f"Omise API error: {response.text}")

            data = response.json()

            return {
                "charge_id": data["id"],
                "status": data["status"],
                "paid": data["paid"],
                "amount": Decimal(data["amount"]) / 100,
                "transaction_id": data.get("transaction")
            }


# Singleton instance
omise_service = OmisePaymentService()


async def generate_promptpay_qr(amount: Decimal, order_id: int) -> Dict:
    """
    Generate PromptPay QR code for payment

    Args:
        amount: Payment amount
        order_id: Order ID

    Returns:
        Dict with QR code URL and payment details
    """
    if not settings.OMISE_SECRET_KEY:
        # Demo mode - return inline SVG QR code (no external dependency)
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">'
            '<rect width="300" height="300" fill="#fff"/>'
            '<rect x="20" y="20" width="60" height="60" rx="4" fill="#1a1a2e"/>'
            '<rect x="220" y="20" width="60" height="60" rx="4" fill="#1a1a2e"/>'
            '<rect x="20" y="220" width="60" height="60" rx="4" fill="#1a1a2e"/>'
            '<rect x="30" y="30" width="40" height="40" rx="2" fill="none" stroke="#fff" stroke-width="6"/>'
            '<rect x="230" y="30" width="40" height="40" rx="2" fill="none" stroke="#fff" stroke-width="6"/>'
            '<rect x="30" y="230" width="40" height="40" rx="2" fill="none" stroke="#fff" stroke-width="6"/>'
            '<rect x="42" y="42" width="16" height="16" fill="#fff"/>'
            '<rect x="242" y="42" width="16" height="16" fill="#fff"/>'
            '<rect x="42" y="242" width="16" height="16" fill="#fff"/>'
            '<g fill="#1a1a2e">'
            '<rect x="100" y="20" width="12" height="12"/><rect x="120" y="20" width="12" height="12"/>'
            '<rect x="148" y="20" width="12" height="12"/><rect x="180" y="20" width="12" height="12"/>'
            '<rect x="100" y="40" width="12" height="12"/><rect x="140" y="40" width="12" height="12"/>'
            '<rect x="168" y="40" width="12" height="12"/><rect x="192" y="40" width="12" height="12"/>'
            '<rect x="108" y="60" width="12" height="12"/><rect x="132" y="60" width="12" height="12"/>'
            '<rect x="156" y="60" width="12" height="12"/><rect x="180" y="60" width="12" height="12"/>'
            '</g>'
            '<g fill="#1a1a2e">'
            '<rect x="20" y="100" width="12" height="12"/><rect x="40" y="108" width="12" height="12"/>'
            '<rect x="60" y="120" width="12" height="12"/><rect x="100" y="100" width="12" height="12"/>'
            '<rect x="120" y="108" width="12" height="12"/><rect x="140" y="120" width="12" height="12"/>'
            '<rect x="160" y="100" width="12" height="12"/><rect x="188" y="108" width="12" height="12"/>'
            '<rect x="220" y="120" width="12" height="12"/><rect x="248" y="100" width="12" height="12"/>'
            '<rect x="268" y="108" width="12" height="12"/>'
            '</g>'
            '<g fill="#1a1a2e">'
            '<rect x="20" y="140" width="12" height="12"/><rect x="48" y="148" width="12" height="12"/>'
            '<rect x="80" y="140" width="12" height="12"/><rect x="108" y="148" width="12" height="12"/>'
            '<rect x="132" y="140" width="12" height="12"/><rect x="168" y="148" width="12" height="12"/>'
            '<rect x="200" y="140" width="12" height="12"/><rect x="228" y="148" width="12" height="12"/>'
            '<rect x="260" y="140" width="12" height="12"/>'
            '</g>'
            '<g fill="#1a1a2e">'
            '<rect x="20" y="172" width="12" height="12"/><rect x="40" y="180" width="12" height="12"/>'
            '<rect x="68" y="172" width="12" height="12"/><rect x="100" y="180" width="12" height="12"/>'
            '<rect x="128" y="172" width="12" height="12"/><rect x="156" y="180" width="12" height="12"/>'
            '<rect x="188" y="172" width="12" height="12"/><rect x="220" y="180" width="12" height="12"/>'
            '<rect x="248" y="172" width="12" height="12"/><rect x="268" y="180" width="12" height="12"/>'
            '</g>'
            '<g fill="#1a1a2e">'
            '<rect x="100" y="220" width="12" height="12"/><rect x="120" y="228" width="12" height="12"/>'
            '<rect x="148" y="220" width="12" height="12"/><rect x="172" y="240" width="12" height="12"/>'
            '<rect x="200" y="220" width="12" height="12"/><rect x="220" y="228" width="12" height="12"/>'
            '<rect x="248" y="240" width="12" height="12"/><rect x="268" y="220" width="12" height="12"/>'
            '<rect x="100" y="260" width="12" height="12"/><rect x="132" y="260" width="12" height="12"/>'
            '<rect x="160" y="268" width="12" height="12"/><rect x="200" y="260" width="12" height="12"/>'
            '<rect x="228" y="268" width="12" height="12"/><rect x="260" y="260" width="12" height="12"/>'
            '</g>'
            f'<text x="150" y="155" text-anchor="middle" font-family="sans-serif" font-size="14" '
            f'font-weight="bold" fill="#F97316">DEMO QR</text>'
            '</svg>'
        )
        import base64 as b64
        data_url = "data:image/svg+xml;base64," + b64.b64encode(svg.encode()).decode()
        return {
            "source_id": f"demo_source_{order_id}",
            "qr_code_url": data_url,
            "expires_at": None,
            "amount": amount,
            "demo_mode": True
        }

    return await omise_service.create_promptpay_source(amount, order_id)


async def verify_payment(charge_id: str) -> bool:
    """
    Verify if payment is successful

    Args:
        charge_id: Omise charge ID

    Returns:
        True if paid, False otherwise
    """
    if charge_id.startswith("demo_"):
        # Demo mode always returns success
        return True

    charge = await omise_service.get_charge(charge_id)
    return charge["paid"] and charge["status"] == "successful"
