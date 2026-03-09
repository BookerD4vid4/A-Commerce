import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Check, Loader2, RefreshCw } from "lucide-react";
import { addressService } from "../../services/addressService";
import { useChatStore } from "../../stores/chatStore";
import type { Address } from "../../services/addressService";

interface Props {
  isLatest?: boolean;
}

export default function ChatAddressSelector({ isLatest = true }: Props) {
  const navigate = useNavigate();
  const { addLocalMessage, closeChat } = useChatStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
      const defaultAddr = data.find((a) => a.is_default);
      if (defaultAddr) setSelectedId(defaultAddr.address_id);
      else if (data.length > 0) setSelectedId(data[0].address_id);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedId || confirmed) return;
    setConfirmed(true);
    const addr = addresses.find((a) => a.address_id === selectedId)!;
    const addressText = [
      addr.recipient_name,
      addr.address_line,
      addr.subdistrict,
      addr.district,
      addr.province,
    ]
      .filter(Boolean)
      .join(" ");
    addLocalMessage(`ที่อยู่จัดส่ง: ${addressText}`, {
      action: "show_payment_method",
      checkoutData: { address_id: selectedId, address_text: addressText },
    });
  };

  const handleGoToProfile = () => {
    addLocalMessage("กรุณาเพิ่มที่อยู่จัดส่งในหน้าโปรไฟล์ก่อนนะคะ");
    closeChat();
    navigate("/profile");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
        <span className="text-xs text-gray-400">กำลังโหลดที่อยู่...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-3 space-y-2">
        <p className="text-xs text-red-600">ไม่สามารถโหลดที่อยู่ได้ กรุณาลองใหม่</p>
        <button
          onClick={loadAddresses}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-semibold hover:bg-primary-600 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>ลองใหม่</span>
        </button>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
        <p className="text-xs text-gray-500">ยังไม่มีที่อยู่จัดส่ง กรุณาเพิ่มที่อยู่ก่อนค่ะ</p>
        <button
          onClick={handleGoToProfile}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-semibold hover:bg-primary-600 transition-colors"
        >
          <MapPin className="w-3 h-3" />
          <span>เพิ่มที่อยู่</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-600">เลือกที่อยู่จัดส่ง:</p>

      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {addresses.map((addr) => (
          <button
            key={addr.address_id}
            onClick={() => isLatest && !confirmed && setSelectedId(addr.address_id)}
            disabled={!isLatest || confirmed}
            className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
              selectedId === addr.address_id
                ? "border-primary-400 bg-primary-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            } ${!isLatest || confirmed ? "cursor-default opacity-75" : ""}`}
          >
            <div className="flex items-start gap-2">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  selectedId === addr.address_id
                    ? "border-primary-500 bg-primary-500"
                    : "border-gray-300"
                }`}
              >
                {selectedId === addr.address_id && (
                  <Check className="w-2.5 h-2.5 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">
                  {addr.recipient_name}
                  {addr.is_default && (
                    <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-primary-100 text-primary-600 rounded-md font-semibold">
                      ค่าเริ่มต้น
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                  {[addr.address_line, addr.subdistrict, addr.district, addr.province, addr.postal_code]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selectedId || !isLatest || confirmed}
        className="w-full flex items-center justify-center gap-1.5 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg text-xs font-semibold transition-colors"
      >
        <Check className="w-3 h-3" />
        <span>{confirmed ? "ยืนยันแล้ว" : "ยืนยันที่อยู่"}</span>
      </button>
    </div>
  );
}
