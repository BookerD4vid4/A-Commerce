import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { authService } from "../services/authService";
import PhoneInput from "../components/auth/PhoneInput";
import OTPInput from "../components/auth/OTPInput";

type AuthStep = "phone" | "otp";

export default function AuthPage() {
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();

  const [step, setStep] = useState<AuthStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [purpose, setPurpose] = useState<"register" | "login">("login");
  const [maskedName, setMaskedName] = useState<string>();
  const [existingUser, setExistingUser] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState(300);

  const handlePhoneSubmit = async (phone: string) => {
    setIsLoading(true);
    setError("");

    try {
      const checkResult = await authService.checkPhone(phone);
      setPhoneNumber(phone);
      setExistingUser(checkResult.exists);
      setPurpose(checkResult.exists ? "login" : "register");
      setMaskedName(checkResult.masked_name);

      const otpResult = await authService.requestOTP(
        phone,
        checkResult.exists ? "login" : "register",
      );
      setOtpExpiresIn(otpResult.expires_in);
      setStep("otp");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await authService.verifyOTP(phoneNumber, otp, purpose);
      setTokens(result.access_token, result.refresh_token);
      setUser(result.user);
      navigate("/");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "รหัส OTP ไม่ถูกต้อง");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await authService.requestOTP(phoneNumber, purpose);
      setOtpExpiresIn(result.expires_in);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "ไม่สามารถส่ง OTP ได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-500 rounded-2xl mb-3">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-sm font-bold text-primary-600">A-Commerce</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-7">
          {step === "phone" ? (
            <PhoneInput
              onSubmit={handlePhoneSubmit}
              isLoading={isLoading}
              existingUser={existingUser}
              maskedName={maskedName}
            />
          ) : (
            <div className="space-y-6">
              <OTPInput
                onComplete={handleOTPComplete}
                onResend={handleResendOTP}
                isLoading={isLoading}
                error={error}
                phoneNumber={phoneNumber}
                expiresIn={otpExpiresIn}
              />

              <button
                onClick={handleBackToPhone}
                disabled={isLoading}
                className="w-full text-gray-400 hover:text-gray-600 font-medium text-sm
                  disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                ← กลับไปแก้ไขเบอร์โทร
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">เข้าสู่ระบบด้วย OTP ปลอดภัย ไม่ต้องจำรหัสผ่าน</p>
        </div>
      </div>
    </div>
  );
}
