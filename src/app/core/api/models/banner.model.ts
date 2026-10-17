export type BannerPlacement = 'HOME_HERO' | 'HOME_OFFER';

export interface BannerResponse {
  id: number;
  placement: BannerPlacement;
  imageUrl: string;
  imageUrlMobile: string | null;
  title: string | null;
  titleEn: string | null;
  subtitle: string | null;
  subtitleEn: string | null;
  ctaLabel: string | null;
  ctaLabelEn: string | null;
  linkUrl: string | null;
  promotionId: number | null;
}

export interface AdminBannerResponse extends BannerResponse {
  sortOrder: number;
  active: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BannerUpsertRequest {
  placement: BannerPlacement;
  imageUrl: string;
  imageUrlMobile: string | null;
  title: string | null;
  titleEn: string | null;
  subtitle: string | null;
  subtitleEn: string | null;
  ctaLabel: string | null;
  ctaLabelEn: string | null;
  linkUrl: string | null;
  promotionId: number | null;
  sortOrder?: number;
  active: boolean;
  startAt: string | null;
  endAt: string | null;
}

export interface BannerOrderRequest {
  placement: BannerPlacement;
  ids: number[];
}
