/**
 * Gift discovery taxonomy — mirrors backend/config/giftTaxonomy.js.
 * Used by the homepage sections, the gift finder, the Shop filters and the
 * admin product form, so a slug is defined in exactly one place per side.
 */
export type RecipientSlug = 'men' | 'girls' | 'kids';

export type OccasionSlug =
  | 'birthday'
  | 'wedding'
  | 'graduation'
  | 'new-baby'
  | 'mothers-day'
  | 'valentines'
  | 'anniversary'
  | 'engagement'
  | 'ramadan'
  | 'eid'
  | 'seasonal';

export interface TaxonomyItem<T extends string = string> {
  slug: T;
  emoji: string;
  /** ngx-translate key */
  labelKey: string;
}

export const RECIPIENTS: readonly TaxonomyItem<RecipientSlug>[] = [
  { slug: 'men', emoji: '👔', labelKey: 'taxonomy.recipients.men' },
  { slug: 'girls', emoji: '👧', labelKey: 'taxonomy.recipients.girls' },
  { slug: 'kids', emoji: '🧸', labelKey: 'taxonomy.recipients.kids' },
];

export const OCCASIONS: readonly TaxonomyItem<OccasionSlug>[] = [
  { slug: 'birthday', emoji: '🎂', labelKey: 'taxonomy.occasions.birthday' },
  { slug: 'wedding', emoji: '💍', labelKey: 'taxonomy.occasions.wedding' },
  { slug: 'graduation', emoji: '🎓', labelKey: 'taxonomy.occasions.graduation' },
  { slug: 'new-baby', emoji: '👶', labelKey: 'taxonomy.occasions.newBaby' },
  { slug: 'mothers-day', emoji: '💐', labelKey: 'taxonomy.occasions.mothersDay' },
  { slug: 'valentines', emoji: '💕', labelKey: 'taxonomy.occasions.valentines' },
  { slug: 'anniversary', emoji: '💫', labelKey: 'taxonomy.occasions.anniversary' },
  { slug: 'engagement', emoji: '🎉', labelKey: 'taxonomy.occasions.engagement' },
  { slug: 'ramadan', emoji: '🌙', labelKey: 'taxonomy.occasions.ramadan' },
  { slug: 'eid', emoji: '🎁', labelKey: 'taxonomy.occasions.eid' },
  { slug: 'seasonal', emoji: '🎄', labelKey: 'taxonomy.occasions.seasonal' },
];

export const RECIPIENT_SLUGS: readonly string[] = RECIPIENTS.map((r) => r.slug);
export const OCCASION_SLUGS: readonly string[] = OCCASIONS.map((o) => o.slug);

/** Budget buckets used by the gift finder (store currency: EGP). */
export interface BudgetRange {
  id: string;
  min?: number;
  max?: number;
  labelKey: string;
}

export const BUDGET_RANGES: readonly BudgetRange[] = [
  { id: 'low', max: 300, labelKey: 'taxonomy.budget.low' },
  { id: 'mid', min: 300, max: 700, labelKey: 'taxonomy.budget.mid' },
  { id: 'high', min: 700, labelKey: 'taxonomy.budget.high' },
];
