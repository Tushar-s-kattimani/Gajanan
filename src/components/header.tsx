'use client';

import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { ShoppingCart, LogOut, Menu, Loader2, Truck } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import { collection, serverTimestamp, doc, query, where, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useState } from 'react';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, signOut, role } = useUser();
  const { cart, updateQuantity, clearCart } = useCart();
  const { toast } = useToast();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const cartItems = cart;
  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.rate, 0);

  const checkUserProfile = async () => {
    if (!user) return false;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (!userData.profileName || !userData.phoneNumber || !userData.shopName || !userData.location) {
          toast({
            variant: 'destructive',
            title: 'Incomplete Profile',
            description: 'Please complete your profile information in the Profile section before placing an order.',
            duration: 5000,
          });
          return false;
        }
        return true;
      }
      // This will be caught by the catch block below
      throw new Error('User data not found.');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Could not verify user profile: ${error.message}` });
      return false;
    }
  };

  const placeOrder = async () => {
    if (isPlacingOrder) return;
    setIsPlacingOrder(true);

    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to place an order.' });
      setIsPlacingOrder(false);
      return;
    }

    const isProfileComplete = await checkUserProfile();
    if (!isProfileComplete) {
      setIsPlacingOrder(false);
      return;
    }
    
    const newOrderRef = doc(collection(db, 'orders'));
    const orderPayload = {
      shopId: user.uid,
      shopEmail: user.email,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        rate: item.rate,
      })),
      status: 'Pending',
      createdAt: serverTimestamp(),
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'Pending',
    };

    try {
      await runTransaction(db, async (transaction) => {
        // Stock check
        for (const item of cart) {
          const productRef = doc(db, 'products', item.id);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists() || (productSnap.data()?.stock ?? 0) < item.quantity) {
            throw new Error(`Insufficient stock for ${item.name}. Only ${productSnap.data()?.stock ?? 0} left.`);
          }
        }
        
        // Update stock
        for (const item of cart) {
          const productRef = doc(db, 'products', item.id);
          transaction.update(productRef, { stock: item.stock - item.quantity });
        }
  
        // Create order
        transaction.set(newOrderRef, orderPayload);
      });

      toast({ title: 'Success', description: 'Order placed successfully!' });
      clearCart();
      
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Order Failed',
            description: error.message,
            duration: 5000,
        });
        console.error("Transaction failed: ", error);
    } finally {
        setIsPlacingOrder(false);
    }
  };



  return (
    <>
    <header className="flex h-20 shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6 md:px-10 no-print">
      <div className="flex items-center gap-4 overflow-hidden">
        <Button
          variant="outline"
          size="icon"
          className="md:hidden flex-shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
         <div className="overflow-hidden">
             <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700 text-shadow-md leading-tight sm:truncate whitespace-normal">
                {role === 'admin' ? 'Admin Console' : 'Gajanan Enterprise Ghataprabha'}
            </h1>
            <p className="text-sm text-gray-500 mt-1 truncate hidden sm:block">
                Welcome, <span className="font-semibold">{user?.email}</span>
            </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {role === 'shop' && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative flex-shrink-0 h-12 w-12">
                <ShoppingCart className="h-6 w-6" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-md">
                    {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-lg">
              <SheetHeader>
                <SheetTitle className="text-2xl font-bold">Your Cart</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto pr-4">
                {cartItems.length > 0 ? (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div>
                          <p className="font-semibold">{item.name} ({item.size})</p>
                           <p className="text-sm text-gray-500">{item.quantity} units &times; {item.rate.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</Button>
                          <span>{item.quantity}</span>
                          <Button size="icon" variant="ghost" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-8 text-center text-gray-500">Your cart is empty.</p>
                )}
              </div>
              {cartItems.length > 0 && (
                <SheetFooter className="mt-auto border-t pt-4">
                  <div className="w-full space-y-3">
                     <div className="flex justify-between text-xl font-bold mb-2">
                      <span>Total Amount</span>
                      <span>{cartTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                    </div>
                    <div className="space-y-3">
                      <Button className="w-full h-12 text-base" onClick={() => placeOrder()} disabled={isPlacingOrder}>
                          {isPlacingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                          Place Order (Cash on Delivery)
                      </Button>
                      <Button variant="outline" className="w-full" onClick={clearCart}>Clear Cart</Button>
                    </div>
                  </div>
                </SheetFooter>
              )}
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
    </>
  );
}
