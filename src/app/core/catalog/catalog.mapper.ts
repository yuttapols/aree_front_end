import {
  CategoryResponse,
  OptionGroupResponse,
  PublicProductResponse,
} from '../api/models/catalog.model';
import { FALLBACK_PALETTES } from '../data/menu.data';
import {
  LocalizedText,
  MenuCategory,
  MenuItem,
  MenuOptionGroup,
  PlatePalette,
} from '../models/menu.model';

export function localized(th: string, en?: string | null): LocalizedText {
  return { th, en: en || th };
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
    options: group.items
      .filter((item) => item.isAvailable)
      .map((item) => ({
        id: String(item.id),
        optionItemId: item.id,
        groupId: group.id,
        name: localized(item.name, item.nameEn),
        price: item.extraPrice,
      })),
  };
}

export function toMenuItem(product: PublicProductResponse, categorySlug: string): MenuItem {
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
    soldOut: !product.isAvailable,
    recommended: product.isRecommended,
    rating: product.rating,
    reviews: product.reviews,
    palette: product.palette ?? fallbackPalette(product.id),
    imageUrl: product.imageUrl,
    optionGroups: product.optionGroups.map(toMenuOptionGroup),
    promotionIds: product.promotionIds,
  };
}
