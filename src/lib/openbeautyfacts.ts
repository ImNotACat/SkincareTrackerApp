// ─── Open Beauty Facts API Client ────────────────────────────────────────────
// API Documentation: https://world.openbeautyfacts.org/api

const API_BASE_URL = 'https://world.openbeautyfacts.org/api/v0';

export interface OpenBeautyFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  image_url?: string;
  image_small_url?: string;
  ingredients_text?: string;
  ingredients?: Array<{ id: string; text: string }>;
  url?: string;
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
    const url = `${API_BASE_URL}/cgi/search.pl?action=process&search_terms=${encodedQuery}&page_size=20&page=${page}&json=true&fields=code,product_name,brands,image_url,image_small_url,ingredients_text,ingredients,url`;
    
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
    const url = `${API_BASE_URL}/product/${code}.json?fields=code,product_name,brands,image_url,image_small_url,ingredients_text,ingredients,url`;
    
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
