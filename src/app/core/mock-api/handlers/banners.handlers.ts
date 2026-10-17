import {
  AdminBannerResponse,
  BannerOrderRequest,
  BannerPlacement,
  BannerResponse,
  BannerUpsertRequest,
} from '../../api/models/banner.model';
import { FieldError } from '../../api/models/common.model';
import type { MockState } from '../mock-db';
import { MockRouter, bodyOf, numberParam, queryString, requireAdmin } from '../mock-router';
import { badRequest, nextId, notFound, required } from '../mock-utils';
import { BANNER_IMAGE_MAX_BYTES } from '../../../shared/utils/image';
import { readUploadedImage } from './auth.handlers';

const PLACEMENTS: BannerPlacement[] = ['HOME_HERO', 'HOME_OFFER'];
const LINK_PATTERN = /^(\/(?![/\\])|https:\/\/)[^\s]*$/;

function isBannerLive(banner: AdminBannerResponse, now: Date): boolean {
  const time = now.toISOString();
  return (
    banner.active &&
    (!banner.startAt || banner.startAt <= time) &&
    (!banner.endAt || banner.endAt >= time)
  );
}

function byOrder(a: AdminBannerResponse, b: AdminBannerResponse): number {
  return a.sortOrder - b.sortOrder || a.id - b.id;
}

function placementFilter(value: string): BannerPlacement | null {
  return PLACEMENTS.find((placement) => placement === value) ?? null;
}

function toPublic(banner: AdminBannerResponse): BannerResponse {
  return {
    id: banner.id,
    placement: banner.placement,
    imageUrl: banner.imageUrl,
    imageUrlMobile: banner.imageUrlMobile,
    title: banner.title,
    titleEn: banner.titleEn,
    subtitle: banner.subtitle,
    subtitleEn: banner.subtitleEn,
    ctaLabel: banner.ctaLabel,
    ctaLabelEn: banner.ctaLabelEn,
    linkUrl: banner.linkUrl,
    promotionId: banner.promotionId,
  };
}

function validateBanner(request: BannerUpsertRequest): BannerUpsertRequest {
  const fields: FieldError[] = [];
  required(request.imageUrl, 'imageUrl', fields);
  if (!placementFilter(request.placement)) {
    fields.push({ field: 'placement', message: 'invalid placement' });
  }
  if (request.linkUrl && !LINK_PATTERN.test(request.linkUrl)) {
    fields.push({ field: 'linkUrl', message: 'linkUrl must start with / or https://' });
  }
  if (request.startAt && request.endAt && request.startAt > request.endAt) {
    fields.push({ field: 'endAt', message: 'endAt must be after startAt' });
  }
  if (fields.length) {
    throw badRequest('Validation failed', fields);
  }
  return request;
}

function findBanner(state: MockState, id: number): AdminBannerResponse {
  const banner = state.banners.find((candidate) => candidate.id === id);
  if (!banner) {
    throw notFound();
  }
  return banner;
}

function listOf(state: MockState, placement: BannerPlacement | null): AdminBannerResponse[] {
  return state.banners
    .filter((banner) => !placement || banner.placement === placement)
    .sort(byOrder);
}

export function registerBannerHandlers(router: MockRouter): void {
  router
    .get('/public/banners', (context) => {
      const placement = placementFilter(queryString(context, 'placement'));
      return listOf(context.state, placement)
        .filter((banner) => isBannerLive(banner, context.now))
        .map(toPublic);
    })
    .get('/admin/banners', (context) => {
      requireAdmin(context);
      return listOf(context.state, placementFilter(queryString(context, 'placement')));
    })
    .post('/admin/banners/images', async (context) => {
      requireAdmin(context);
      return { url: await readUploadedImage(context.body, 'file', BANNER_IMAGE_MAX_BYTES) };
    })
    .put('/admin/banners/order', (context) => {
      requireAdmin(context);
      const request = bodyOf<BannerOrderRequest>(context);
      request.ids.forEach((id, index) => {
        const banner = findBanner(context.state, id);
        if (banner.placement === request.placement) {
          banner.sortOrder = index;
        }
      });
      return listOf(context.state, request.placement);
    })
    .get('/admin/banners/:id', (context) => {
      requireAdmin(context);
      return findBanner(context.state, numberParam(context, 'id'));
    })
    .post('/admin/banners', (context) => {
      requireAdmin(context);
      const request = validateBanner(bodyOf<BannerUpsertRequest>(context));
      const siblings = listOf(context.state, request.placement);
      const time = context.now.toISOString();
      const banner: AdminBannerResponse = {
        ...request,
        id: nextId(context.state, 'banner'),
        sortOrder:
          request.sortOrder ?? Math.max(-1, ...siblings.map((sibling) => sibling.sortOrder)) + 1,
        createdAt: time,
        updatedAt: time,
      };
      context.state.banners.push(banner);
      return banner;
    })
    .put('/admin/banners/:id', (context) => {
      requireAdmin(context);
      const banner = findBanner(context.state, numberParam(context, 'id'));
      const request = validateBanner(bodyOf<BannerUpsertRequest>(context));
      Object.assign(banner, request, {
        sortOrder: request.sortOrder ?? banner.sortOrder,
        updatedAt: context.now.toISOString(),
      });
      return banner;
    })
    .delete('/admin/banners/:id', (context) => {
      requireAdmin(context);
      const id = numberParam(context, 'id');
      findBanner(context.state, id);
      context.state.banners = context.state.banners.filter((banner) => banner.id !== id);
      return null;
    });
}
