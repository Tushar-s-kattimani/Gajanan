'use client';

import { ReactNode, useEffect, useState } from 'react';
import { onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './';
import { AuthContext } from './auth/use-user';
import { assignUserRole } from '@/lib/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        // We only automatically sign in verified users or admins
        if (user.emailVerified || assignUserRole(user.email || '') === 'admin') {
          setUser(user);
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setRole(userDoc.data().role || 'shop');
          } else {
            // New user (likely first-time admin or verified shop)
            const newRole = assignUserRole(user.email || '');
            const userData: any = {
              uid: user.uid,
              email: user.email,
              role: newRole,
              createdAt: serverTimestamp(),
            };
             if (newRole === 'shop') {
              userData.profileName = '';
              userData.phoneNumber = '';
              userData.shopName = '';
              userData.location = '';
              userData.imageUrl = '';
            }
            if (newRole === 'admin') {
              userData.profileName = user.email?.split('@')[0] || 'Admin';
              userData.upiId = '';
            }
            await setDoc(userDocRef, userData);
            setRole(newRole);
          }
        } else {
          // User exists but is not verified, so we don't sign them in.
          // The login page will handle the verification prompt.
          setUser(null);
          setRole(null);
          // We sign them out to prevent access to authenticated routes
          await firebaseSignOut(auth);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential.user && assignUserRole(email) === 'shop') {
      await sendEmailVerification(userCredential.user);
      // Sign out immediately so they must verify first.
      await firebaseSignOut(auth); 
    }
    return userCredential;
  };

  const signIn = async (email: string, pass: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      if (userCredential.user && !userCredential.user.emailVerified && assignUserRole(email) === 'shop') {
          // Don't let the provider auto-sign them in.
          await firebaseSignOut(auth); 
          // Throw a custom error for the login page to catch.
          const error: any = new Error("Email not verified");
          error.code = 'auth/unverified-email';
          error.unverifiedUser = userCredential.user; // Attach the user object
          throw error;
      }
      return userCredential;
    } catch (error: any) {
        // Re-throw the error to be caught by the UI
        throw error;
    }
  };

  const signOut = () => firebaseSignOut(auth);
  const sendPasswordReset = (email: string) => sendPasswordResetEmail(auth, email);
  const sendVerificationEmail = (user: User) => sendEmailVerification(user);


  return (
    <AuthContext.Provider value={{ user, loading, role, signUp, signIn, signOut, sendPasswordReset, sendVerificationEmail }}>
      {children}
      <FirebaseErrorListener />
    </AuthContext.Provider>
  );
}
