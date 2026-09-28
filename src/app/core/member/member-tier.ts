import { TranslationKey } from '../i18n/translations';
import { MemberTier } from '../models/member.model';

export const TIER_LABEL_KEY: Record<MemberTier, TranslationKey> = {
  bronze: 'tier.bronze',
  silver: 'tier.silver',
  gold: 'tier.gold',
};

const TIER_THRESHOLDS: readonly { tier: MemberTier; minPoints: number }[] = [
  { tier: 'gold', minPoints: 1500 },
  { tier: 'silver', minPoints: 500 },
  { tier: 'bronze', minPoints: 0 },
];

export interface TierProgress {
  tier: MemberTier;
  nextTier: MemberTier | null;
  pointsToNext: number;
  percent: number;
}

export function tierProgress(points: number): TierProgress {
  const currentIndex = TIER_THRESHOLDS.findIndex((level) => points >= level.minPoints);
  const current = TIER_THRESHOLDS[currentIndex];
  const next = TIER_THRESHOLDS[currentIndex - 1];
  if (!next) {
    return { tier: current.tier, nextTier: null, pointsToNext: 0, percent: 100 };
  }
  const span = next.minPoints - current.minPoints;
  return {
    tier: current.tier,
    nextTier: next.tier,
    pointsToNext: next.minPoints - points,
    percent: Math.round(((points - current.minPoints) / span) * 100),
  };
}
