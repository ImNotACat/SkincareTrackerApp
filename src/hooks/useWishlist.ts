import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WishlistItem } from '../types';

const STORAGE_KEY = '@glow/wishlist';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useWishlist() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        setWishlist(JSON.parse(json));
      }
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWishlist = useCallback(async (items: WishlistItem[]) => {
    setWishlist(items);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const addToWishlist = useCallback(
    async (item: Omit<WishlistItem, 'id' | 'user_id' | 'created_at'>) => {
      const newItem: WishlistItem = {
        ...item,
        id: generateId(),
        user_id: 'local',
        created_at: new Date().toISOString(),
      };
      await saveWishlist([...wishlist, newItem]);
    },
    [wishlist, saveWishlist],
  );

  const removeFromWishlist = useCallback(
    async (id: string) => {
      await saveWishlist(wishlist.filter((item) => item.id !== id));
    },
    [wishlist, saveWishlist],
  );

  const isInWishlist = useCallback(
    (productId: string) => {
      return wishlist.some((item) => item.product_id === productId);
    },
    [wishlist],
  );

  return {
    wishlist,
    isLoading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    reload: loadWishlist,
  };
}
