import type { Product, TimeOfDayUsage } from '../types';

// ─── Conflict Rule Definitions ──────────────────────────────────────────────
// Each rule defines two ingredient groups that should not be used together,
// a severity level, and user-friendly explanation + suggestion.

export type ConflictSeverity = 'high' | 'medium' | 'low';

export interface ConflictRule {
  id: string;
  /** First ingredient group — any match triggers the check */
  groupA: string[];
  /** Second ingredient group — any match + groupA match = conflict */
  groupB: string[];
  severity: ConflictSeverity;
  /** Short summary shown in the warning banner */
  title: string;
  /** Explanation of why these conflict */
  explanation: string;
  /** Actionable suggestion for the user */
  suggestion: string;
}

/**
 * Curated list of well-known skincare ingredient conflicts.
 * Keywords are lowercased and matched as substrings within ingredient lists.
 */
export const CONFLICT_RULES: ConflictRule[] = [
  {
    id: 'retinol-aha-bha',
    groupA: ['retinol', 'retinal', 'retinoid', 'retinoic acid', 'tretinoin', 'adapalene', 'tazarotene'],
    groupB: ['glycolic acid', 'lactic acid', 'mandelic acid', 'salicylic acid', 'aha', 'bha', 'alpha hydroxy', 'beta hydroxy'],
    severity: 'high',
    title: 'Retinoid + Exfoliating Acid',
    explanation: 'Using retinoids together with AHAs or BHAs can cause excessive irritation, peeling, and compromise your skin barrier.',
    suggestion: 'Use them on alternate nights, or apply acids in the morning and retinoid in the evening.',
  },
  {
    id: 'retinol-benzoyl-peroxide',
    groupA: ['retinol', 'retinal', 'retinoid', 'retinoic acid', 'tretinoin', 'adapalene', 'tazarotene'],
    groupB: ['benzoyl peroxide'],
    severity: 'high',
    title: 'Retinoid + Benzoyl Peroxide',
    explanation: 'Benzoyl peroxide can oxidise and deactivate retinol, making both products less effective. It can also increase irritation.',
    suggestion: 'Apply benzoyl peroxide in the morning and retinoid in the evening.',
  },
  {
    id: 'retinol-vitamin-c',
    groupA: ['retinol', 'retinal', 'retinoid', 'retinoic acid', 'tretinoin'],
    groupB: ['ascorbic acid', 'vitamin c', 'l-ascorbic', 'ascorbyl'],
    severity: 'medium',
    title: 'Retinoid + Vitamin C',
    explanation: 'Both are potent actives that can cause irritation when layered. They also work best at different pH levels.',
    suggestion: 'Use vitamin C in the morning and retinoid in the evening for best results.',
  },
  {
    id: 'vitamin-c-niacinamide',
    groupA: ['ascorbic acid', 'l-ascorbic acid'],
    groupB: ['niacinamide', 'nicotinamide'],
    severity: 'low',
    title: 'Vitamin C (L-Ascorbic) + Niacinamide',
    explanation: 'Older research suggested these cancel each other out, though modern formulations are generally fine together. Some people may experience flushing.',
    suggestion: 'If you notice redness, apply them at different times of day. Most people can use both without issues.',
  },
  {
    id: 'aha-bha-vitamin-c',
    groupA: ['glycolic acid', 'lactic acid', 'mandelic acid', 'salicylic acid', 'aha', 'bha', 'alpha hydroxy', 'beta hydroxy'],
    groupB: ['ascorbic acid', 'vitamin c', 'l-ascorbic', 'ascorbyl'],
    severity: 'medium',
    title: 'Exfoliating Acid + Vitamin C',
    explanation: 'Both are active at low pH. Layering them can over-exfoliate and irritate skin, especially if your skin is sensitive.',
    suggestion: 'Use vitamin C in the morning and acids in the evening, or on alternate days.',
  },
  {
    id: 'aha-bha-benzoyl-peroxide',
    groupA: ['glycolic acid', 'lactic acid', 'mandelic acid', 'salicylic acid', 'aha', 'bha'],
    groupB: ['benzoyl peroxide'],
    severity: 'medium',
    title: 'Exfoliating Acid + Benzoyl Peroxide',
    explanation: 'Combining exfoliating acids with benzoyl peroxide can cause excessive dryness, peeling, and irritation.',
    suggestion: 'Use on alternate days or at different times of day.',
  },
  {
    id: 'retinol-vitamin-c-acid',
    groupA: ['retinol', 'retinal', 'tretinoin'],
    groupB: ['azelaic acid'],
    severity: 'low',
    title: 'Retinoid + Azelaic Acid',
    explanation: 'Both can cause irritation on their own. Together they may be too much for sensitive skin, though many people tolerate the combination.',
    suggestion: 'Introduce the combination gradually, or use them at different times of day.',
  },
  {
    id: 'multiple-retinoids',
    groupA: ['retinol'],
    groupB: ['tretinoin', 'adapalene', 'tazarotene', 'retinal'],
    severity: 'high',
    title: 'Multiple Retinoids',
    explanation: 'Using more than one retinoid at the same time will almost certainly cause irritation, peeling, and barrier damage.',
    suggestion: 'Pick one retinoid and stick with it. Stronger prescription retinoids replace OTC retinol.',
  },
  {
    id: 'aha-aha-stacking',
    groupA: ['glycolic acid'],
    groupB: ['lactic acid', 'mandelic acid'],
    severity: 'medium',
    title: 'Multiple AHAs',
    explanation: 'Stacking multiple alpha-hydroxy acids increases the risk of over-exfoliation and irritation.',
    suggestion: 'Choose one AHA product per routine. Alternate between them on different days if you want variety.',
  },
  {
    id: 'copper-peptides-acids',
    groupA: ['copper peptide', 'ghk-cu', 'copper tripeptide'],
    groupB: ['ascorbic acid', 'vitamin c', 'glycolic acid', 'salicylic acid', 'aha', 'bha'],
    severity: 'medium',
    title: 'Copper Peptides + Acids / Vitamin C',
    explanation: 'Copper peptides can be deactivated by low-pH environments (acids, vitamin C), reducing their effectiveness.',
    suggestion: 'Use copper peptides and acids/vitamin C at different times of day.',
  },
  {
    id: 'benzoyl-peroxide-hydroquinone',
    groupA: ['benzoyl peroxide'],
    groupB: ['hydroquinone'],
    severity: 'high',
    title: 'Benzoyl Peroxide + Hydroquinone',
    explanation: 'Together these can cause temporary dark staining of the skin.',
    suggestion: 'Do not use these at the same time. Use at different times of day.',
  },
];

// ─── Conflict Detection ─────────────────────────────────────────────────────

export interface DetectedConflict {
  rule: ConflictRule;
  productA: Product;
  productB: Product;
  /** The specific matched keywords from each group */
  matchedA: string;
  matchedB: string;
}

/**
 * Combine all ingredient text for a product into a single searchable string.
 */
function getIngredientText(product: Product): string {
  const parts: string[] = [];
  if (product.active_ingredients) parts.push(product.active_ingredients);
  if (product.full_ingredients) parts.push(product.full_ingredients);
  if (product.name) parts.push(product.name);
  return parts.join(' ').toLowerCase();
}

/**
 * Check if an ingredient text contains any keyword from a group.
 * Returns the first matched keyword, or null.
 */
function matchGroup(ingredientText: string, group: string[]): string | null {
  for (const keyword of group) {
    if (ingredientText.includes(keyword)) {
      return keyword;
    }
  }
  return null;
}

/**
 * Check whether two products' time-of-day usage overlaps.
 * Products used at the same time (or 'both') are in the same routine window.
 */
function timeOverlaps(a: TimeOfDayUsage, b: TimeOfDayUsage): boolean {
  if (a === 'both' || b === 'both') return true;
  return a === b;
}

/**
 * Detect all ingredient conflicts among a list of active products.
 * Only considers products whose time_of_day overlaps (same routine window).
 */
export function detectConflicts(products: Product[]): DetectedConflict[] {
  const active = products.filter((p) => !p.stopped_at);
  const conflicts: DetectedConflict[] = [];
  const seen = new Set<string>(); // deduplicate

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const pA = active[i];
      const pB = active[j];

      // Skip if they're never used at the same time
      if (!timeOverlaps(pA.time_of_day, pB.time_of_day)) continue;

      const textA = getIngredientText(pA);
      const textB = getIngredientText(pB);

      for (const rule of CONFLICT_RULES) {
        // Check A↔B in both directions
        const matchA1 = matchGroup(textA, rule.groupA);
        const matchB1 = matchGroup(textB, rule.groupB);

        const matchA2 = matchGroup(textA, rule.groupB);
        const matchB2 = matchGroup(textB, rule.groupA);

        const found1 = matchA1 && matchB1;
        const found2 = matchA2 && matchB2;

        if (found1 || found2) {
          const key = [rule.id, pA.id, pB.id].sort().join(':');
          if (seen.has(key)) continue;
          seen.add(key);

          conflicts.push({
            rule,
            productA: pA,
            productB: pB,
            matchedA: found1 ? matchA1! : matchB2!,
            matchedB: found1 ? matchB1! : matchA2!,
          });
        }
      }
    }
  }

  // Sort by severity: high first
  const order: Record<ConflictSeverity, number> = { high: 0, medium: 1, low: 2 };
  conflicts.sort((a, b) => order[a.rule.severity] - order[b.rule.severity]);

  return conflicts;
}

/**
 * Detect conflicts for a single product against all other active products.
 * Useful for the product detail page.
 */
export function detectConflictsForProduct(
  product: Product,
  allProducts: Product[],
): DetectedConflict[] {
  const others = allProducts.filter((p) => p.id !== product.id && !p.stopped_at);
  // Temporarily include the target even if stopped (to show what would conflict)
  return detectConflicts([product, ...others]).filter(
    (c) => c.productA.id === product.id || c.productB.id === product.id,
  );
}
