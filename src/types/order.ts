export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PURCHASED"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

export interface Order {
  id: string;
  productId: string;
  userId: string;
  jastiperId: string;
  jumlah: number;
  alamatPengiriman: string;
  totalAmount?: number | null;
  jastiperRating?: number | null;
  productRating?: number | null;
  ratingSubmitted?: boolean;
  status: OrderStatus;
}

export interface CheckoutPayload {
  productId: string;
  userId: string;
  jastiperId: string;
  jumlah: number;
  alamatPengiriman: string;
}

export interface RatingPayload {
  userId: string;
  jastiperRating: number;
  productRating: number;
}
