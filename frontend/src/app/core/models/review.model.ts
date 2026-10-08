import { ObjectId } from './api-response.model';
import { User } from './user.model';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/**
 * Populated view of a review returned by the API.
 * `user` is populated with just `name` by the backend.
 */
export interface Review {
  _id: ObjectId;
  user: Pick<User, '_id' | 'name'> | ObjectId;
  product: ObjectId;
  rating: number;
  comment: string;
  status: ReviewStatus;
  /** True only when the backend verified a delivered order. */
  isVerifiedPurchase?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReviewType = 'product' | 'service';

export interface ReviewProductPreview {
  _id: ObjectId;
  slug: string;
  name: { en: string; ar: string };
  imageUrl: string;
}

/** The customer's own review (GET /reviews/order/:id, /reviews/mine, create/update). */
export interface OwnReview {
  _id: ObjectId;
  type: ReviewType;
  rating: number;
  comment: string;
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  customerServiceRating: number | null;
  deliveryRating: number | null;
  packagingRating: number | null;
  createdAt: string;
  updatedAt: string;
}

/** What can be reviewed for one of the customer's orders. */
export interface OrderReviewState {
  orderId: ObjectId;
  orderStatus: string;
  canReview: boolean;
  products: { product: ReviewProductPreview; review: OwnReview | null }[];
  service: OwnReview | null;
}

export interface ServiceReviewPayload {
  orderId: ObjectId;
  rating: number;
  comment: string;
  customerServiceRating?: number | null;
  deliveryRating?: number | null;
  packagingRating?: number | null;
}

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string;
  customerServiceRating?: number | null;
  deliveryRating?: number | null;
  packagingRating?: number | null;
}

/** Admin moderation row. */
export interface AdminReview {
  _id: ObjectId;
  type: ReviewType;
  /** customer = through the order flow, admin = manually entered testimonial */
  source: 'customer' | 'admin';
  status: ReviewStatus;
  rating: number;
  comment: string;
  displayName: string;
  isVerifiedPurchase: boolean;
  customerServiceRating: number | null;
  deliveryRating: number | null;
  packagingRating: number | null;
  user: { _id: ObjectId; name: string; email: string } | null;
  product: ReviewProductPreview | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReviewPayload {
  type: ReviewType;
  displayName: string;
  rating: number;
  comment: string;
  product?: ObjectId;
  status?: ReviewStatus;
  /** ISO date (optional) */
  createdAt?: string;
  customerServiceRating?: number | null;
  deliveryRating?: number | null;
  packagingRating?: number | null;
}

/**
 * Public homepage review (GET /api/reviews/featured).
 * Reviewer is exposed by first name only.
 */
export interface FeaturedReview {
  _id: ObjectId;
  type: ReviewType;
  rating: number;
  comment: string;
  createdAt: string;
  userName: string;
  isVerifiedPurchase: boolean;
  /** null for service reviews */
  product: ReviewProductPreview | null;
}

export interface ReviewPayload {
  rating: number;
  comment?: string;
}