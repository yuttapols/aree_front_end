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
  active: boolean;
  palette: PlatePaletteDto | null;
  productCount: number;
}

export interface CategoryUpsertRequest {
  name: string;
  nameEn: string;
  slug: string;
  description: string;
  icon: string;
  active: boolean;
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
  available: boolean;
  sortOrder: number;
}

export interface OptionGroupResponse {
  id: number;
  name: string;
  nameEn: string;
  minSelect: number;
  maxSelect: number;
  active: boolean;
  sortOrder: number;
  items: OptionItemResponse[];
}

export interface OptionItemUpsert {
  id: number | null;
  name: string;
  nameEn: string;
  extraPrice: number;
  available: boolean;
}

export interface OptionGroupUpsertRequest {
  name: string;
  nameEn: string;
  minSelect: number;
  maxSelect: number;
  active: boolean;
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
  available: boolean;
  recommended: boolean;
  active: boolean;
  sortOrder: number;
  badge: ProductBadge | null;
  rating: number;
  reviews: number;
  palette: PlatePaletteDto | null;
  optionGroupIds: number[];
}

export interface PublicProductResponse extends ProductResponse {
  hasOptions: boolean;
  optionGroups: OptionGroupResponse[];
  promotionIds: number[];
}

export interface ProductSummaryResponse {
  id: number;
  categoryId: number;
  code: string;
  name: string;
  nameEn?: string | null;
  description: string | null;
  descriptionEn?: string | null;
  price: number;
  originalPrice?: number | null;
  imageUrl: string | null;
  available: boolean;
  recommended: boolean;
  hasOptions: boolean;
  badge?: ProductBadge | null;
  rating?: number;
  reviews?: number;
  palette?: PlatePaletteDto | null;
  promotionIds?: number[];
}

export interface ProductImageResponse {
  id: number;
  url: string;
  sortOrder: number;
}

export interface ProductDetailResponse extends ProductSummaryResponse {
  categoryName?: string;
  images?: ProductImageResponse[];
  optionGroups: OptionGroupResponse[];
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
  available: boolean;
  recommended: boolean;
  active: boolean;
  sortOrder: number;
  badge: ProductBadge | null;
}

export interface ProductOptionGroupBinding {
  optionGroupId: number;
  sortOrder: number;
}

export interface ProductQuery {
  page: number;
  size: number;
  categoryId?: number | null;
  keyword?: string;
  active?: boolean | null;
}

export interface MenuCategoryResponse {
  category: CategoryResponse;
  products: ProductSummaryResponse[];
}

export type MenuResponse = MenuCategoryResponse[];
