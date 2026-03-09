import api from "./api";

export interface Address {
  address_id: number;
  recipient_name: string;
  phone_number: string;
  address_line: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postal_code?: string;
  is_default: boolean;
}

export interface AddressCreate {
  recipient_name: string;
  phone_number: string;
  address_line: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postal_code?: string;
  is_default?: boolean;
}

export const addressService = {
  async getAddresses(): Promise<Address[]> {
    const response = await api.get("/api/addresses/");
    return response.data;
  },

  async getAddress(addressId: number): Promise<Address> {
    const response = await api.get(`/api/addresses/${addressId}`);
    return response.data;
  },

  async createAddress(address: AddressCreate): Promise<Address> {
    const response = await api.post("/api/addresses/", address);
    return response.data;
  },

  async updateAddress(
    addressId: number,
    address: Partial<AddressCreate>
  ): Promise<Address> {
    const response = await api.put(`/api/addresses/${addressId}`, address);
    return response.data;
  },

  async deleteAddress(addressId: number): Promise<void> {
    await api.delete(`/api/addresses/${addressId}`);
  },

  async setDefaultAddress(addressId: number): Promise<Address> {
    const response = await api.post(`/api/addresses/${addressId}/set-default`);
    return response.data;
  },
};
