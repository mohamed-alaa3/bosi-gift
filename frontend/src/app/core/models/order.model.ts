import { LocalizedText, ObjectId } from './api-response.model';
import { AddressSnapshot } from './address.model';
import { SelectedOption } from './cart.model';

export type OrderStatus =
  'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cod' | 'deposit' | 'full';
export type PaymentProofMethod = 'vodafone' | 'instapay';

export interface OrderItem {
  product: ObjectId | null;
  nameSnapshot: LocalizedText;
  imageSnapshot: string;
  imageUrl?: string;
  priceAtPurchase: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  subtotal: number;
  type?: 'product' | 'gift-box';
  giftBox?: any;
}

export interface Order {
  _id: ObjectId;
  user: ObjectId | { _id: ObjectId; name: string; email: string };
  orderNumber: string;
  items: OrderItem[];
  shippingAddress: AddressSnapshot;
  subtotal: number;
  shippingFee: number;
  tax: number;
  discount: number;
  paymentDiscount: number;
  couponCode?: string;
  total: number;
  amountDueNow: number;
  remainingAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  /** Whether a payment proof was uploaded (Phase 3). */
  hasPaymentProof?: boolean;
  /** Authenticated endpoint to fetch the proof image (if hasPaymentProof). */
  paymentProofUrl?: string | null;
  /** Which number the customer transferred to. */
  paymentProofMethod?: PaymentProofMethod | '';
  rejectionReason?: string;
  paymentReviewedAt?: string | null;
  paymentReviewedBy?: ObjectId | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- Gift Box Payload ----------
export interface GiftBoxOrderPayload {
  boxId: ObjectId;
  items: Array<{ productId: ObjectId; quantity: number }>;
  wrapStyleId?: ObjectId | null;
  ribbonId?: ObjectId | null;
  note?: string;
}

// ---------- Quote ----------
export interface QuoteOrderPayload {
  shippingAddress: Partial<AddressSnapshot> & { governorate: string };
  paymentMethod: PaymentMethod;
  couponCode?: string;
  paymentProofMethod?: PaymentProofMethod;
}

export interface QuoteGovernorate {
  key: string;
  name: LocalizedText;
  fee: number;
}

export interface QuotePaymentSettings {
  depositAmount: number;
  fullPaymentDiscountPercent: number;
  vodafoneCashNumber: string;
  instapayNumber: string;
}

export interface QuoteCoupon {
  code: string;
  discount: number;
}

export interface QuoteResponse {
  governorate: QuoteGovernorate;
  paymentSettings: QuotePaymentSettings;
  coupon: QuoteCoupon | null;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  tax: number;
  couponDiscount: number;
  paymentDiscount: number;
  total: number;
  amountDueNow: number;
  remainingAmount: number;
}

// ---------- Create ----------
export interface CreateOrderPayload {
  shippingAddress: AddressSnapshot;
  notes?: string;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  paymentProofMethod?: PaymentProofMethod;
  amountDueNow: number;
  paymentProof?: File | null;
}

export interface CreateOrderResponse {
  order: Order;
  whatsappMessage: string;
}

// ---------- Update Status (Phase 1) ----------
export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  reason?: string;
  confirm?: boolean;
}

// ---------- Query / Tracking ----------
export interface OrderQuery {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export interface OrderTracking {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}
