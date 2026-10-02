import { OptionGroupResponse, ProductBadge } from '../../api/models/catalog.model';
import { PlatePaletteDto } from '../../api/models/common.model';
import type { MockCategory } from '../mock-db';

export const SEED_CATEGORIES: MockCategory[] = [
  {
    id: 1,
    name: 'โรตีหวาน',
    nameEn: 'Sweet roti',
    slug: 'sweet',
    description: 'โรตีกรอบ ราดหน้าหวาน',
    icon: 'pi pi-heart',
    sortOrder: 1,
    active: true,
    palette: { base: '#f3e2b8', main: '#6b3a1f', accent: '#f1d36b', garnish: '#fff6df' },
  },
  {
    id: 2,
    name: 'โรตีคาว',
    nameEn: 'Savory roti',
    slug: 'savory',
    description: 'โรตีและมะตะบะสายคาว',
    icon: 'pi pi-star',
    sortOrder: 2,
    active: true,
    palette: { base: '#efdcbc', main: '#c96b2c', accent: '#f0b36a', garnish: '#4f7a34' },
  },
  {
    id: 3,
    name: 'เครื่องดื่ม',
    nameEn: 'Drinks',
    slug: 'drink',
    description: 'ชา กาแฟ และเครื่องดื่มเย็น',
    icon: 'pi pi-sun',
    sortOrder: 3,
    active: true,
    palette: { base: '#f3dcc0', main: '#e39343', accent: '#f6dfc0', garnish: '#b85f2a' },
  },
  {
    id: 4,
    name: 'โรตี',
    nameEn: 'Roti',
    slug: 'roti',
    description: 'เมนูโรตี 5 ดาว 15 รส',
    icon: 'pi pi-star',
    sortOrder: 0,
    active: true,
    palette: { base: '#f5e1b3', main: '#d9a441', accent: '#f7c873', garnish: '#7a4a1e' },
  },
];

const TOPPING_GROUP_ID = 4;
const TOPPINGS: [string, string, number][] = [
  ['แยมบลูเบอร์รี่', 'Blueberry jam', 20],
  ['แยมวนิลา', 'Vanilla jam', 20],
  ['แยมช็อกโกแลต', 'Chocolate jam', 20],
  ['แยมส้ม', 'Orange jam', 20],
  ['สังขยาใบเตย', 'Pandan custard', 20],
  ['แยมสับปะรด', 'Pineapple jam', 20],
  ['แยมสตรอว์เบอร์รี่', 'Strawberry jam', 20],
  ['โอวัลตินลูกเกด', 'Ovaltine & raisins', 25],
  ['น้ำพริกเผา', 'Chili paste', 20],
  ['เม็ดเจ็ดสี', 'Rainbow sprinkles', 20],
  ['เนยสด', 'Fresh butter', 20],
  ['ไมโล', 'Milo', 20],
];
const TOPPING_FIRST_ITEM_ID = 100;

export const SEED_OPTION_GROUPS: OptionGroupResponse[] = [
  {
    id: 1,
    name: 'ท็อปปิ้งเพิ่ม',
    nameEn: 'Extra toppings',
    minSelect: 0,
    maxSelect: 4,
    active: true,
    sortOrder: 1,
    items: [
      {
        id: 1,
        name: 'กล้วยเพิ่ม',
        nameEn: 'Extra banana',
        extraPrice: 10,
        available: true,
        sortOrder: 1,
      },
      {
        id: 2,
        name: 'ไข่เพิ่ม',
        nameEn: 'Extra egg',
        extraPrice: 10,
        available: true,
        sortOrder: 2,
      },
      {
        id: 3,
        name: 'ไอศกรีม',
        nameEn: 'Ice cream',
        extraPrice: 15,
        available: true,
        sortOrder: 3,
      },
      {
        id: 4,
        name: 'ชีสแผ่น',
        nameEn: 'Cheese slice',
        extraPrice: 15,
        available: true,
        sortOrder: 4,
      },
    ],
  },
  {
    id: 2,
    name: 'ความหวาน',
    nameEn: 'Sweetness',
    minSelect: 1,
    maxSelect: 1,
    active: true,
    sortOrder: 2,
    items: [
      {
        id: 5,
        name: 'หวานปกติ',
        nameEn: 'Regular',
        extraPrice: 0,
        available: true,
        sortOrder: 1,
      },
      {
        id: 6,
        name: 'หวานน้อย',
        nameEn: 'Less sweet',
        extraPrice: 0,
        available: true,
        sortOrder: 2,
      },
      {
        id: 7,
        name: 'ไม่หวาน',
        nameEn: 'No sugar',
        extraPrice: 0,
        available: true,
        sortOrder: 3,
      },
    ],
  },
  {
    id: 3,
    name: 'เพิ่มเติม',
    nameEn: 'Add-ons',
    minSelect: 0,
    maxSelect: 2,
    active: true,
    sortOrder: 3,
    items: [
      {
        id: 8,
        name: 'ไข่มุก',
        nameEn: 'Tapioca pearls',
        extraPrice: 10,
        available: true,
        sortOrder: 1,
      },
      {
        id: 9,
        name: 'แก้วใหญ่',
        nameEn: 'Large cup',
        extraPrice: 10,
        available: true,
        sortOrder: 2,
      },
    ],
  },
  {
    id: TOPPING_GROUP_ID,
    name: 'ท็อปปิ้ง',
    nameEn: 'Toppings',
    minSelect: 0,
    maxSelect: 10,
    active: true,
    sortOrder: 4,
    items: TOPPINGS.map(([name, nameEn, extraPrice], index) => ({
      id: TOPPING_FIRST_ITEM_ID + index,
      name,
      nameEn,
      extraPrice,
      available: true,
      sortOrder: index + 1,
    })),
  },
];

interface SeedProduct {
  code: string;
  categoryId: number;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  price: number;
  originalPrice?: number;
  badge?: ProductBadge;
  soldOut?: boolean;
  recommended?: boolean;
  rating: number;
  reviews: number;
  palette: PlatePaletteDto;
}

const ROTI_GROUPS = [1];
const DRINK_GROUPS = [2, 3];
const DRINK_CATEGORY_ID = 3;
const DEFAULT_ROTI_CATEGORY_ID = 4;
const DEFAULT_ROTI_PALETTE: PlatePaletteDto = {
  base: '#f5e1b3',
  main: '#d9a441',
  accent: '#f7c873',
  garnish: '#7a4a1e',
};

function defaultRoti(
  code: string,
  name: string,
  nameEn: string,
  price: number,
  recommended: boolean,
  description = '',
  descriptionEn = '',
): SeedProduct {
  return {
    code,
    categoryId: DEFAULT_ROTI_CATEGORY_ID,
    name,
    nameEn,
    description,
    descriptionEn,
    price,
    recommended,
    rating: 0,
    reviews: 0,
    palette: DEFAULT_ROTI_PALETTE,
  };
}

const DEFAULT_ROTI_MENU: SeedProduct[] = [
  defaultRoti('R5D-PLAIN', 'ธรรมดา', 'Plain roti', 15, false),
  defaultRoti('R5D-EGG', 'โรตีใส่ไข่', 'Roti with egg', 25, true),
  defaultRoti('R5D-PLAIN-SP', 'ธรรมดาพิเศษ', 'Plain roti special', 40, false),
  defaultRoti('R5D-EGG-SP', 'โรตีใส่ไข่ พิเศษ', 'Roti with egg special', 35, false),
  defaultRoti('R5D-EGG-BANANA', 'โรตีใส่ไข่ ใส่กล้วย', 'Roti with egg & banana', 40, true),
  defaultRoti(
    'R5D-SIGNATURE',
    'โรตี 5 ดาว 15 รส',
    '5-Star 15-Flavor Roti',
    45,
    true,
    'ใส่ไข่ ใส่กล้วย ใส่แยม ใส่ช็อกโกแลต — เมนูซิกเนเจอร์ของร้าน',
    'Egg, banana, jam and chocolate — our signature roti',
  ),
];

function optionGroupsFor(categoryId: number): number[] {
  if (categoryId === DRINK_CATEGORY_ID) {
    return DRINK_GROUPS;
  }
  return categoryId === DEFAULT_ROTI_CATEGORY_ID ? [TOPPING_GROUP_ID] : ROTI_GROUPS;
}

const PRODUCTS: SeedProduct[] = [
  {
    code: 'BANANA-MILK',
    categoryId: 1,
    name: 'โรตีกล้วยหอมนมสด',
    nameEn: 'Banana & Fresh Milk Roti',
    description: 'กล้วยหอมสุก ราดนมสดและนมข้น',
    descriptionEn: 'Ripe banana with fresh and condensed milk',
    price: 55,
    badge: 'bestseller',
    recommended: true,
    rating: 4.9,
    reviews: 12500,
    palette: { base: '#f3e2b8', main: '#f1d36b', accent: '#fff6df', garnish: '#c98b3a' },
  },
  {
    code: 'NUTELLA',
    categoryId: 1,
    name: 'โรตีนูเทลล่า',
    nameEn: 'Nutella Roti',
    description: 'นูเทลล่าเต็มแผ่น โรยอัลมอนด์',
    descriptionEn: 'Loaded with Nutella and almond flakes',
    price: 45,
    originalPrice: 55,
    rating: 4.8,
    reviews: 8700,
    palette: { base: '#ecd3a8', main: '#6b3a1f', accent: '#a4683c', garnish: '#e9c89a' },
  },
  {
    code: 'CONDENSED',
    categoryId: 1,
    name: 'โรตีนมข้น',
    nameEn: 'Condensed Milk Roti',
    description: 'สูตรดั้งเดิม กรอบ หวานมัน',
    descriptionEn: 'The classic: crispy, sweet and creamy',
    price: 30,
    rating: 4.7,
    reviews: 6300,
    palette: { base: '#f0dcae', main: '#f7efd9', accent: '#e5b865', garnish: '#fffaf0' },
  },
  {
    code: 'THAI-TEA-ROTI',
    categoryId: 1,
    name: 'โรตีชาไทยไข่มุก',
    nameEn: 'Thai Tea Pearl Roti',
    description: 'ซอสชาไทยเข้มข้น ท็อปไข่มุกหนึบ',
    descriptionEn: 'Rich Thai tea sauce topped with chewy pearls',
    price: 59,
    badge: 'new',
    rating: 4.8,
    reviews: 2100,
    palette: { base: '#f0d6b0', main: '#e3843a', accent: '#f6d7b0', garnish: '#4b2c1c' },
  },
  {
    code: 'EGG-CHEESE',
    categoryId: 2,
    name: 'โรตีไข่ชีส',
    nameEn: 'Egg & Cheese Roti',
    description: 'ไข่ไก่สด ชีสยืด โรยพริกไทย',
    descriptionEn: 'Fresh egg, stretchy cheese and black pepper',
    price: 40,
    badge: 'recommended',
    recommended: true,
    rating: 4.7,
    reviews: 5400,
    palette: { base: '#f1dfb7', main: '#f6c945', accent: '#fff3c4', garnish: '#5c8a3a' },
  },
  {
    code: 'MASSAMAN',
    categoryId: 2,
    name: 'โรตีแกงมัสมั่นไก่',
    nameEn: 'Roti with Chicken Massaman',
    description: 'แกงมัสมั่นเข้มข้น เสิร์ฟคู่โรตีร้อน ๆ',
    descriptionEn: 'Rich massaman curry with hot roti',
    price: 79,
    originalPrice: 95,
    recommended: true,
    rating: 4.9,
    reviews: 3800,
    palette: { base: '#efdcbc', main: '#c96b2c', accent: '#f0b36a', garnish: '#4f7a34' },
  },
  {
    code: 'MURTABAK',
    categoryId: 2,
    name: 'มะตะบะไก่',
    nameEn: 'Chicken Murtabak',
    description: 'ไส้ไก่ผัดเครื่องเทศ เสิร์ฟอาจาด',
    descriptionEn: 'Spiced chicken filling with cucumber relish',
    price: 69,
    rating: 4.6,
    reviews: 2900,
    palette: { base: '#eed9b2', main: '#d9a054', accent: '#b6512e', garnish: '#6c9a3f' },
  },
  {
    code: 'TUNA-MAYO',
    categoryId: 2,
    name: 'โรตีทูน่ามายอ',
    nameEn: 'Tuna Mayo Roti',
    description: 'ทูน่าคลุกมายองเนส หอมหัวหอม',
    descriptionEn: 'Tuna mayo with sweet onion',
    price: 55,
    soldOut: true,
    rating: 4.5,
    reviews: 1200,
    palette: { base: '#efd9c9', main: '#e9b7a3', accent: '#f4e4c8', garnish: '#c98a7a' },
  },
  {
    code: 'THAI-TEA',
    categoryId: 3,
    name: 'ชาไทยเย็น',
    nameEn: 'Iced Thai Tea',
    description: 'หวานน้อยได้ เลือกความหวานได้',
    descriptionEn: 'Choose your sweetness',
    price: 25,
    badge: 'bestseller',
    recommended: true,
    rating: 4.8,
    reviews: 9800,
    palette: { base: '#f3dcc0', main: '#e39343', accent: '#f6dfc0', garnish: '#b85f2a' },
  },
  {
    code: 'TEH-TARIK',
    categoryId: 3,
    name: 'ชาชักร้อน',
    nameEn: 'Hot Teh Tarik',
    description: 'ชานมชักฟองนุ่ม หอมกรุ่น',
    descriptionEn: 'Frothy pulled milk tea, served hot',
    price: 20,
    rating: 4.6,
    reviews: 3100,
    palette: { base: '#efdcc4', main: '#c99467', accent: '#f4e6d2', garnish: '#8e5a36' },
  },
  {
    code: 'COCOA',
    categoryId: 3,
    name: 'โกโก้เย็น',
    nameEn: 'Iced Cocoa',
    description: 'โกโก้เข้มข้น นมสดแท้',
    descriptionEn: 'Rich cocoa with real fresh milk',
    price: 35,
    originalPrice: 40,
    rating: 4.7,
    reviews: 2600,
    palette: { base: '#ead6c2', main: '#6e3f25', accent: '#b98460', garnish: '#f2e2cf' },
  },
  {
    code: 'MILK-FRAPPE',
    categoryId: 3,
    name: 'นมสดปั่นนมข้น',
    nameEn: 'Condensed Milk Frappe',
    description: 'นมสดปั่นละเอียด หวานมันกำลังดี',
    descriptionEn: 'Smooth blended milk, just sweet enough',
    price: 35,
    rating: 4.5,
    reviews: 1700,
    palette: { base: '#eee4d4', main: '#fbf6ec', accent: '#e8d7b6', garnish: '#d8b983' },
  },
];

export const SEED_PRODUCTS = [...PRODUCTS, ...DEFAULT_ROTI_MENU].map((product, index) => ({
  id: index + 1,
  categoryId: product.categoryId,
  code: product.code,
  name: product.name,
  nameEn: product.nameEn,
  description: product.description,
  descriptionEn: product.descriptionEn,
  price: product.price,
  originalPrice: product.originalPrice ?? null,
  imageUrl: null,
  available: !product.soldOut,
  recommended: product.recommended ?? false,
  active: true,
  sortOrder: index + 1,
  badge: product.badge ?? null,
  rating: product.rating,
  reviews: product.reviews,
  palette: product.palette,
  optionGroupIds: optionGroupsFor(product.categoryId),
}));
