import { useState } from "react";
import { Phone } from "lucide-react";
import LoadingSpinner from "../common/LoadingSpinner";

interface PhoneInputProps {
  onSubmit: (phone: string) => void;
  onPhoneChange?: (phone: string) => void;
  isLoading?: boolean;
  defaultValue?: string;
  existingUser?: boolean;
  maskedName?: string;
}

export default function PhoneInput({
  onSubmit,
  onPhoneChange,
  isLoading = false,
  defaultValue = "",
  existingUser = false,
  maskedName,
}: PhoneInputProps) {
  const [phone, setPhone] = useState(defaultValue);
  const [error, setError] = useState("");

  const validatePhone = (value: string): boolean => {
    const cleaned = value.replace(/[^0-9]/g, "");

    if (!cleaned.startsWith("0")) {
      setError("เบอร์โทรต้องขึ้นต้นด้วย 0");
      return false;
    }

    if (cleaned.length !== 10) {
      setError("เบอร์โทรต้องมี 10 หลัก");
      return false;
    }

    setError("");
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value.length <= 10) {
      setPhone(value);
      onPhoneChange?.(value);
      if (value.length === 10) {
        validatePhone(value);
      } else {
        setError("");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePhone(phone)) {
      onSubmit(phone);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-2xl mb-4">
          <Phone className="w-8 h-8 text-primary-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {existingUser ? "เข้าสู่ระบบ" : "ยินดีต้อนรับ"}
        </h1>
        <p className="text-gray-500 text-sm">
          {existingUser
            ? "กรอกเบอร์โทรศัพท์เพื่อรับ OTP"
            : "กรุณากรอกเบอร์โทรศัพท์เพื่อเริ่มต้น"}
        </p>
      </div>

      {existingUser && maskedName && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500">พบบัญชี</p>
          <p className="text-base font-bold text-gray-900 mt-0.5">{maskedName}</p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
          เบอร์โทรศัพท์
        </label>
        <input
          type="tel"
          id="phone"
          value={phone}
          onChange={handleChange}
          placeholder="0812345678"
          disabled={isLoading}
          autoFocus
          className={`w-full px-4 py-3.5 text-lg border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
            error
              ? "border-danger-300 focus:ring-danger-400"
              : "border-gray-200 focus:ring-primary-400 focus:border-primary-400"
          } disabled:bg-gray-50 disabled:cursor-not-allowed`}
        />
        {error && <p className="text-xs text-danger-500 font-medium">{error}</p>}
        <p className="text-xs text-gray-400">ตัวอย่าง: 0812345678 (10 หลัก)</p>
      </div>

      <button
        type="submit"
        disabled={isLoading || phone.length !== 10 || !!error}
        className="w-full bg-primary-500 text-white py-3.5 px-6 rounded-xl font-bold text-base
          hover:bg-primary-600 active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2
          disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" />
            กำลังตรวจสอบ...
          </span>
        ) : (
          "ดำเนินการต่อ"
        )}
      </button>

      {import.meta.env.DEV && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-3 text-center">
          <p className="text-xs text-warning-700">
            <strong>DEMO:</strong> Admin: 0999999999 | OTP: 123456
          </p>
        </div>
      )}
    </form>
  );
}
