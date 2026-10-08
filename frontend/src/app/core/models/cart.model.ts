import { LocalizedText, ObjectId } from './api-response.model';

/**
 * Selected option on a cart item (snapshot of the user's choice).
 * Example: `{ name: { en: 'Scent', ar: 'الرائحة' }, value: { en: 'Midnight Jasmine', ar: 'الياسمين الليلي' } }`
 */
export interface SelectedOption {
  name: LocalizedText;
  value: LocalizedText;
}
export interface CartGiftBox {
  boxId: ObjectId;
  boxName: LocalizedText;
  boxPrice: number;
  boxImage: string;
  boxImageUrl?: string;
  capacity: number;
  items: Array<{
    productId: ObjectId;
    name: LocalizedText;
    price: number;
    image: string;
    imageUrl?: string;
    quantity: number;
  }>;
  wrap: {
    wrapStyleId: ObjectId;
    name: LocalizedText;
    price: number;
    image: string;
    imageUrl?: string;
  } | null;
  ribbon: {
    ribbonId: ObjectId;
    name: LocalizedText;
    price: number;
    color: string;
    image: string;
    imageUrl?: string;
  } | null;
  note: string;
}

/**
 * Product information embedded in the cart — fresh from the DB at fetch time.
 * Null when the product is no longer available.
 */
export interface CartItemProduct {
  _id: ObjectId;
  name: LocalizedText;
  image: string;
  imageUrl: string;
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  stock: number;
}

export interface CartItem {
  _id: ObjectId;
  type: 'product' | 'gift-box';
  product: CartItemProduct | null;
  giftBox: CartGiftBox | null;
  quantity: number;
  selectedOptions: SelectedOption[];
  lineTotal?: number;
  available: boolean;
  reason: string | null;
}

export interface Cart {
  _id: ObjectId;
  user: ObjectId;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  hasUnavailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartPayload {
  productId: ObjectId;
  quantity?: number;
  selectedOptions?: SelectedOption[];
}

export interface UpdateCartItemPayload {
  quantity: number;
}