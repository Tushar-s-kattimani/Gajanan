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
        // Automatically sign in admins
        if (assignUserRole(user.email || '') === 'admin') {
          setUser(user);
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setRole(userDoc.data().role || 'admin');
          } else {
            const userData: any = {
              uid: user.uid,
              email: user.email,
              role: 'admin',
              createdAt: serverTimestamp(),
              profileName: user.email?.split('@')[0] || 'Admin',
              upiId: ''
            };
            await setDoc(userDocRef, userData);
            setRole('admin');
          }
        } else {
           // Handle shop users
           const userDocRef = doc(db, 'users', user.uid);
           const userDoc = await getDoc(userDocRef);

           if (userDoc.exists()) {
              const data = userDoc.data();
              if (data.status === 'pending') {
                 setUser(null);
                 setRole(null);
                 await firebaseSignOut(auth);
              } else if (data.status === 'suspended') {
                 setUser(null);
                 setRole(null);
                 await firebaseSignOut(auth);
              } else {
                 setUser(user);
                 setRole(data.role || 'shop');
              }
           } else {
             // New shop user signup
             const newRole = 'shop';
             const userData: any = {
              uid: user.uid,
              email: user.email,
              role: newRole,
              status: 'pending', // IMPORTANT: New shops are pending
              createdAt: serverTimestamp(),
              profileName: '',
              phoneNumber: '',
              shopName: '',
              location: '',
              imageUrl: ''
            };
            await setDoc(userDocRef, userData);
            
            // They are pending, so don't log them in
            setUser(null);
            setRole(null);
            await firebaseSignOut(auth);
           }
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
    return userCredential;
  };

  const signIn = async (email: string, pass: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      if (userCredential.user && assignUserRole(email) === 'shop') {
          // Check if they are pending approval
          const userDocRef = doc(db, 'users', userCredential.user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
              const status = userDoc.data().status;
              if (status === 'pending') {
                  await firebaseSignOut(auth); 
                  const error: any = new Error("Pending admin approval");
                  error.code = 'auth/admin-approval-pending';
                  throw error;
              } else if (status === 'suspended') {
                  await firebaseSignOut(auth); 
                  const error: any = new Error("Account suspended");
                  error.code = 'auth/account-suspended';
                  throw error;
              }
          }
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
