import { Product, ObjectId, LocalizedText } from '../../core/models';

export interface GiftBox {
  _id: ObjectId;
  name: LocalizedText;
  slug: string;
  description: LocalizedText;
  image: string;
  imageUrl?: string;
  basePrice: number;
  capacity: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface WrapStyle {
  _id: ObjectId;
  name: LocalizedText;
  slug: string;
  description: LocalizedText;
  image: string;
  imageUrl?: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Ribbon {
  _id: ObjectId;
  name: LocalizedText;
  slug: string;
  color: string;
  image: string;
  imageUrl?: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type BuilderStep = 'box' | 'items' | 'wrap' | 'review';

export interface GiftBoxSelection {
  box: GiftBox | null;
  items: Product[];
  wrapStyle: WrapStyle | null;
  ribbon: Ribbon | null;
  note: string;
}
