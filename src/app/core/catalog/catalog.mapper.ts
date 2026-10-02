import {
  CategoryResponse,
  OptionGroupResponse,
  ProductDetailResponse,
  ProductSummaryResponse,
} from '../api/models/catalog.model';
import { FALLBACK_PALETTES } from '../data/menu.data';
import {
  LocalizedText,
  MenuCategory,
  MenuItem,
  MenuOptionGroup,
  PlatePalette,
} from '../models/menu.model';

export function localized(th: string | null | undefined, en?: string | null): LocalizedText {
  const thai = th ?? '';
  return { th: thai, en: en || thai };
}

export function fallbackPalette(seed: number): PlatePalette {
  return FALLBACK_PALETTES[Math.abs(seed) % FALLBACK_PALETTES.length] as PlatePalette;
}

export function toMenuCategory(category: CategoryResponse): MenuCategory {
  return {
    id: category.slug,
    categoryId: category.id,
    name: localized(category.name, category.nameEn),
    icon: category.icon,
    palette: category.palette ?? fallbackPalette(category.id),
  };
}

export function toMenuOptionGroup(group: OptionGroupResponse): MenuOptionGroup {
  return {
    id: group.id,
    name: localized(group.name, group.nameEn),
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    options: group.items.map((item) => ({
      id: String(item.id),
      optionItemId: item.id,
      groupId: group.id,
      name: localized(item.name, item.nameEn),
      price: item.extraPrice,
      available: item.available,
    })),
  };
}

function isProductDetail(
  product: ProductSummaryResponse | ProductDetailResponse,
): product is ProductDetailResponse {
  return Array.isArray((product as ProductDetailResponse).optionGroups);
}

export function toMenuItem(
  product: ProductSummaryResponse | ProductDetailResponse,
  categorySlug: string,
  knownPromotionIds: number[] = [],
): MenuItem {
  const optionGroups = isProductDetail(product) ? product.optionGroups : [];
  return {
    id: String(product.id),
    productId: product.id,
    code: product.code,
    categoryId: categorySlug,
    name: localized(product.name, product.nameEn),
    description: localized(product.description, product.descriptionEn),
    price: product.price,
    originalPrice: product.originalPrice ?? undefined,
    badge: product.badge ?? undefined,
    soldOut: !product.available,
    recommended: product.recommended,
    rating: product.rating ?? 0,
    reviews: product.reviews ?? 0,
    palette: product.palette ?? fallbackPalette(product.id),
    imageUrl: product.imageUrl,
    hasOptions: product.hasOptions || optionGroups.length > 0,
    optionsLoaded: isProductDetail(product) || !product.hasOptions,
    optionGroups: optionGroups.map(toMenuOptionGroup),
    promotionIds: product.promotionIds ?? knownPromotionIds,
  };
}
