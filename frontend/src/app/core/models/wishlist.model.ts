import { LocalizedText, ObjectId } from './api-response.model';

/**
 * Simplified product preview returned inside the wishlist response.
 */
export interface WishlistProductPreview {
  _id: ObjectId;
  name: LocalizedText;
  slug: string;
  image: string;
  imageUrl: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  isActive: boolean;
}

export interface Wishlist {
  _id: ObjectId;
  user: ObjectId;
  items: WishlistProductPreview[];
  count: number;
  updatedAt: string;
}

export interface AddToWishlistPayload {
  productId: ObjectId;
}