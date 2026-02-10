import React, { createContext, useContext, useState, useCallback } from 'react';
import type { UnifiedProduct } from '../hooks/useUnifiedProductSearch';

interface ProductPreviewContextValue {
  previewProduct: UnifiedProduct | null;
  setPreviewProduct: (product: UnifiedProduct | null) => void;
}

const ProductPreviewContext = createContext<ProductPreviewContextValue | null>(null);

export function ProductPreviewProvider({ children }: { children: React.ReactNode }) {
  const [previewProduct, setPreviewProduct] = useState<UnifiedProduct | null>(null);
  return (
    <ProductPreviewContext.Provider value={{ previewProduct, setPreviewProduct }}>
      {children}
    </ProductPreviewContext.Provider>
  );
}

export function useProductPreview() {
  const ctx = useContext(ProductPreviewContext);
  if (!ctx) throw new Error('useProductPreview must be used within ProductPreviewProvider');
  return ctx;
}
