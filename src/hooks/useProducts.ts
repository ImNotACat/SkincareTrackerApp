import { useProductsContext } from '../contexts/ProductsContext';
export type { ProductsContextValue } from '../contexts/ProductsContext';

/**
 * Products hook. Product "active on date" is now derived from routine steps
 * (products linked to steps that are active on that date) via getProductsForDate.
 */
export function useProducts() {
  return useProductsContext();
}
