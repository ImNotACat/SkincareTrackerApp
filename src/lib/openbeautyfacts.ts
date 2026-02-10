// ─── Open Beauty Facts API Client ────────────────────────────────────────────
// API Documentation: https://world.openbeautyfacts.org/api

import { ACTIVE_INGREDIENTS } from '../constants/skincare';
import { guessCategory } from './product-import';
import type { StepCategory } from '../types';

// Search uses root path; product-by-code uses /api/v0 (see searchProducts vs getProductByCode).
const API_BASE_URL = 'https://world.openbeautyfacts.org';
const API_V0 = 'https://world.openbeautyfacts.org/api/v0';

export interface OpenBeautyFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  image_url?: string;
  image_small_url?: string;
  ingredients_text?: string;
  ingredients?: Array<{ id: string; text: string }>;
  url?: string;
}

/** Mapped product data ready for the add-product form */
export interface MappedOBFProduct {
  name: string;
  brand?: string;
  size?: string;
  image_url?: string;
  ingredients?: string;
  active_ingredients?: string[];
  step_category?: StepCategory;
  source_url?: string;
}

export interface SearchResponse {
  count: number;
  page: number;
  page_size: number;
  products: OpenBeautyFactsProduct[];
}

/**
 * Search for products by name, brand, or ingredients
 */
export async function searchProducts(query: string, page: number = 1): Promise<SearchResponse> {
  try {
    const encodedQuery = encodeURIComponent(query);
    // Search lives at root, not under /api/v0 (see Open Food/Beauty Facts docs).
    const url = `${API_BASE_URL}/cgi/search.pl?action=process&search_terms=${encodedQuery}&page_size=20&page=${page}&json=true&fields=code,product_name,brands,quantity,image_url,image_small_url,ingredients_text,ingredients,url`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      count: data.count || 0,
      page: data.page || page,
      page_size: data.page_size || 20,
      products: (data.products || []).map((p: any) => ({
        code: p.code,
        product_name: p.product_name || '',
        brands: p.brands || '',
        quantity: p.quantity || '',
        image_url: p.image_url || p.image_small_url || '',
        image_small_url: p.image_small_url || '',
        ingredients_text: p.ingredients_text || '',
        ingredients: p.ingredients || [],
        url: p.url || `https://world.openbeautyfacts.org/product/${p.code}`,
      })),
    };
  } catch (error) {
    console.error('Open Beauty Facts API error:', error);
    throw error;
  }
}

/**
 * Get product details by barcode/code
 */
export async function getProductByCode(code: string): Promise<OpenBeautyFactsProduct | null> {
  try {
    const url = `${API_V0}/product/${code}.json?fields=code,product_name,brands,quantity,image_url,image_small_url,ingredients_text,ingredients,url`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    if (data.status === 0) {
      return null;
    }
    
    const product = data.product;
    return {
      code: product.code,
      product_name: product.product_name || '',
      brands: product.brands || '',
      quantity: product.quantity || '',
      image_url: product.image_url || product.image_small_url || '',
      image_small_url: product.image_small_url || '',
      ingredients_text: product.ingredients_text || '',
      ingredients: product.ingredients || [],
      url: product.url || `https://world.openbeautyfacts.org/product/${product.code}`,
    };
  } catch (error) {
    console.error('Open Beauty Facts API error:', error);
    return null;
  }
}

/**
 * Extract known active ingredients from a raw ingredients text.
 * Matches against the ACTIVE_INGREDIENTS list (case-insensitive).
 */
function extractActiveIngredients(ingredientsText: string): string[] {
  if (!ingredientsText) return [];
  const lower = ingredientsText.toLowerCase();
  return ACTIVE_INGREDIENTS.filter((active) => {
    // Strip parenthetical suffixes for matching, e.g. "Glycolic Acid (AHA)" → also try "Glycolic Acid"
    const baseName = active.replace(/\s*\([^)]*\)\s*$/, '');
    return lower.includes(active.toLowerCase()) || lower.includes(baseName.toLowerCase());
  });
}

/**
 * Map an Open Beauty Facts product to the form fields used by add-product.
 * Extracts known active ingredients and guesses the step category.
 */
export function mapOBFToProductData(product: OpenBeautyFactsProduct): MappedOBFProduct {
  const ingredientsText = product.ingredients_text || '';
  const activeIngredients = extractActiveIngredients(ingredientsText);
  const category = guessCategory(product.product_name, ingredientsText);

  return {
    name: (product.product_name || '').trim(),
    brand: (product.brands || '').trim() || undefined,
    size: (product.quantity || '').trim() || undefined,
    image_url: product.image_url || product.image_small_url || undefined,
    ingredients: ingredientsText || undefined,
    active_ingredients: activeIngredients.length > 0 ? activeIngredients : undefined,
    step_category: category,
    source_url: product.url || `https://world.openbeautyfacts.org/product/${product.code}`,
  };
}
