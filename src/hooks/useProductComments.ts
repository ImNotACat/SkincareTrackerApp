import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProductComment } from '../types';

const STORAGE_KEY = '@glow/product_comments';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useProductComments(productId: string) {
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all comments, then filter for this product
  const loadComments = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const all: ProductComment[] = JSON.parse(json);
        setComments(
          all
            .filter((c) => c.product_id === productId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        );
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const addComment = useCallback(
    async (text: string) => {
      const now = new Date().toISOString();
      const newComment: ProductComment = {
        id: generateId(),
        user_id: 'local',
        product_id: productId,
        text: text.trim(),
        created_at: now,
      };

      // Load all, add new, save
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const all: ProductComment[] = json ? JSON.parse(json) : [];
      all.push(newComment);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));

      setComments((prev) => [newComment, ...prev]);
      return newComment;
    },
    [productId],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const all: ProductComment[] = json ? JSON.parse(json) : [];
      const filtered = all.filter((c) => c.id !== commentId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
    [],
  );

  return {
    comments,
    isLoading,
    addComment,
    deleteComment,
    reload: loadComments,
  };
}
