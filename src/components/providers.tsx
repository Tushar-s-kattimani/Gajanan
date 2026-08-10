'use client';

import { FirebaseProvider } from '@/firebase/provider';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/context/cart-context';
import { VisitorTracker } from '@/components/visitor-tracker';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseProvider>
      <CartProvider>
        <VisitorTracker />
        {children}
        <Toaster />
      </CartProvider>
    </FirebaseProvider>
  );
}
