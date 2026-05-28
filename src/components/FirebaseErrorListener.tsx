'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * A client-side component that listens for Firestore permission errors
 * and logs them to the console to trigger the Next.js error overlay.
 * This is for development purposes only.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: Error) => {
      // We use console.error here specifically to trigger the Next.js overlay
      if (error instanceof FirestorePermissionError) {
        console.error('Caught a Firestore permission error:', error.toString());
      } else {
        console.error('Caught a generic error:', error.message);
      }
    };

    errorEmitter.on(handlePermissionError);

    return () => {
      errorEmitter.off(handlePermissionError);
    };
  }, []);

  return null; // This component does not render anything
}
