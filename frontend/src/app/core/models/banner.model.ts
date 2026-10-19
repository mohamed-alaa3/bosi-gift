import { LocalizedText, ObjectId } from './api-response.model';

export type BannerPosition = 'hero' | 'promo' | 'home-mid';

export interface Banner {
  _id: ObjectId;
  title: LocalizedText;
  subtitle: LocalizedText;
  image: string;
  imageUrl?: string;
  /** Optional portrait image used on narrow screens. */
  mobileImage?: string;
  mobileImageUrl?: string;
  buttonText: LocalizedText;
  buttonLink: string;
  position: BannerPosition;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BannerPayload {
  title: LocalizedText;
  subtitle?: LocalizedText;
  buttonText?: LocalizedText;
  buttonLink?: string;
  position: BannerPosition;
  isActive?: boolean;
  sortOrder?: number;
}