import { AdminBannerResponse, BannerResponse } from '../../core/api/models/banner.model';
import { PromotionState } from './promotion';
import { safeInternalPath } from './sanitize';

export interface BannerLink {
  path: string;
  fragment?: string;
  external: boolean;
}

export const DEFAULT_BANNER_IMAGE = 'brand/banner-default.svg';
export const DEFAULT_BANNER_IMAGE_MOBILE = 'brand/banner-default-mobile.svg';

export const BANNER_LINK_PATTERN = /^(\/(?![/\\])|https:\/\/)[^\s]*$/;
const EXTERNAL_LINK = /^https:\/\/[^\s]+$/;

export function bannerLink(banner: BannerResponse): BannerLink | null {
  if (banner.promotionId) {
    return { path: `/promotions/${banner.promotionId}`, external: false };
  }
  const target = banner.linkUrl?.trim();
  if (!target) {
    return null;
  }
  if (EXTERNAL_LINK.test(target)) {
    return { path: target, external: true };
  }
  const [path = '', fragment] = target.split('#');
  const safePath = safeInternalPath(path || '/', '');
  if (!safePath) {
    return null;
  }
  return fragment
    ? { path: safePath, fragment, external: false }
    : { path: safePath, external: false };
}

export function bannerState(banner: AdminBannerResponse, now = new Date()): PromotionState {
  if (!banner.active) {
    return 'INACTIVE';
  }
  if (banner.endAt && new Date(banner.endAt).getTime() < now.getTime()) {
    return 'EXPIRED';
  }
  if (banner.startAt && new Date(banner.startAt).getTime() > now.getTime()) {
    return 'SCHEDULED';
  }
  return 'RUNNING';
}
