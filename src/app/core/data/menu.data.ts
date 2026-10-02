import { HeroSlide, PlatePalette } from '../models/menu.model';

export const FALLBACK_PALETTES: PlatePalette[] = [
  { base: '#f3e2b8', main: '#f1d36b', accent: '#fff6df', garnish: '#c98b3a' },
  { base: '#efdcbc', main: '#c96b2c', accent: '#f0b36a', garnish: '#4f7a34' },
  { base: '#f3dcc0', main: '#e39343', accent: '#f6dfc0', garnish: '#b85f2a' },
  { base: '#ecd3a8', main: '#6b3a1f', accent: '#a4683c', garnish: '#e9c89a' },
];

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'crispy',
    lineOne: { th: 'กรอบนอก นุ่มใน', en: 'Bold flavors.' },
    lineTwo: { th: 'หอมเนยทุกคำ', en: 'Epic cravings.' },
    highlight: { th: 'อร่อยระดับ 5 ดาว', en: 'Five-star good' },
    subtitle: {
      th: 'เมนูโปรดของคุณ ทำใหม่ทุกออเดอร์',
      en: 'Your favorites, made fresh every order',
    },
  },
  {
    id: 'savory',
    lineOne: { th: 'มะตะบะ & มัสมั่น', en: 'Murtabak & curry.' },
    lineTwo: { th: 'อิ่มจุใจ', en: 'Seriously filling.' },
    highlight: { th: 'เข้มข้นถึงเครื่อง', en: 'Rich and hearty' },
    subtitle: {
      th: 'สายคาวห้ามพลาด เสิร์ฟร้อน ๆ จากกระทะ',
      en: 'Savory lovers, served hot off the pan',
    },
  },
  {
    id: 'drinks',
    lineOne: { th: 'ชาไทยเย็น ๆ', en: 'Iced Thai tea.' },
    lineTwo: { th: 'คู่หูโรตี', en: 'The perfect pair.' },
    highlight: { th: 'สดชื่นทุกแก้ว', en: 'Refreshing every sip' },
    subtitle: {
      th: 'สั่งคู่โรตีสุดคุ้ม เลือกความหวานได้',
      en: 'Pair it with any roti, sweetness your way',
    },
  },
];
