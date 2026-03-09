import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle, QrCode, Loader2 } from "lucide-react";
import { orderService } from "../services/orderService";
import type { QRCodeResponse } from "../services/orderService";
import { useAuthStore } from "../stores/authStore";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function OrderPayment() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [qrData, setQrData] = useState<QRCodeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    loadQRCode();
  }, [isAuthenticated, navigate, orderId]);

  useEffect(() => {
    if (!qrData || paid) return;
    const interval = setInterval(() => {
      verifyPayment();
    }, 5000);
    return () => clearInterval(interval);
  }, [qrData, paid]);

  const loadQRCode = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const data = await orderService.generatePaymentQR(parseInt(orderId));
      setQrData(data);
    } catch (error: any) {
      alert(error.response?.data?.detail || "ไม่สามารถสร้าง QR Code ได้");
      navigate(`/orders/${orderId}`);
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async () => {
    if (!orderId || verifying) return;
    try {
      setVerifying(true);
      const result = await orderService.verifyPayment(parseInt(orderId));
      if (result.paid) {
        setPaid(true);
        setTimeout(() => {
          navigate(`/orders/${orderId}`);
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to verify payment:", error);
    } finally {
      setVerifying(false);
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-400 mt-3">กำลังสร้าง QR Code...</p>
      </div>
    );
  }

  if (!qrData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <QrCode className="w-16 h-16 text-gray-200 mb-4" />
        <p className="text-gray-400 font-medium">ไม่สามารถสร้าง QR Code ได้</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(`/orders/${orderId}`)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">ชำระเงิน</h1>
      </div>

      <div className="px-4">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {paid ? (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-success-500" />
              </div>
              <h2 className="text-xl font-bold text-success-600 mb-2">
                ชำระเงินสำเร็จ!
              </h2>
              <p className="text-sm text-gray-500">
                กำลังนำคุณไปหน้ารายละเอียดคำสั่งซื้อ...
              </p>
            </div>
          ) : (
            <>
              {/* QR Section */}
              <div className="p-6 text-center">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  สแกนเพื่อชำระเงิน
                </h2>
                <p className="text-sm text-gray-400 mb-5">
                  ใช้แอปธนาคารสแกน QR Code ด้านล่าง
                </p>

                {qrData.demo_mode && (
                  <div className="bg-warning-50 border border-warning-200 rounded-xl p-3 mb-5 text-left">
                    <p className="text-xs font-bold text-warning-700">โหมดทดสอบ</p>
                    <p className="text-xs text-warning-600 mt-0.5">
                      นี่คือ QR Code ทดสอบ ในโหมดจริงจะเชื่อมต่อกับ Omise
                    </p>
                  </div>
                )}

                <div className="inline-block p-4 bg-white border-2 border-gray-100 rounded-2xl mb-5">
                  <img
                    src={qrData.qr_code_url}
                    alt="PromptPay QR Code"
                    className="w-56 h-56"
                  />
                </div>

                <p className="text-3xl font-bold text-primary-600 mb-1">
                  ฿{qrData.amount.toFixed(2)}
                </p>
                {qrData.expires_at && (
                  <p className="text-xs text-gray-400">
                    QR Code หมดอายุเวลา {new Date(qrData.expires_at).toLocaleTimeString("th-TH")}
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div className="border-t border-gray-100 p-5">
                <h3 className="font-bold text-sm text-gray-900 mb-3">วิธีชำระเงิน</h3>
                <ol className="space-y-2">
                  {[
                    "เปิดแอปธนาคารบนมือถือ",
                    'เลือก "สแกน QR" หรือ "พร้อมเพย์"',
                    "สแกน QR Code ด้านบน",
                    "ตรวจสอบยอดเงินและยืนยันการชำระ",
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-600">{text}</span>
                    </li>
                  ))}
                </ol>

                <div className="mt-5 p-3 bg-primary-50 rounded-xl flex items-center gap-2">
                  {verifying ? (
                    <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                  ) : (
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
                  )}
                  <p className="text-xs text-primary-700 font-medium">
                    {verifying ? "กำลังตรวจสอบการชำระเงิน..." : "รอการยืนยันการชำระเงิน..."}
                  </p>
                </div>

                <button
                  onClick={verifyPayment}
                  disabled={verifying}
                  className="w-full mt-4 py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl text-sm font-bold transition-colors"
                >
                  {verifying ? "กำลังตรวจสอบ..." : "ตรวจสอบสถานะการชำระเงิน"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
