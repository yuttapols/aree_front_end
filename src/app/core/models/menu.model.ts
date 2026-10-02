export type Lang = 'th' | 'en';

export type LocalizedText = Record<Lang, string>;

export type MenuBadge = 'bestseller' | 'new' | 'recommended';

export interface PlatePalette {
  base: string;
  main: string;
  accent: string;
  garnish: string;
}

export interface MenuOption {
  id: string;
  optionItemId: number;
  groupId: number;
  name: LocalizedText;
  price: number;
  available: boolean;
}

export interface MenuOptionGroup {
  id: number;
  name: LocalizedText;
  minSelect: number;
  maxSelect: number;
  options: MenuOption[];
}

export interface MenuCategory {
  id: string;
  categoryId: number;
  name: LocalizedText;
  icon: string;
  palette: PlatePalette;
}

export interface MenuItem {
  id: string;
  productId: number;
  code: string;
  categoryId: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  originalPrice?: number;
  badge?: MenuBadge;
  soldOut?: boolean;
  recommended: boolean;
  rating: number;
  reviews: number;
  palette: PlatePalette;
  imageUrl: string | null;
  hasOptions: boolean;
  optionsLoaded: boolean;
  optionGroups: MenuOptionGroup[];
  promotionIds: number[];
}

export interface CartLine {
  key: string;
  item: MenuItem;
  options: MenuOption[];
  qty: number;
  unitPrice: number;
}

export interface HeroSlide {
  id: string;
  lineOne: LocalizedText;
  lineTwo: LocalizedText;
  highlight: LocalizedText;
  subtitle: LocalizedText;
}
