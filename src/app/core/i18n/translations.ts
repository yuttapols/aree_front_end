import { Lang } from '../models/menu.model';
import { backofficeEn, backofficeTh } from './dictionaries/backoffice';
import { commonEn, commonTh } from './dictionaries/common';
import { errorsEn, errorsTh } from './dictionaries/errors';
import { loyaltyEn, loyaltyTh } from './dictionaries/loyalty';
import { orderingEn, orderingTh } from './dictionaries/ordering';
import { storefrontEn, storefrontTh } from './dictionaries/storefront';

const th = {
  ...storefrontTh,
  ...commonTh,
  ...errorsTh,
  ...orderingTh,
  ...loyaltyTh,
  ...backofficeTh,
};

export type TranslationKey = keyof typeof th;

const en: Record<TranslationKey, string> = {
  ...storefrontEn,
  ...commonEn,
  ...errorsEn,
  ...orderingEn,
  ...loyaltyEn,
  ...backofficeEn,
};

export const TRANSLATIONS: Record<Lang, Record<TranslationKey, string>> = { th, en };
