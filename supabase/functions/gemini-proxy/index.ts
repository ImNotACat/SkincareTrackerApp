// Supabase Edge Function: gemini-proxy
// Accepts a product URL, fetches the page, and uses Gemini to extract product data.
// Deploy: supabase functions deploy gemini-proxy --no-verify-jwt
// Set secret: supabase secrets set GEMINI_API_KEY=your-key

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_CATEGORIES = [
  "cleanser", "toner", "serum", "moisturizer", "sunscreen",
  "exfoliant", "mask", "eye_cream", "lip_care", "treatment", "other",
];

// Must match ACTIVE_INGREDIENTS from src/constants/skincare.ts
const KNOWN_ACTIVE_INGREDIENTS = [
  "Azelaic Acid", "Citric Acid", "Ferulic Acid", "Glycolic Acid (AHA)",
  "Hyaluronic Acid", "Kojic Acid", "Lactic Acid (AHA)", "Mandelic Acid (AHA)",
  "Phytic Acid", "Polyglutamic Acid", "Salicylic Acid (BHA)", "Tranexamic Acid",
  "Alpha Arbutin", "Arbutin", "Ascorbyl Glucoside", "Ethyl Ascorbic Acid",
  "Glutathione", "Licorice Root Extract",
  "Ceramide AP", "Ceramide NP", "Ceramides", "Cholesterol", "Fatty Acids",
  "Phytosphingosine", "Squalane", "Squalene",
  "Gluconolactone", "Lactobionic Acid", "PHA (Polyhydroxy Acids)",
  "Betaine", "Dimethicone", "Glycerin", "Jojoba Oil", "Shea Butter",
  "Sodium Hyaluronate", "Urea",
  "Acetyl Hexapeptide-8", "Argireline", "Copper Peptides", "Matrixyl",
  "Palmitoyl Tetrapeptide-7", "Palmitoyl Tripeptide-1", "Peptides",
  "Allantoin", "Aloe Vera", "Bisabolol", "Calendula", "Centella Asiatica",
  "Chamomile Extract", "Green Tea Extract", "Madecassoside", "Oat Extract",
  "Turmeric Extract", "Zinc PCA",
  "Avobenzone", "Octinoxate", "Octocrylene", "Titanium Dioxide", "Zinc Oxide",
  "L-Ascorbic Acid", "Niacin", "Niacinamide", "Panthenol (Vitamin B5)",
  "Retinaldehyde", "Retinyl Palmitate", "Vitamin A (Retinol)", "Vitamin C",
  "Vitamin E (Tocopherol)",
  "Adapalene", "Adenosine", "Bakuchiol", "Benzoyl Peroxide", "Coenzyme Q10",
  "Collagen", "Elastin", "Honey", "Propolis", "Resveratrol", "Snail Mucin",
  "Sulfur", "Tea Tree Oil", "Willow Bark Extract",
];

interface ExtractedProduct {
  name?: string;
  brand?: string;
  size?: string;
  image_url?: string;
  ingredients?: string;
  active_ingredients?: string[];
  category?: string;
  source_url: string;
}

function errorResponse(message: string, status = 500) {
  console.error("Error:", message);
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    const { url } = body;

    if (!url) {
      return errorResponse("URL is required", 400);
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return errorResponse("Invalid URL format", 400);
    }

    // ── Fetch the product page ─────────────────────────────────────────

    console.log(`Fetching URL: ${url}`);
    let pageResponse;
    try {
      pageResponse = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
    } catch (fetchError) {
      return errorResponse(`Failed to fetch URL: ${fetchError.message}`);
    }

    if (!pageResponse.ok) {
      return errorResponse(`Failed to fetch URL: HTTP ${pageResponse.status}`, 400);
    }

    const html = await pageResponse.text();
    console.log(`Fetched ${html.length} characters of HTML`);

    // ── Extract content for Gemini ─────────────────────────────────────

    const metaSection = extractMetaSection(html);
    const textContent = extractTextFromHtml(html);
    const productImages = extractProductImages(html);

    // Combine meta tags + page text, truncated for token limits
    const content = `${metaSection}\n\n---PAGE TEXT---\n${textContent}`.slice(0, 15000);

    // Images are extracted separately via JSON-LD/og:image, not sent to Gemini

    // ── Call Gemini API ────────────────────────────────────────────────

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return errorResponse("GEMINI_API_KEY not configured");
    }

    console.log("Calling Gemini API...");

    const prompt = `You are a skincare product data extractor. Analyze this HTML content from a product page and extract the following information.

Return ONLY a valid JSON object with this structure (no markdown formatting, no code blocks, just the raw JSON):
{
  "name": "The product name only (not the brand). Remove brand prefix/suffix if present.",
  "brand": "The brand/company name.",
  "size": "The product size/volume (e.g., '100ml', '30g', '1.7 oz'). null if not found.",
  "ingredients": "The full ingredients list as a single string. null if not found.",
  "active_ingredients": ["Array of active ingredients found in this product, matched EXACTLY from the allowed list below."],
  "category": "One of: cleanser, toner, serum, moisturizer, sunscreen, exfoliant, mask, eye_cream, lip_care, treatment, other"
}

DO NOT include image URLs in the JSON - images are handled separately.

Rules for category:
- cleansers/face washes = "cleanser"
- essences/toners = "toner"
- serums/ampoules/oils = "serum"
- creams/lotions/gels (not eye) = "moisturizer"
- SPF products = "sunscreen"
- AHA/BHA peels = "exfoliant"
- sheet masks/wash-off masks = "mask"
- eye creams/gels = "eye_cream"
- lip balms/treatments = "lip_care"
- spot treatments/acne/retinol = "treatment"
- anything else = "other"

Rules for active_ingredients:
- ONLY use values from this exact list (case-sensitive): ${KNOWN_ACTIVE_INGREDIENTS.join(", ")}
- Match ingredients from the product page to the closest entry in the list above.
- For example: if the page says "Niacinamide 10%", include "Niacinamide". If it says "Retinol", include "Vitamin A (Retinol)". If it says "Ascorbic Acid", include "L-Ascorbic Acid".
- Only include ingredients you are confident are present based on the ingredients list or product description.
- Return an empty array [] if no known active ingredients are found.

IMPORTANT: Return ONLY the JSON object, no other text.

URL: ${url}

HTML Content:
${content}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    let geminiResponse;
    try {
      geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      });
    } catch (fetchError) {
      return errorResponse(`Failed to call Gemini API: ${fetchError.message}`);
    }

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return errorResponse(`Gemini API error: ${geminiResponse.status} - ${errorText.slice(0, 200)}`);
    }

    let data;
    try {
      data = await geminiResponse.json();
    } catch {
      return errorResponse("Failed to parse Gemini API response");
    }

    // Check for blocked content
    if (data.promptFeedback?.blockReason) {
      return errorResponse(`Content blocked by Gemini: ${data.promptFeedback.blockReason}`);
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      console.error("Unexpected Gemini response:", JSON.stringify(data).slice(0, 500));
      return errorResponse("No text content in Gemini response");
    }

    console.log("Raw Gemini output (first 500 chars):", generatedText.slice(0, 500));

    // ── Parse the JSON response ────────────────────────────────────────

    // Strip markdown code blocks if present
    let jsonString = generatedText.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.slice(7);
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.slice(3);
    }
    if (jsonString.endsWith("```")) {
      jsonString = jsonString.slice(0, -3);
    }
    jsonString = jsonString.trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse JSON. Raw:", jsonString.slice(0, 1000));
      return errorResponse(`Failed to parse product data from AI response: ${parseError.message}`);
    }

    // ── Build the result ───────────────────────────────────────────────

    const result: ExtractedProduct = {
      source_url: url,
    };

    if (parsed.name && typeof parsed.name === "string") {
      result.name = parsed.name.trim();
    }
    if (parsed.brand && typeof parsed.brand === "string") {
      result.brand = parsed.brand.trim();
    }
    if (parsed.size && typeof parsed.size === "string") {
      result.size = parsed.size.trim();
    }
    if (parsed.ingredients && typeof parsed.ingredients === "string") {
      result.ingredients = parsed.ingredients.trim();
    }
    // Fallback: extract ingredients from HTML if Gemini didn't find them
    if (!result.ingredients) {
      const regexIngredients = extractIngredientsFromHtml(html);
      if (regexIngredients) {
        result.ingredients = regexIngredients;
        console.log("Used regex fallback for ingredients");
      }
    }
    if (parsed.category && VALID_CATEGORIES.includes(parsed.category)) {
      result.category = parsed.category;
    }
    if (Array.isArray(parsed.active_ingredients)) {
      // Only keep ingredients that exactly match our known list
      result.active_ingredients = parsed.active_ingredients.filter(
        (ing: string) => typeof ing === "string" && KNOWN_ACTIVE_INGREDIENTS.includes(ing)
      );
    }

    // Use our own image extraction: JSON-LD product image > og:image > twitter:image
    if (productImages.length > 0) {
      result.image_url = productImages[0];
    }

    console.log("Extracted product:", result.name, "by", result.brand);

    return new Response(
      JSON.stringify({ product: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return errorResponse(message);
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function extractMetaSection(html: string): string {
  const metaTags: string[] = [];
  const metaRegex = /<meta\s[^>]*>/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    metaTags.push(match[0]);
  }
  const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  const title = titleMatch ? `<title>${titleMatch[1]}</title>` : "";
  return `${title}\n${metaTags.join("\n")}`;
}

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");

  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");

  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#\d+;/g, "");

  text = text
    .replace(/\t/g, " ")
    .replace(/ +/g, " ")
    .replace(/\n +/g, "\n")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text.slice(0, 10000);
}

function extractProductImages(html: string): string[] {
  const images: string[] = [];
  const seen = new Set<string>();

  const addImage = (url: string | undefined | null) => {
    if (!url || seen.has(url)) return;
    // Filter out tiny/icon images
    if (url.includes("icon") || url.includes("logo") || url.includes("avatar") ||
        url.includes("1x1") || url.includes("tracking") || url.includes("pixel") ||
        url.includes("badge") || url.includes("flag")) return;
    seen.add(url);
    images.push(url);
  };

  // 1. JSON-LD structured data (most reliable for the actual product image)
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      // Handle single object or array
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        // Check for Product type
        if (item["@type"] === "Product" || item["@type"]?.includes?.("Product")) {
          if (typeof item.image === "string") {
            addImage(item.image);
          } else if (Array.isArray(item.image)) {
            // First image in the array is usually the main product photo
            for (const img of item.image) {
              addImage(typeof img === "string" ? img : img?.url);
            }
          } else if (item.image?.url) {
            addImage(item.image.url);
          }
        }
        // Check @graph array (common in Shopify/WooCommerce)
        if (Array.isArray(item["@graph"])) {
          for (const node of item["@graph"]) {
            if (node["@type"] === "Product" || node["@type"]?.includes?.("Product")) {
              if (typeof node.image === "string") {
                addImage(node.image);
              } else if (Array.isArray(node.image)) {
                for (const img of node.image) {
                  addImage(typeof img === "string" ? img : img?.url);
                }
              } else if (node.image?.url) {
                addImage(node.image.url);
              }
            }
          }
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  }

  // 2. og:image as fallback
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  addImage(ogMatch?.[1]);

  // 3. twitter:image
  const twitterMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
  addImage(twitterMatch?.[1]);

  return images;
}

function extractIngredientsFromHtml(html: string): string | undefined {
  // 1. JSON-LD structured data (e.g., schema.org Product)
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        // Direct product
        if (item.ingredients || item.description) {
          if (typeof item.ingredients === "string" && item.ingredients.length > 20) {
            return item.ingredients;
          }
        }
        // @graph array
        if (Array.isArray(item["@graph"])) {
          for (const node of item["@graph"]) {
            if (node.ingredients && typeof node.ingredients === "string" && node.ingredients.length > 20) {
              return node.ingredients;
            }
          }
        }
      }
    } catch {}
  }

  // 2. Common HTML patterns for ingredient lists
  const patterns = [
    // JSON in page (Shopify, etc.)
    /"ingredients"\s*:\s*"([^"]{20,})"/i,
    // "Ingredients:" followed by text
    /(?:full\s+)?ingredients?\s*(?:list)?\s*[:]\s*([A-Za-z][A-Za-z\s,/().%\-·*]{30,})/i,
    // Heading followed by ingredient text
    /(?:ingredients|inci)\s*<\/(?:h[1-6]|strong|b|span|p|div|dt)>\s*(?:<[^>]+>)*\s*([A-Za-z][A-Za-z\s,/().%\-·*]{30,})/i,
    // data attribute or class with ingredients
    /class=["'][^"']*ingredients?[^"']*["'][^>]*>([A-Za-z][A-Za-z\s,/().%\-·*]{30,})/i,
    // Aria label
    /aria-label=["'][^"']*ingredients?[^"']*["'][^>]*>([A-Za-z][A-Za-z\s,/().%\-·*]{30,})/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      let text = match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      // Cut off at common terminators
      const cutoffs = [". ", ".\n", "* ", "May Contain", "May contain", "Please note", "Warning"];
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
