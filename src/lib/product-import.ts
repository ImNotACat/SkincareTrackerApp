import type { ImportedProductData } from '../types';

// ─── URL Product Import ─────────────────────────────────────────────────────
// Fetches a product page and extracts data from Open Graph / meta tags.
// Works with most skincare brand sites (The Ordinary, CeraVe, Paula's Choice,
// Sephora, Ulta, etc.) because they include OG tags for social sharing.
//
// Extracted:
//   - og:title / <title>           → product name
//   - og:image                     → product photo
//   - og:site_name / og:brand      → brand
//   - og:description / description → description (may contain ingredients)
//   - Attempts to find INCI ingredients list in page text

/**
 * Attempts to extract product data from any URL by scraping OG/meta tags.
 * Returns partial data — the user fills in anything missing.
 */
export async function importProductFromUrl(url: string): Promise<ImportedProductData> {
  try {
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
  } catch (error) {
    console.error('Product import error:', error);
    // Return minimal data so the user can still fill in manually
    return { source_url: url };
  }
}

// ─── HTML Parser ────────────────────────────────────────────────────────────

function parseProductHtml(html: string, url: string): ImportedProductData {
  const result: ImportedProductData = { source_url: url };

  // Extract all meta tags content
  const metas = extractMetaTags(html);

  // Name: og:title → twitter:title → <title>
  result.name = cleanText(
    metas['og:title'] || metas['twitter:title'] || extractTagContent(html, 'title'),
  );

  // Brand: og:site_name → product:brand → site_name
  result.brand = cleanText(
    metas['og:site_name'] || metas['product:brand'] || metas['brand'],
  );

  // Clean name: strip brand from title if present (e.g., "Niacinamide 10% | The Ordinary" → "Niacinamide 10%")
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

  // Make relative image URLs absolute
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

  // Ingredients: look for common patterns in the HTML
  result.ingredients = extractIngredients(html);

  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractMetaTags(html: string): Record<string, string> {
  const metas: Record<string, string> = {};

  // Match <meta property="..." content="..."> and <meta name="..." content="...">
  const metaRegex = /<meta\s+(?:[^>]*?\s)?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?\scontent\s*=\s*["']([^"']*)["'][^>]*?\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(html)) !== null) {
    metas[match[1].toLowerCase()] = match[2];
  }

  // Also match reversed order: content before property
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
  // Common patterns for ingredients sections on skincare sites
  // Look for "Ingredients:" or "INCI:" followed by a list
  const patterns = [
    // JSON-LD ingredient data
    /"ingredients"\s*:\s*"([^"]{20,})"/i,
    // "Ingredients: aqua, ..." pattern
    /(?:full\s+)?ingredients?\s*(?:list)?\s*[:]\s*([A-Za-z][A-Za-z\s,/().%-]{30,})/i,
    // After an ingredients heading in HTML
    /(?:ingredients|inci)\s*<\/(?:h[1-6]|strong|b|span|p|div)>\s*(?:<[^>]+>)*\s*([A-Za-z][A-Za-z\s,/().%-]{30,})/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      let text = match[1]
        .replace(/<[^>]+>/g, '') // strip any HTML tags
        .replace(/\s+/g, ' ')
        .trim();

      // Truncate at likely end-of-ingredients markers
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
