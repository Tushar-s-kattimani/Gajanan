'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { FirebaseProvider } from '@/firebase/provider';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/context/cart-context';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <FirebaseProvider>
          <CartProvider>
            {children}
            <Toaster />
          </CartProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
