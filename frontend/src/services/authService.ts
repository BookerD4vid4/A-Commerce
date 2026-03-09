import api from "./api";

export interface CheckPhoneResponse {
  exists: boolean;
  masked_name?: string;
}

export interface RequestOTPResponse {
  message: string;
  expires_in: number;
  phone_masked: string;
}

export interface VerifyOTPResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  is_new_user: boolean;
  user: {
    id: number;
    phone: string;
    name: string | null;
    role: string;
  };
}

export const authService = {
  /**
   * ตรวจสอบว่าเบอร์โทรมีในระบบหรือไม่
   */
  async checkPhone(phoneNumber: string): Promise<CheckPhoneResponse> {
    const response = await api.post<CheckPhoneResponse>(
      "/api/auth/check-phone",
      {
        phone_number: phoneNumber,
      },
    );
    return response.data;
  },

  /**
   * ขอ OTP
   */
  async requestOTP(
    phoneNumber: string,
    purpose: "register" | "login",
  ): Promise<RequestOTPResponse> {
    const response = await api.post<RequestOTPResponse>(
      "/api/auth/request-otp",
      {
        phone_number: phoneNumber,
        purpose,
      },
    );
    return response.data;
  },

  /**
   * ยืนยัน OTP
   */
  async verifyOTP(
    phoneNumber: string,
    otpCode: string,
    purpose: "register" | "login",
  ): Promise<VerifyOTPResponse> {
    const response = await api.post<VerifyOTPResponse>("/api/auth/verify-otp", {
      phone_number: phoneNumber,
      otp_code: otpCode,
      purpose,
    });
    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<VerifyOTPResponse> {
    const response = await api.post<VerifyOTPResponse>("/api/auth/refresh", {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * ออกจากระบบ
   */
  async logout(refreshToken: string): Promise<void> {
    await api.post("/api/auth/logout", {
      refresh_token: refreshToken,
    });
  },
};
