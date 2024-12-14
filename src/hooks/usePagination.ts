import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PaginationOptions {
  collectionName: string;
  orderByField: string;
  pageSize?: number;
  direction?: 'desc' | 'asc';
  additionalQuery?: QueryConstraint[];
}

export const usePagination = <T extends DocumentData>({
  collectionName,
  orderByField,
  pageSize = 20,
  direction = 'desc',
  additionalQuery = []
}: PaginationOptions) => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const q = query(
        collection(db, collectionName),
        ...constraints
      );

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];

      setItems(docs);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || !lastDoc) return;

    try {
      setLoading(true);
      setError(null);

      const q = query(
        collection(db, collectionName),
        ...constraints
      );

      const snapshot = await getDocs(q);
      const newDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];

      setItems(prev => [...prev, ...newDocs]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      console.error('Error loading more data:', err);
      setError('Ошибка при загрузке дополнительных данных');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    setItems([]);
    setLastDoc(null);
    setHasMore(true);
    loadInitialData();
  };

  useEffect(() => {
    loadInitialData();
  }, [collectionName, orderByField, pageSize, direction]);

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    refresh
  };
};