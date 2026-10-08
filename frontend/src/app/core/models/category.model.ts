import { LocalizedText, ObjectId } from './api-response.model';

export interface Category {
  _id: ObjectId;
  name: LocalizedText;
  slug: string;
  description: LocalizedText;
  image: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Used for create/update — this payload is sent as `multipart/form-data`.
 * The image itself is a File handled by the service, not part of this type.
 */
export interface CategoryPayload {
  name: LocalizedText;
  description?: LocalizedText;
  isActive?: boolean;
  sortOrder?: number;
}