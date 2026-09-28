import { PlatePaletteDto } from './common.model';

export type ProductBadge = 'bestseller' | 'new' | 'recommended';

export interface CategoryResponse {
  id: number;
  name: string;
  nameEn: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  palette: PlatePaletteDto | null;
  productCount: number;
}

export interface CategoryUpsertRequest {
  name: string;
  nameEn: string;
  slug: string;
  description: string;
  icon: string;
  isActive: boolean;
}

export interface SortOrderItem {
  id: number;
  sortOrder: number;
}

export interface OptionItemResponse {
  id: number;
  name: string;
  nameEn: string;
  extraPrice: number;
  isAvailable: boolean;
  sortOrder: number;
}

export interface OptionGroupResponse {
  id: number;
  name: string;
  nameEn: string;
  minSelect: number;
  maxSelect: number;
  isActive: boolean;
  sortOrder: number;
  items: OptionItemResponse[];
}

export interface OptionItemUpsert {
  id: number | null;
  name: string;
  nameEn: string;
  extraPrice: number;
  isAvailable: boolean;
}

export interface OptionGroupUpsertRequest {
  name: string;
  nameEn: string;
  minSelect: number;
  maxSelect: number;
  isActive: boolean;
  items: OptionItemUpsert[];
}

export interface ProductResponse {
  id: number;
  categoryId: number;
  categoryName: string;
  code: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  price: number;
  originalPrice: number | null;
  imageUrl: string | null;
  isAvailable: boolean;
  isRecommended: boolean;
  isActive: boolean;
  sortOrder: number;
  badge: ProductBadge | null;
  rating: number;
  reviews: number;
  palette: PlatePaletteDto | null;
  optionGroupIds: number[];
}

export interface PublicProductResponse extends ProductResponse {
  optionGroups: OptionGroupResponse[];
  promotionIds: number[];
}

export interface ProductUpsertRequest {
  categoryId: number;
  code: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  price: number;
  originalPrice: number | null;
  imageUrl: string | null;
  isAvailable: boolean;
  isRecommended: boolean;
  isActive: boolean;
  badge: ProductBadge | null;
  optionGroupIds: number[];
}

export interface ProductQuery {
  page: number;
  size: number;
  categoryId?: number | null;
  keyword?: string;
  active?: boolean | null;
}

export interface MenuCategoryResponse extends CategoryResponse {
  products: PublicProductResponse[];
}

export interface MenuResponse {
  categories: MenuCategoryResponse[];
}
