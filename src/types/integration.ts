export type BackendService = "auth" | "inventory" | "order" | "voucher" | "wallet";

export interface SessionState {
  token: string;
  userId: string;
  role: string;
}

export interface ApiEnvelope<T> {
  message?: string;
  data?: T;
}

export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  jastiperId?: string;
  originCountry: string;
  purchaseDate: string;
}

export interface Voucher {
  code: string;
  discountType: string;
  discountValue: number;
  minPurchase: number;
  expiryDate: string;
  quota: number;
  termsAndConditions: string;
  active: boolean;
}

export interface WalletResponse {
  walletId: string;
  userId: string;
  balance: string;
}

export interface WalletTransaction {
  transactionId: string;
  walletId: string;
  amount: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
}
