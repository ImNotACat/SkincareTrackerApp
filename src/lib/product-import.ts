import type { ImportedProductData, StepCategory } from '../types';
import { supabase } from './supabase';

// ─── URL Product Import ─────────────────────────────────────────────────────
// Extracts product data from a URL using:
//   1. Supabase Edge Function (gemini-proxy) — fetches page + Gemini AI parsing
//   2. Client-side regex fallback — for when edge function is unavailable

const VALID_CATEGORIES: StepCategory[] = [
  'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen',
  'exfoliant', 'mask', 'eye_cream', 'lip_care', 'treatment', 'other',
];

/**
 * Attempts to extract product data from any URL.
 * Uses the edge function (Gemini) first, falls back to client-side regex.
 */
export async function importProductFromUrl(url: string): Promise<ImportedProductData> {
  // Try edge function first (server-side fetch + Gemini parsing)
  try {
    const result = await importViaEdgeFunction(url);
    if (result && result.name) {
      return result;
    }
  } catch (error) {
    console.error('Edge function import failed, falling back to regex:', error);
  }

  // Fallback: client-side fetch + regex parsing
  try {
    return await importViaRegex(url);
  } catch (error) {
    console.error('Regex import also failed:', error);
    return { source_url: url };
  }
}

// ─── Edge Function Import ────────────────────────────────────────────────────

async function importViaEdgeFunction(url: string): Promise<ImportedProductData | null> {
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: { url },
  });

  if (error) {
    // Try to get details from the response
    let details = error.message;
    try {
      if (error.context && typeof error.context.json === 'function') {
        const errorBody = await error.context.json();
        details = errorBody?.error || details;
      }
    } catch {}
    throw new Error(details);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  const product = data?.product;
  if (!product) return null;

  const result: ImportedProductData = {
    source_url: product.source_url || url,
  };

  if (product.name) result.name = product.name;
  if (product.brand) result.brand = product.brand;
  if (product.size) result.size = product.size;
  if (product.image_url) result.image_url = product.image_url;
  if (product.ingredients) result.ingredients = product.ingredients;
  if (Array.isArray(product.active_ingredients) && product.active_ingredients.length > 0) {
    result.active_ingredients = product.active_ingredients;
  }
  if (product.category && VALID_CATEGORIES.includes(product.category)) {
    result.step_category = product.category as StepCategory;
  }

  return result;
}

// ─── Client-side Regex Fallback ──────────────────────────────────────────────

async function importViaRegex(url: string): Promise<ImportedProductData> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      Accept: 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status})`);
  }

  const html = await response.text();
  return parseProductHtml(html, url);
}

function parseProductHtml(html: string, url: string): ImportedProductData {
  const result: ImportedProductData = { source_url: url };

  const metas = extractMetaTags(html);

  // Name: og:title → twitter:title → <title>
  result.name = cleanText(
    metas['og:title'] || metas['twitter:title'] || extractTagContent(html, 'title'),
  );

  // Brand: og:site_name → product:brand → site_name
  result.brand = cleanText(
    metas['og:site_name'] || metas['product:brand'] || metas['brand'],
  );

  // Clean name: strip brand from title if present
  if (result.name && result.brand) {
    const separators = [' | ', ' - ', ' – ', ' — ', ' · '];
    for (const sep of separators) {
      if (result.name.includes(sep + result.brand)) {
        result.name = result.name.split(sep)[0].trim();
        break;
      }
      if (result.name.includes(result.brand + sep)) {
        result.name = result.name.split(sep).slice(1).join(sep).trim();
        break;
      }
    }
  }

  // Image
  result.image_url =
    metas['og:image'] || metas['twitter:image'] || metas['twitter:image:src'];

  if (result.image_url && result.image_url.startsWith('/')) {
    try {
      const base = new URL(url);
      result.image_url = `${base.protocol}//${base.host}${result.image_url}`;
    } catch {}
  }

  // Description
  result.description = cleanText(
    metas['og:description'] || metas['description'] || metas['twitter:description'],
  );

  // Ingredients
  result.ingredients = extractIngredients(html);

  // Try to guess category from name/description
  result.step_category = guessCategory(result.name, result.description);

  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractMetaTags(html: string): Record<string, string> {
  const metas: Record<string, string> = {};

  const metaRegex = /<meta\s+(?:[^>]*?\s)?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?\scontent\s*=\s*["']([^"']*)["'][^>]*?\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(html)) !== null) {
    metas[match[1].toLowerCase()] = match[2];
  }

  const metaRegex2 = /<meta\s+(?:[^>]*?\s)?content\s*=\s*["']([^"']*)["'][^>]*?\s(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?\/?>/gi;
  while ((match = metaRegex2.exec(html)) !== null) {
    const key = match[2].toLowerCase();
    if (!metas[key]) {
      metas[key] = match[1];
    }
  }

  return metas;
}

function extractTagContent(html: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
  const match = regex.exec(html);
  return match?.[1]?.trim();
}

function extractIngredients(html: string): string | undefined {
  const patterns = [
    /"ingredients"\s*:\s*"([^"]{20,})"/i,
    /(?:full\s+)?ingredients?\s*(?:list)?\s*[:]\s*([A-Za-z][A-Za-z\s,/().%-]{30,})/i,
    /(?:ingredients|inci)\s*<\/(?:h[1-6]|strong|b|span|p|div)>\s*(?:<[^>]+>)*\s*([A-Za-z][A-Za-z\s,/().%-]{30,})/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      let text = match[1]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const cutoffs = ['. ', '.\n', '*', 'May contain', 'Please note'];
      for (const cutoff of cutoffs) {
        const idx = text.indexOf(cutoff);
        if (idx > 30) {
          text = text.substring(0, idx).trim();
          break;
        }
      }

      if (text.length > 20) {
        return text;
      }
    }
  }

  return undefined;
}

function cleanText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim() || undefined;
}

export function guessCategory(name?: string, description?: string): StepCategory | undefined {
  const text = `${name || ''} ${description || ''}`.toLowerCase();

  if (/\bcleans(er|ing)\b|\bface\s*wash\b|\bmicellar\b/.test(text)) return 'cleanser';
  if (/\btoner\b|\bessence\b|\bfirst\s*treatment\b/.test(text)) return 'toner';
  if (/\bserum\b|\bampoule\b|\boil\b|\bconcentrate\b/.test(text)) return 'serum';
  if (/\bspf\b|\bsunscreen\b|\bsun\s*protect\b|\buv\b/.test(text)) return 'sunscreen';
  if (/\bexfoli\b|\bpeel\b|\baha\b|\bbha\b|\bscrub\b/.test(text)) return 'exfoliant';
  if (/\bmask\b|\bmasque\b|\bsheet\b/.test(text)) return 'mask';
  if (/\beye\s*cream\b|\beye\s*gel\b|\beye\s*serum\b/.test(text)) return 'eye_cream';
  if (/\blip\b/.test(text)) return 'lip_care';
  if (/\bretinol\b|\btreatment\b|\bacne\b|\bspot\b/.test(text)) return 'treatment';
  if (/\bmoisturi[sz]\b|\bcream\b|\blotion\b|\bgel\b/.test(text)) return 'moisturizer';

  return undefined;
}
