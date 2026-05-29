'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, doc } from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import { firebaseConfig, db, auth } from './config';

export { db, auth, firebaseApp } from './config';

// --- HOOKS ---
export const useCollection = (pathOrQuery: string | any) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const memoizedQuery = useMemo(() => {
        if (!pathOrQuery) return null;
        if (typeof pathOrQuery === 'string') {
            return query(collection(db, pathOrQuery));
        }
        return pathOrQuery;
    }, [pathOrQuery]);


    useEffect(() => {
        if (!memoizedQuery) {
            setData([]);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(memoizedQuery,
            (snapshot: any) => {
                const docs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
                setData(docs);
                setLoading(false);
            },
            (error: any) => {
                console.error(`Error fetching collection:`, error);
                setData([]);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [memoizedQuery]);
    
    return { data, loading };
};

export * from './provider';
export * from './auth/use-user';

    