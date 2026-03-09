import { useState, useRef, useEffect } from "react";
import { KeyRound } from "lucide-react";
import LoadingSpinner from "../common/LoadingSpinner";

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onResend: () => void;
  isLoading?: boolean;
  error?: string;
  phoneNumber: string;
  expiresIn?: number;
}

export default function OTPInput({
  length = 6,
  onComplete,
  onResend,
  isLoading = false,
  error = "",
  phoneNumber,
  expiresIn = 300,
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
  const [timeLeft, setTimeLeft] = useState(expiresIn);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, "");

    if (digit.length > 1) {
      const digits = digit.slice(0, length).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < length) {
          newOtp[index + i] = d;
        }
      });
      setOtp(newOtp);
      const lastIndex = Math.min(index + digits.length - 1, length - 1);
      inputRefs.current[lastIndex]?.focus();
      if (newOtp.every((d) => d !== "")) {
        onComplete(newOtp.join(""));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== "")) {
      onComplete(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    const digits = pastedData.slice(0, length).split("");
    const newOtp = Array(length).fill("");
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtp(newOtp);
    const lastIndex = Math.min(digits.length - 1, length - 1);
    inputRefs.current[lastIndex]?.focus();
    if (newOtp.every((d) => d !== "")) {
      onComplete(newOtp.join(""));
    }
  };

  const handleResend = () => {
    setOtp(Array(length).fill(""));
    setTimeLeft(expiresIn);
    inputRefs.current[0]?.focus();
    onResend();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const maskPhone = (phone: string): string => {
    if (phone.length < 6) return phone;
    return phone.slice(0, 3) + "****" + phone.slice(-3);
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-2xl mb-4">
          <KeyRound className="w-8 h-8 text-primary-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ยืนยัน OTP</h1>
        <p className="text-gray-500 text-sm">กรอกรหัส OTP ที่ส่งไปยัง</p>
        <p className="text-lg font-bold text-gray-900">
          {maskPhone(phoneNumber)}
        </p>
      </div>

      {/* OTP Input boxes */}
      <div className="flex justify-center gap-2.5">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={isLoading}
            className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl
              focus:outline-none focus:ring-2 transition-all ${
                error
                  ? "border-danger-300 focus:ring-danger-400"
                  : digit
                    ? "border-primary-400 focus:ring-primary-400"
                    : "border-gray-200 focus:ring-primary-400 focus:border-primary-400"
              } disabled:bg-gray-50 disabled:cursor-not-allowed`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-3 text-center">
          <p className="text-xs text-danger-600 font-medium">{error}</p>
        </div>
      )}

      {/* Timer */}
      <div className="text-center">
        {timeLeft > 0 ? (
          <p className="text-sm text-gray-500">
            รหัส OTP หมดอายุใน{" "}
            <span className="font-bold text-primary-600">
              {formatTime(timeLeft)}
            </span>
          </p>
        ) : (
          <p className="text-sm text-danger-500 font-semibold">รหัส OTP หมดอายุแล้ว</p>
        )}
      </div>

      {/* Resend button */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={timeLeft > 0 || isLoading}
          className="text-sm text-primary-600 font-semibold hover:text-primary-700
            disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {timeLeft > 0
            ? `ส่งรหัสใหม่ (${formatTime(timeLeft)})`
            : "ส่งรหัส OTP ใหม่"}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-gray-500">กำลังตรวจสอบ...</span>
        </div>
      )}

      {import.meta.env.DEV && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-3 text-center">
          <p className="text-xs text-warning-700">
            <strong>DEMO:</strong> ใช้ OTP: 123456
          </p>
        </div>
      )}
    </div>
  );
}
