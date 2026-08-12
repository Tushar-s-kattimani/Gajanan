'use client';

import { ReactNode, useEffect, useState } from 'react';
import { onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './';
import { AuthContext } from './auth/use-user';
import { assignUserRole } from '@/lib/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { toast } from '@/components/ui/use-toast';

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let docUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (docUnsubscribe) {
        docUnsubscribe();
        docUnsubscribe = null;
      }

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
           
           docUnsubscribe = onSnapshot(userDocRef, { includeMetadataChanges: true }, async (docSnapshot) => {
              // Ignore locally cached data to prevent false-positive lockouts
              if (docSnapshot.metadata.fromCache) return;

              if (docSnapshot.exists()) {
                 const data = docSnapshot.data();
                 if (data.status === 'pending') {
                    if (docUnsubscribe) docUnsubscribe();
                    setUser(null);
                    setRole(null);
                    await firebaseSignOut(auth);
                    toast({
                      variant: 'destructive',
                      title: 'Approval Pending',
                      description: 'Your account is pending admin approval. You will be able to log in once an admin approves your request.'
                    });
                 } else if (data.status === 'suspended') {
                    if (docUnsubscribe) docUnsubscribe();
                    setUser(null);
                    setRole(null);
                    await firebaseSignOut(auth);
                    toast({
                      variant: 'destructive',
                      title: 'Account Suspended',
                      description: 'Your account has been suspended by the administrator.'
                    });
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
              }
              setLoading(false);
           });
           
           return; // prevent setLoading(false) from running synchronously
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => {
      if (docUnsubscribe) docUnsubscribe();
      unsubscribe();
    };
  }, []);

  const signUp = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    return userCredential;
  };

  const signIn = async (email: string, pass: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
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
